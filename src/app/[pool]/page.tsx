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
import { claimPaid, participantLogout } from "../actions";

export const dynamic = "force-dynamic";

export default async function PoolHome({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
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
  const cfg = parseScoring(pool.scoringConfig);

  const standings = buildLeaderboard({ participants, assignments, matches, cfg });
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
        <header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <Link href={`/${slug}`} className="min-w-0 truncate text-base font-extrabold brand-gradient">
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
            <Link href={`/${slug}/organiser`} className="block border-t border-slate-100 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50">
              🛠️ Organiser sign in
            </Link>
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
      <p className="mb-3 text-xs text-slate-500">See everyone&apos;s teams on the All teams page.</p>
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

      {/* How scoring works */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">ℹ️ How scoring works</h2>
        <div className="card text-sm text-slate-700">
          <p className="mb-2 text-slate-500">
            You earn points as your teams play. Your score is all your teams&apos; points added
            together.
          </p>
          <ul className="space-y-1">
            <li className="flex justify-between"><span>Win a group game</span><span className="font-semibold">+{cfg.groupWin}</span></li>
            <li className="flex justify-between"><span>Draw a group game</span><span className="font-semibold">+{cfg.groupDraw}</span></li>
            <li className="flex justify-between"><span>Each goal your team scores</span><span className="font-semibold">+{cfg.perGoal}</span></li>
            <li className="flex justify-between"><span>Reach the Round of 32</span><span className="font-semibold">+{cfg.reachR32}</span></li>
            <li className="flex justify-between"><span>Reach the Round of 16</span><span className="font-semibold">+{cfg.reachR16}</span></li>
            <li className="flex justify-between"><span>Reach the Quarter-final</span><span className="font-semibold">+{cfg.reachQF}</span></li>
            <li className="flex justify-between"><span>Reach the Semi-final</span><span className="font-semibold">+{cfg.reachSF}</span></li>
            <li className="flex justify-between"><span>Reach the Final</span><span className="font-semibold">+{cfg.reachFinal}</span></li>
            <li className="flex justify-between border-t border-slate-100 pt-1"><span>Win the tournament 🏆</span><span className="font-semibold">+{cfg.champion}</span></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
