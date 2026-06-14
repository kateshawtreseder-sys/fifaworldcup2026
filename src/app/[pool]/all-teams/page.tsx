import Link from "next/link";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { maybeAutoSync } from "@/lib/football-data";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function AllTeamsPage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool } = await getPoolContext(slug);
  after(() => maybeAutoSync());
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

  return (
    <main>
      <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href={`/${slug}`} className="text-xl font-extrabold brand-gradient">
          ⚽ {pool.name}
        </Link>
        <Link href={`/${slug}`} className="btn-secondary">
          ← Back
        </Link>
      </header>
      <AutoRefresh seconds={60} />

      <h1 className="mb-4 text-xl font-bold">👥 All teams</h1>

      {!drawn ? (
        <div className="card text-center text-sm text-slate-500">
          Teams haven&apos;t been drawn yet — check back once the draw is done.
        </div>
      ) : (
        <ol className="space-y-3">
          {standings.map((s, i) => (
            <li key={s.participantId} className={`card ${me?.id === s.participantId ? "ring-2 ring-pitch-600" : ""}`}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">
                  <span className="mr-2 text-slate-400">{i + 1}.</span>
                  {s.name}
                  {me?.id === s.participantId && <span className="ml-2 text-xs text-pitch-700">(you)</span>}
                </p>
                <span className="text-sm font-bold text-pitch-800">{s.points} pts</span>
              </div>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {[...s.teams]
                  .sort((a, b) => b.points - a.points)
                  .map((t) => {
                    const team = teamById.get(t.teamId);
                    return (
                      <li key={t.teamId} className={t.eliminated ? "text-slate-400 line-through" : ""}>
                        {team?.flagEmoji} {team?.name}
                        {t.champion && <span className="ml-0.5">🏆</span>}
                      </li>
                    );
                  })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
