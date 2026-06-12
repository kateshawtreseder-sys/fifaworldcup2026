import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { formatMoney, externalUrl, furthestStageLabel } from "@/lib/format";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { inviteUrl } from "@/lib/share";
import { PoolNav } from "@/components/PoolNav";
import { CopyButton } from "@/components/CopyButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Announcements } from "@/components/Announcements";
import { LeaderboardView, type PlayerRow } from "@/components/LeaderboardView";
import {
  adminLogin,
  adminLogout,
  updatePoolSettings,
  claimPaid,
  participantLogout,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function PoolHome({
  params,
  searchParams,
}: {
  params: Promise<{ pool: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pool: slug } = await params;
  const { error } = await searchParams;
  const { pool, admin } = await getPoolContext(slug);

  // ---------- Organiser dashboard ----------
  if (admin) {
    const [playerCount, paidCount] = await Promise.all([
      prisma.participant.count({ where: { poolId: pool.id } }),
      prisma.participant.count({ where: { poolId: pool.id, paid: true } }),
    ]);
    const pot = paidCount * pool.stakeAmount;
    const statusLabel: Record<string, string> = {
      open: "Open — people can still join",
      drawn: "Teams drawn",
      active: "Teams drawn — tournament under way",
      finished: "Finished",
    };

    return (
      <main>
        <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Stake</p>
              <p className="text-xl font-bold">{formatMoney(pool.stakeAmount, pool.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Status</p>
              <p className="font-semibold text-pitch-800">{statusLabel[pool.status]}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Players" value={String(playerCount)} />
            <Stat label="Paid" value={`${paidCount}/${playerCount}`} />
            <Stat label="Pot" value={formatMoney(pot, pool.currency)} />
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="mb-3 font-semibold">Share your invite</h2>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded bg-slate-100 px-3 py-2 text-xs">
              {inviteUrl(pool.inviteToken)}
            </code>
            <CopyButton value={inviteUrl(pool.inviteToken)} label="Copy link" />
            <Link href={`/${slug}/invite`} className="btn-primary">
              Share options →
            </Link>
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="mb-3 font-semibold">Settings</h2>
          <form action={updatePoolSettings.bind(null, slug)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Stake per person (£)</label>
                <input
                  name="stake"
                  type="number"
                  min="1"
                  step="0.5"
                  defaultValue={(pool.stakeAmount / 100).toString()}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Payment link</label>
                <input
                  name="paymentLink"
                  defaultValue={pool.paymentLink ?? ""}
                  placeholder="https://monzo.me/yourname"
                  className="input"
                />
              </div>
            </div>
            <button className="btn-primary">Save settings</button>
          </form>
        </div>

        <form action={adminLogout.bind(null, slug)}>
          <button className="text-sm text-slate-500 underline">Log out of organiser mode</button>
        </form>
      </main>
    );
  }

  // ---------- Player view: leaderboard → your teams → log out / organiser ----------
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
        reached: furthestStageLabel(t.reachedStages),
      };
    }),
  }));

  const drawn = pool.status !== "open";
  const myStanding = me ? standings.find((s) => s.participantId === me.id) : null;
  const rank = me ? standings.findIndex((s) => s.participantId === me.id) + 1 : 0;
  const stake = formatMoney(pool.stakeAmount, pool.currency);

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={false} />
      <AutoRefresh seconds={60} />
      <Announcements items={announcements} />

      {/* Leaderboard first */}
      <h1 className="mb-1 text-xl font-bold">🏆 Leaderboard</h1>
      <p className="mb-4 text-xs text-slate-500">Tap a player to see how their teams are doing.</p>
      {drawn ? (
        <LeaderboardView rows={rows} />
      ) : (
        <div className="card text-center text-sm text-slate-500">
          The teams haven&apos;t been drawn yet. Scores appear here once the organiser runs the draw.
        </div>
      )}

      {/* Your teams */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">👤 Your teams</h2>
        {!me ? (
          <div className="card text-center">
            <p className="text-sm text-slate-600">Log in to see your teams.</p>
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
        ) : (
          <div className="card">
            <p className="font-semibold">Hi {me.name} 👋</p>

            {me.paid ? (
              <p className="mt-2">
                <span className="rounded-full bg-pitch-100 px-3 py-1 text-sm font-semibold text-pitch-800">
                  Stake paid ✓
                </span>
              </p>
            ) : me.paidClaimed ? (
              <p className="mt-2 text-sm text-blue-800">
                ✋ You&apos;ve marked your {stake} stake as paid — waiting for the organiser to confirm.
              </p>
            ) : (
              <div className="mt-2 rounded-lg bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">Your {stake} stake isn&apos;t paid yet.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pool.paymentLink && (
                    <a href={externalUrl(pool.paymentLink)} target="_blank" rel="noopener noreferrer" className="btn-primary">
                      💳 Pay {stake} now
                    </a>
                  )}
                  <form action={claimPaid.bind(null, slug)}>
                    <button className="btn-secondary">I&apos;ve paid ✓</button>
                  </form>
                </div>
              </div>
            )}

            {drawn && myStanding ? (
              <>
                <p className="mt-4 text-sm text-slate-500">
                  Rank #{rank} · {myStanding.points} pts
                </p>
                <ul className="mt-2 space-y-2">
                  {[...myStanding.teams]
                    .sort((a, b) => b.points - a.points)
                    .map((t) => {
                      const team = teamById.get(t.teamId);
                      return (
                        <li
                          key={t.teamId}
                          className={`flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm ${
                            t.eliminated ? "text-slate-400 line-through" : ""
                          }`}
                        >
                          <span>
                            {team?.flagEmoji} {team?.name}
                            {t.champion && <span className="ml-1">🏆</span>}
                          </span>
                          <span className="font-semibold">{t.points} pts</span>
                        </li>
                      );
                    })}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                You&apos;re in! Your teams will appear here once the draw is done.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Log out / organiser sign in */}
      <footer className="mt-8 border-t border-slate-200 pt-4">
        {me && (
          <form action={participantLogout.bind(null, slug)} className="mb-3">
            <button className="btn-secondary">Log out</button>
          </form>
        )}
        <details className="text-sm" open={error === "badpass"}>
          <summary className="cursor-pointer text-slate-500">Organiser sign in</summary>
          <div className="mt-3 card">
            {error === "badpass" && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                Email or password not recognised — try again.
              </p>
            )}
            <form action={adminLogin.bind(null, slug)} className="space-y-2">
              <input name="email" type="email" className="input" placeholder="Organiser email" required />
              <input name="password" type="password" className="input" placeholder="Organiser password" required />
              <button className="btn-primary w-full">Sign in</button>
            </form>
          </div>
        </details>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
