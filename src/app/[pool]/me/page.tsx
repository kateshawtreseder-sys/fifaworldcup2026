import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { formatMoney } from "@/lib/format";
import { PoolNav } from "@/components/PoolNav";

export const dynamic = "force-dynamic";

export default async function MePage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  const me = await getCurrentParticipant(slug, pool.id);

  if (!me) {
    return (
      <main>
        <PoolNav slug={slug} name={pool.name} isAdmin={admin} />
        <div className="card text-center">
          <p className="text-sm text-slate-600">
            We don&apos;t recognise you in this sweepstake on this device.
          </p>
          {pool.status === "open" ? (
            <Link href={`/join/${pool.inviteToken}`} className="btn-primary mt-3">
              Join now →
            </Link>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              The draw is done, so joining is closed. Ask the organiser if you should be in.
            </p>
          )}
        </div>
      </main>
    );
  }

  const [assignments, matches, teams, participants] = await Promise.all([
    prisma.assignment.findMany({ where: { poolId: pool.id } }),
    prisma.match.findMany(),
    prisma.team.findMany(),
    prisma.participant.findMany({ where: { poolId: pool.id } }),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const standings = buildLeaderboard({
    participants,
    assignments,
    matches,
    cfg: parseScoring(pool.scoringConfig),
  });
  const myStanding = standings.find((s) => s.participantId === me.id);
  const rank = standings.findIndex((s) => s.participantId === me.id) + 1;

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      <div className="card mb-4">
        <h1 className="text-lg font-semibold">Hi {me.name} 👋</h1>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              me.paid ? "bg-pitch-100 text-pitch-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {me.paid ? "Paid ✓" : "Stake not paid yet"}
          </span>
          {!me.paid && pool.paymentLink && (
            <a href={pool.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Pay {formatMoney(pool.stakeAmount, pool.currency)} →
            </a>
          )}
        </div>
        {!me.paid && !pool.paymentLink && (
          <p className="mt-2 text-xs text-slate-500">
            Pay your {formatMoney(pool.stakeAmount, pool.currency)} stake to the organiser.
          </p>
        )}
      </div>

      {pool.status === "open" ? (
        <div className="card text-center text-sm text-slate-500">
          You&apos;re in! Teams will be drawn once everyone has joined. Check back after the draw.
        </div>
      ) : myStanding ? (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Your teams</h2>
            <span className="text-sm text-slate-500">
              Rank #{rank} · {myStanding.points} pts
            </span>
          </div>
          <ul className="space-y-2">
            {myStanding.teams
              .map((t) => ({ bd: t, team: teamById.get(t.teamId) }))
              .sort((a, b) => b.bd.points - a.bd.points)
              .map(({ bd, team }) => (
                <li key={bd.teamId} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                  <span className="text-sm">
                    {team?.flagEmoji} {team?.name}
                    {bd.champion && <span className="ml-2">🏆</span>}
                  </span>
                  <span className="text-sm font-semibold">{bd.points} pts</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
