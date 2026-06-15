import Link from "next/link";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { buildLeaderboard, parseScoring, pointsForTeamInMatch } from "@/lib/scoring";
import { formatMoney, externalUrl, STAGE_LABELS } from "@/lib/format";
import { maybeAutoSync } from "@/lib/football-data";
import { Announcements } from "@/components/Announcements";
import { AutoRefresh } from "@/components/AutoRefresh";
import { claimPaid, participantLogout } from "../../actions";

export const dynamic = "force-dynamic";

const STAGE_ORDER: Record<string, number> = { group: 0, R32: 1, R16: 2, QF: 3, SF: 4, final: 5 };

const kickoffFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
  timeZoneName: "short", // appends "BST" (or "GMT")
});

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
            <button className="text-xs text-slate-400 underline">Log out</button>
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
              <p className="mt-2 text-xs text-slate-500">
                Tap “Pay now” to open the payment link, then tap “I&apos;ve paid” so the organiser
                can confirm you.
              </p>
            )}
          </div>
        )}
      </div>

      {pool.status === "open" ? (
        <div className="card text-center text-sm text-slate-500">
          You&apos;re in! Teams will be drawn once everyone has joined. Check back after the draw.
        </div>
      ) : myStanding ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Your teams</h2>
            <span className="text-sm text-slate-500">
              Rank #{rank} · {myStanding.points} pts
            </span>
          </div>
          <div className="space-y-4">
            {[...myStanding.teams]
              .sort((a, b) => b.points - a.points)
              .map((bd) => {
                const team = teamById.get(bd.teamId);
                const fixtures = matches
                  .filter((m) => m.homeTeamId === bd.teamId || m.awayTeamId === bd.teamId)
                  .sort(
                    (a, b) =>
                      (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9) ||
                      (a.kickoff ? +a.kickoff : Infinity) - (b.kickoff ? +b.kickoff : Infinity)
                  );
                return (
                  <div key={bd.teamId} className={`card ${bd.eliminated ? "opacity-70" : ""}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">
                        {team?.flagEmoji} {team?.name}
                        {bd.champion && <span className="ml-1">🏆</span>}
                        {bd.eliminated && <span className="ml-2 text-xs font-normal text-slate-400">out</span>}
                      </p>
                      <span className="text-sm font-bold text-pitch-800">{bd.points} pts</span>
                    </div>

                    {fixtures.length === 0 ? (
                      <p className="text-xs text-slate-400">Fixtures to be confirmed.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {fixtures.map((m) => {
                          const isHome = m.homeTeamId === bd.teamId;
                          const opp = teamById.get((isHome ? m.awayTeamId : m.homeTeamId) ?? "");
                          const finished = m.status === "finished";
                          const live = m.status === "live";
                          const scored = isHome ? m.homeScore : m.awayScore;
                          const conceded = isHome ? m.awayScore : m.homeScore;
                          const mpts = pointsForTeamInMatch(bd.teamId, m, cfg);
                          return (
                            <li
                              key={m.id}
                              className="flex items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate">
                                  <span className="text-xs text-slate-400">
                                    {STAGE_LABELS[m.stage] ?? m.stage} ·{" "}
                                  </span>
                                  vs {opp?.flagEmoji} {opp?.name ?? "TBC"}
                                </p>
                                {!finished && !live && (
                                  <p className="text-xs text-slate-500">
                                    {m.kickoff ? kickoffFmt.format(m.kickoff) : "Date to be confirmed"}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                {finished || live ? (
                                  <p className="font-semibold">
                                    {scored}–{conceded}
                                    {live && <span className="ml-1 text-xs text-red-600">LIVE</span>}
                                  </p>
                                ) : null}
                                {mpts > 0 && (
                                  <p className="text-xs font-medium text-pitch-700">+{mpts} pts</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      ) : null}
    </main>
  );
}
