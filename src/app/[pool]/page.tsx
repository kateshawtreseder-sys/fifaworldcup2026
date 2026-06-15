import Link from "next/link";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { formatMoney, externalUrl, furthestStageLabel, STAGE_LABELS } from "@/lib/format";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { maybeAutoSync } from "@/lib/football-data";
import { PoolNav } from "@/components/PoolNav";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Announcements } from "@/components/Announcements";
import { BurgerMenu } from "@/components/BurgerMenu";
import { LeaderboardView, type PlayerRow } from "@/components/LeaderboardView";
import { adminLogin, claimPaid, participantLogout } from "../actions";

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

  // Keep scores fresh while anyone's watching.
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
        reached: furthestStageLabel(t.reachedStages),
      };
    }),
  }));

  const drawn = pool.status !== "open";
  const stake = formatMoney(pool.stakeAmount, pool.currency);

  // Most-recently-updated finished matches, shown under the leaderboard.
  const recent = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => +b.updatedAt - +a.updatedAt)
    .slice(0, 8);

  return (
    <main>
      {/* Header: organiser keeps the nav buttons; players get the burger menu */}
      {admin ? (
        <PoolNav slug={slug} name={pool.name} isAdmin />
      ) : (
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href={`/${slug}`} className="text-xl font-extrabold brand-gradient">
            ⚽ {pool.name}
          </Link>
          <BurgerMenu>
            <Link href={`/${slug}/me`} className="block px-4 py-3 text-sm hover:bg-slate-50">
              👤 My teams
            </Link>
            <Link href={`/${slug}/all-teams`} className="block border-t border-slate-100 px-4 py-3 text-sm hover:bg-slate-50">
              👥 All teams
            </Link>
            {me && (
              <form action={participantLogout.bind(null, slug)} className="border-t border-slate-100">
                <button className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50">
                  🚪 Log out
                </button>
              </form>
            )}
          </BurgerMenu>
        </header>
      )}

      <AutoRefresh seconds={60} />
      <Announcements items={announcements} />

      {/* Not-logged-in prompt (players only) */}
      {!admin && !me && (
        <div className="card mb-4 text-center">
          <p className="text-sm text-slate-600">Log in to see your teams and pay your stake.</p>
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
      )}

      {/* Slim pay reminder for a logged-in, unpaid player */}
      {me && !me.paid && (
        <div className="card mb-4 border-amber-200 bg-amber-50">
          {me.paidClaimed ? (
            <p className="text-sm text-blue-800">
              ✋ You&apos;ve marked your {stake} stake as paid — waiting for the organiser to confirm.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 text-sm font-medium text-amber-900">
                Your {stake} stake isn&apos;t paid yet.
              </p>
              {pool.paymentLink && (
                <a href={externalUrl(pool.paymentLink)} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  💳 Pay {stake}
                </a>
              )}
              <form action={claimPaid.bind(null, slug)}>
                <button className="btn-secondary">I&apos;ve paid ✓</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <h1 className="mb-1 text-xl font-bold">🏆 Leaderboard</h1>
      <p className="mb-4 text-xs text-slate-500">See everyone&apos;s teams on the All teams page.</p>
      {drawn ? (
        <LeaderboardView rows={rows} compact />
      ) : (
        <div className="card text-center text-sm text-slate-500">
          The teams haven&apos;t been drawn yet. Scores appear here once the organiser runs the draw.
        </div>
      )}

      {/* Latest results — so it's clear why the leaderboard moved */}
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

      {/* Organiser sign in (only when not already signed in) */}
      {!admin && (
        <footer className="mt-8 border-t border-slate-200 pt-4">
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
      )}
    </main>
  );
}
