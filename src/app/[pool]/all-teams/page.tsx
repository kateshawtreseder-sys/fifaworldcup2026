import Link from "next/link";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { maybeAutoSync } from "@/lib/football-data";
import { AutoRefresh } from "@/components/AutoRefresh";
import { TeamFixtures } from "@/components/TeamFixtures";

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
  const cfg = parseScoring(pool.scoringConfig);

  const standings = buildLeaderboard({ participants, assignments, matches, cfg });

  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const ownerByTeam = new Map<string, string>();
  for (const a of assignments) ownerByTeam.set(a.teamId, nameById.get(a.participantId) ?? "");

  const drawn = pool.status !== "open";

  return (
    <main>
      <header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <Link href={`/${slug}`} className="min-w-0 truncate text-base font-extrabold brand-gradient">
          ⚽ {pool.name}
        </Link>
        <Link href={`/${slug}`} className="btn-secondary shrink-0">
          ← Back
        </Link>
      </header>
      <AutoRefresh seconds={60} />

      <h1 className="mb-1 text-xl font-bold">👥 All teams</h1>
      <p className="mb-4 text-xs text-slate-500">Tap a player to see their teams, fixtures and points.</p>

      {!drawn ? (
        <div className="card text-center text-sm text-slate-500">
          Teams haven&apos;t been drawn yet — check back once the draw is done.
        </div>
      ) : (
        <ol className="space-y-2">
          {standings.map((s, i) => (
            <li key={s.participantId}>
              <details
                className={`rounded-xl border bg-white shadow-sm ${
                  me?.id === s.participantId ? "border-pitch-600 ring-1 ring-pitch-600" : "border-slate-200"
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="chevron text-base font-bold text-pitch-700">▶</span>
                    <span className="font-semibold">
                      <span className="mr-1 text-slate-400">{i + 1}.</span>
                      {s.name}
                      {me?.id === s.participantId && <span className="ml-2 text-xs text-pitch-700">(you)</span>}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-pitch-800">{s.points} pts</span>
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                  <TeamFixtures teams={s.teams} matches={matches} teamById={teamById} cfg={cfg} ownerByTeam={ownerByTeam} />
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
