// Seeds the 48 teams and generates the 72 group-stage fixtures (round-robin
// within each group of 4). Knockout matches are created later via the API sync
// or by the organiser on the admin results page, since they depend on results.

import { PrismaClient } from "@prisma/client";
import { SEED_TEAMS } from "./data/teams";

const prisma = new PrismaClient();

// Round-robin pairings for a group of 4 (indices 0..3): 6 matches.
const GROUP_PAIRINGS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

async function main() {
  console.log("Seeding teams…");
  for (const t of SEED_TEAMS) {
    await prisma.team.upsert({
      where: { fifaCode: t.fifaCode },
      update: { name: t.name, groupName: t.groupName, flagEmoji: t.flagEmoji },
      create: t,
    });
  }

  const teams = await prisma.team.findMany();
  const byGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    const list = byGroup.get(t.groupName) ?? [];
    list.push(t);
    byGroup.set(t.groupName, list);
  }

  console.log("Generating group-stage fixtures…");
  let created = 0;
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
        },
      });
      created++;
    }
  }

  console.log(`Done. Teams: ${teams.length}, group fixtures: ${created}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
