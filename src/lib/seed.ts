// Shared seeding logic: 48 teams + the 72 group-stage fixtures (round-robin
// within each group of 4). Idempotent (upserts), so it's safe to run repeatedly
// — used by both `npm run seed` and the protected /api/setup route.

import { PrismaClient } from "@prisma/client";
import { SEED_TEAMS } from "../../prisma/data/teams";
import { GROUP_FIXTURES } from "../../prisma/data/fixtures";

// Round-robin pairings for a group of 4 (indices 0..3): 6 matches.
const GROUP_PAIRINGS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

export async function seedTeamsAndFixtures(prisma: PrismaClient) {
  // Clean reset so this can also be used to *replace* the team line-up (e.g.
  // swapping placeholders for the official draw) without leaving stale teams or
  // fixtures behind. This clears any existing draw (assignments) and results,
  // but leaves participants, payments and announcements untouched.
  await prisma.match.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.team.deleteMany({});

  await prisma.team.createMany({ data: SEED_TEAMS });

  const teams = await prisma.team.findMany();
  const byGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    const list = byGroup.get(t.groupName) ?? [];
    list.push(t);
    byGroup.set(t.groupName, list);
  }

  let fixtures = 0;
  for (const [group, list] of byGroup) {
    if (list.length < 4) continue;
    list.sort((a, b) => a.fifaCode.localeCompare(b.fifaCode));
    for (const [i, j] of GROUP_PAIRINGS) {
      const externalId = `group-${group}-${list[i].fifaCode}-${list[j].fifaCode}`;
      await prisma.match.upsert({
        where: { externalId },
        update: {},
        create: {
          externalId,
          stage: "group",
          groupName: group,
          homeTeamId: list[i].id,
          awayTeamId: list[j].id,
          status: "scheduled",
          kickoff: KICKOFF_BY_PAIR.get([list[i].fifaCode, list[j].fifaCode].sort().join("-")) ?? null,
        },
      });
      fixtures++;
    }
  }

  return { teams: teams.length, fixtures };
}

// Pair (sorted fifaCodes) → kick-off, from the official group-stage schedule.
const KICKOFF_BY_PAIR = new Map<string, Date>(
  GROUP_FIXTURES.map((f) => [[f.home, f.away].sort().join("-"), new Date(f.kickoff)])
);

// Non-destructive: set kick-off times on existing group fixtures from the
// official schedule. Does NOT touch teams, the draw, scores or assignments —
// safe to run mid-tournament.
export async function importFixtureDates(prisma: PrismaClient) {
  const teams = await prisma.team.findMany();
  const idByCode = new Map(teams.map((t) => [t.fifaCode, t.id]));
  let updated = 0;
  for (const f of GROUP_FIXTURES) {
    const home = idByCode.get(f.home);
    const away = idByCode.get(f.away);
    if (!home || !away) continue;
    const res = await prisma.match.updateMany({
      where: {
        stage: "group",
        OR: [
          { homeTeamId: home, awayTeamId: away },
          { homeTeamId: away, awayTeamId: home },
        ],
      },
      data: { kickoff: new Date(f.kickoff), groupName: f.group },
    });
    updated += res.count;
  }
  return { updated };
}
