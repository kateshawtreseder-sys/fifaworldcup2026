import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/format";
import { maybeAutoSync } from "@/lib/football-data";
import { PoolNav } from "@/components/PoolNav";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Announcements } from "@/components/Announcements";
import { LeaderboardView, type PlayerRow } from "@/components/LeaderboardView";

export const dynamic = "force-dynamic";

// Furthest knockout round a team reached, as a friendly label.
const STAGE_RANK = ["R32", "R16", "QF", "SF", "final"];
function furthestStage(stages: string[]): string {
  let best = "";
  let bestIdx = -1;
  for (const s of stages) {
    const idx = STAGE_RANK.indexOf(s);
    if (idx > bestIdx) {
      bestIdx = idx;
      best = s;
    }
  }
  return best ? STAGE_LABELS[best] ?? best : "";
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  // Players get the single-scroll hub (leaderboard + teams) on the main page.
  if (!admin) redirect(`/${slug}`);
  after(() => maybeAutoSync());
  const me = await getCurrentParticipant(slug, pool.id);

  const [participants, assignments, matches, teams, announcements] = await Promise.all([
    prisma.participant.findMany({ where: { poolId: pool.id } }),
    prisma.assignment.findMany({ where: { poolId: pool.id } }),
    prisma.match.findMany(),
    prisma.team.findMany(),
    prisma.announcement.findMany({ where: { poolId: pool.id }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const standings = buildLeaderboard({
    participants,
    assignments,
    matches,
    cfg: parseScoring(pool.scoringConfig),
  });

  const rows: PlayerRow[] = standings.map((s) => ({
    participantId: s.participantId,
    name: s.name,
    points: s.points,
    isMe: me?.id === s.participantId,
    teams: s.teams.map((t) => {
      const team = teamById.get(t.teamId);
      return {
        name: team?.name ?? "?",
        flag: team?.flagEmoji ?? "",
        points: t.points,
        champion: t.champion,
        eliminated: t.eliminated,
        reached: furthestStage(t.reachedStages),
      };
    }),
  }));

  const drawn = pool.status !== "open";

  const recent = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => +b.updatedAt - +a.updatedAt)
    .slice(0, 8);

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />
      <AutoRefresh seconds={60} />
      <Announcements items={announcements} />

      <h1 className="mb-1 text-xl font-bold">🏆 Leaderboard</h1>
      <p className="mb-4 text-xs text-slate-600">Tap a player to see how their teams are doing.</p>

      {!drawn ? (
        <div className="card text-center text-sm text-slate-600">
          The teams haven&apos;t been drawn yet. Once the organiser runs the draw, scores will
          appear here and update as matches are played.
        </div>
      ) : (
        <LeaderboardView rows={rows} />
      )}

      {recent.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Latest results</h2>
          <ul className="space-y-1 text-sm">
            {recent.map((m) => (
              <li key={m.id} className="flex justify-between rounded bg-white px-3 py-2 shadow-sm">
                <span>
                  {teamById.get(m.homeTeamId ?? "")?.flagEmoji}{" "}
                  {teamById.get(m.homeTeamId ?? "")?.name} {m.homeScore}–{m.awayScore}{" "}
                  {teamById.get(m.awayTeamId ?? "")?.name}{" "}
                  {teamById.get(m.awayTeamId ?? "")?.flagEmoji}
                </span>
                <span className="text-xs text-slate-600">{STAGE_LABELS[m.stage] ?? m.stage}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
