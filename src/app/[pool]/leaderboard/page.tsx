import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/format";
import { PoolNav } from "@/components/PoolNav";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  const me = await getCurrentParticipant(slug, pool.id);

  const [participants, assignments, matches, teams] = await Promise.all([
    prisma.participant.findMany({ where: { poolId: pool.id } }),
    prisma.assignment.findMany({ where: { poolId: pool.id } }),
    prisma.match.findMany(),
    prisma.team.findMany(),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const standings = buildLeaderboard({
    participants,
    assignments,
    matches,
    cfg: parseScoring(pool.scoringConfig),
  });

  const drawn = pool.status !== "open";
  const medals = ["🥇", "🥈", "🥉"];

  // Recent finished results for context.
  const recent = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => +b.updatedAt - +a.updatedAt)
    .slice(0, 8);

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />
      <AutoRefresh seconds={60} />

      <h1 className="mb-4 text-xl font-bold">🏆 Leaderboard</h1>

      {!drawn ? (
        <div className="card text-center text-sm text-slate-500">
          The teams haven&apos;t been drawn yet. Once the organiser runs the draw, scores will
          appear here and update as matches are played.
        </div>
      ) : (
        <ol className="space-y-2">
          {standings.map((s, i) => {
            const isMe = me?.id === s.participantId;
            return (
              <li
                key={s.participantId}
                className={`card ${isMe ? "ring-2 ring-pitch-600" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-lg font-bold text-slate-500">
                      {medals[i] ?? i + 1}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {s.name}
                        {isMe && <span className="ml-2 text-xs text-pitch-700">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.teams
                          .map((t) => teamById.get(t.teamId)?.flagEmoji)
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-pitch-800">{s.points}</span>
                </div>
              </li>
            );
          })}
        </ol>
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
                <span className="text-xs text-slate-400">{STAGE_LABELS[m.stage] ?? m.stage}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
