import Link from "next/link";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { formatMoney, externalUrl } from "@/lib/format";
import { maybeAutoSync } from "@/lib/football-data";
import { Announcements } from "@/components/Announcements";
import { AutoRefresh } from "@/components/AutoRefresh";
import { TeamFixtures } from "@/components/TeamFixtures";
import { claimPaid, participantLogout } from "../../actions";

export const dynamic = "force-dynamic";

export default async function MePage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool } = await getPoolContext(slug);
  after(() => maybeAutoSync());
  const me = await getCurrentParticipant(slug, pool.id);

  if (!me) {
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
        <div className="card text-center">
          <p className="text-sm text-slate-600">
            You&apos;re not logged in on this device.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href={`/${slug}/login`} className="btn-primary">
              Log in →
            </Link>
            {pool.status === "open" && (
              <Link href={`/join/${pool.inviteToken}`} className="btn-secondary">
                Create an account
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const [assignments, matches, teams, participants, announcements] = await Promise.all([
    prisma.assignment.findMany({ where: { poolId: pool.id } }),
    prisma.match.findMany(),
    prisma.team.findMany(),
    prisma.participant.findMany({ where: { poolId: pool.id } }),
    prisma.announcement.findMany({ where: { poolId: pool.id }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const cfg = parseScoring(pool.scoringConfig);
  const standings = buildLeaderboard({ participants, assignments, matches, cfg });
  const myStanding = standings.find((s) => s.participantId === me.id);

  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const ownerByTeam = new Map<string, string>();
  for (const a of assignments) ownerByTeam.set(a.teamId, nameById.get(a.participantId) ?? "");
  const rank = standings.findIndex((s) => s.participantId === me.id) + 1;

  const stake = formatMoney(pool.stakeAmount, pool.currency);

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
      <Announcements items={announcements} />

      <div className="card mb-4">
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-semibold">Hi {me.name} 👋</h1>
          <form action={participantLogout.bind(null, slug)}>
            <button className="text-xs text-slate-600 underline">Log out</button>
          </form>
        </div>

        {me.paid ? (
          <p className="mt-2">
            <span className="rounded-full bg-pitch-100 px-3 py-1 text-sm font-semibold text-pitch-800">
              Stake paid ✓
            </span>
          </p>
        ) : me.paidClaimed ? (
          <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            ✋ Thanks — you&apos;ve marked your {stake} stake as paid. Waiting for the organiser to
            confirm it. {pool.paymentLink && "If you haven't actually sent it yet, tap below."}
            {pool.paymentLink && (
              <div className="mt-2">
                <a href={externalUrl(pool.paymentLink)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Open payment link ↗
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 rounded-lg bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              Your {stake} stake isn&apos;t paid yet.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pool.paymentLink ? (
                <a href={externalUrl(pool.paymentLink)} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  💳 Pay {stake} now
                </a>
              ) : (
                <span className="text-xs text-slate-600">
                  Pay your {stake} to the organiser, then tap “I&apos;ve paid”.
                </span>
              )}
              <form action={claimPaid.bind(null, slug)}>
                <button className="btn-secondary">I&apos;ve paid ✓</button>
              </form>
            </div>
            {pool.paymentLink && (
              <p className="mt-2 text-xs text-slate-600">
                Tap “Pay now” to open the payment link, then tap “I&apos;ve paid” so the organiser
                can confirm you.
              </p>
            )}
          </div>
        )}
      </div>

      {pool.status === "open" ? (
        <div className="card text-center text-sm text-slate-600">
          You&apos;re in! Teams will be drawn once everyone has joined. Check back after the draw.
        </div>
      ) : myStanding ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Your teams</h2>
            <span className="text-sm text-slate-600">
              Rank #{rank} · {myStanding.points} pts
            </span>
          </div>
          <TeamFixtures teams={myStanding.teams} matches={matches} teamById={teamById} cfg={cfg} ownerByTeam={ownerByTeam} />
        </>
      ) : null}
    </main>
  );
}
