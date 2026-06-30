import Link from "next/link";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { formatMoney, externalUrl, furthestStageLabel, matchBreakdown, STAGE_LABELS } from "@/lib/format";
import { buildLeaderboard, parseScoring } from "@/lib/scoring";
import { maybeAutoSync } from "@/lib/football-data";
import { PoolNav } from "@/components/PoolNav";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Announcements } from "@/components/Announcements";
import { BurgerMenu } from "@/components/BurgerMenu";
import { Tabs } from "@/components/Tabs";
import { TeamName } from "@/components/TeamName";
import { LeaderboardView, type PlayerRow } from "@/components/LeaderboardView";
import { claimPaid } from "../actions";

export const dynamic = "force-dynamic";

const resultDateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/London",
});

const kickoffTimeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
  timeZoneName: "short",
});

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

  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const ownerByTeam = new Map<string, string>();
  for (const a of assignments) ownerByTeam.set(a.teamId, nameById.get(a.participantId) ?? "");

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

  // Finished matches, newest first by the day they were PLAYED (kick-off),
  // grouped under a date heading so it's clear when each result happened.
  const finishedSorted = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => +(b.kickoff ?? b.updatedAt) - +(a.kickoff ?? a.updatedAt));
  const resultGroups: { date: string; items: typeof finishedSorted }[] = [];
  for (const mm of finishedSorted) {
    const date = resultDateFmt.format(mm.kickoff ?? mm.updatedAt);
    const g = resultGroups.find((x) => x.date === date);
    if (g) g.items.push(mm);
    else resultGroups.push({ date, items: [mm] });
  }

  // Upcoming (not yet played) matches with a known kick-off, soonest first,
  // grouped by day.
  const upcomingSorted = matches
    .filter((m) => m.status !== "finished" && m.kickoff)
    .sort((a, b) => +a.kickoff! - +b.kickoff!);
  const upcomingGroups: { date: string; items: typeof upcomingSorted }[] = [];
  for (const mm of upcomingSorted) {
    const date = resultDateFmt.format(mm.kickoff!);
    const g = upcomingGroups.find((x) => x.date === date);
    if (g) g.items.push(mm);
    else upcomingGroups.push({ date, items: [mm] });
  }

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

      {/* Results / Upcoming tabs */}
      <section className="mt-6">
        <Tabs
          labels={["Results", "Upcoming"]}
          panels={[
            resultGroups.length > 0 ? (
              <div className="space-y-2">
                {resultGroups.map((group, i) => (
                  <details
                    key={group.date}
                    open={i === 0}
                    className="rounded-lg border border-slate-200 bg-white"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <span className="chevron text-lg font-bold text-pitch-700">▶</span>
                        {group.date}
                      </span>
                      <span className="text-xs font-normal text-slate-400">
                        {group.items.length} game{group.items.length === 1 ? "" : "s"}
                      </span>
                    </summary>
                    <ul className="space-y-1 border-t border-slate-100 px-3 py-2 text-sm">
                      {group.items.map((m) => {
                        const bd = matchBreakdown(m);
                        const isFinal = m.stage === "final";
                        const winnerName = teamById.get(m.winnerTeamId ?? "")?.name;
                        const outName = teamById.get(bd.eliminatedTeamId ?? "")?.name;
                        return (
                          <li key={m.id} className="flex flex-col gap-0.5">
                            <div className="flex justify-between gap-2">
                              <span className="flex flex-wrap items-center gap-x-1">
                                <TeamName
                                  flag={teamById.get(m.homeTeamId ?? "")?.flagEmoji}
                                  name={teamById.get(m.homeTeamId ?? "")?.name}
                                  owner={ownerByTeam.get(m.homeTeamId ?? "")}
                                />
                                <span className="font-medium">
                                  {m.homeScore}–{m.awayScore}
                                  {bd.tag && <span className="ml-1 text-xs font-normal text-slate-400">({bd.tag})</span>}
                                </span>
                                <TeamName
                                  flag={teamById.get(m.awayTeamId ?? "")?.flagEmoji}
                                  name={teamById.get(m.awayTeamId ?? "")?.name}
                                  owner={ownerByTeam.get(m.awayTeamId ?? "")}
                                />
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">
                                {STAGE_LABELS[m.stage] ?? m.stage}
                              </span>
                            </div>
                            {(bd.ninety || bd.pens || bd.eliminatedTeamId) && (
                              <p className="text-xs text-slate-400">
                                {bd.ninety && <span>90&apos; {bd.ninety.home}–{bd.ninety.away}</span>}
                                {bd.pens && <span>{bd.ninety ? " · " : ""}pens {bd.pens.home}–{bd.pens.away}</span>}
                                {isFinal && winnerName ? (
                                  <span className="ml-1 font-medium text-pitch-700">· 🏆 {winnerName} champions</span>
                                ) : outName ? (
                                  <span className="ml-1 font-medium text-slate-500">· {outName} knocked out</span>
                                ) : null}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ))}
              </div>
            ) : (
              <p className="card text-center text-sm text-slate-500">No results yet.</p>
            ),
            upcomingGroups.length > 0 ? (
              <div className="space-y-4">
                {upcomingGroups.map((group) => (
                  <div key={group.date}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-600">{group.date}</h3>
                    <ul className="space-y-1 text-sm">
                      {group.items.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 rounded bg-white px-3 py-2 shadow-sm"
                        >
                          <span className="flex flex-wrap items-center gap-x-1">
                            <TeamName
                              flag={teamById.get(m.homeTeamId ?? "")?.flagEmoji}
                              name={teamById.get(m.homeTeamId ?? "")?.name}
                              owner={ownerByTeam.get(m.homeTeamId ?? "")}
                            />
                            <span>v</span>
                            <TeamName
                              flag={teamById.get(m.awayTeamId ?? "")?.flagEmoji}
                              name={teamById.get(m.awayTeamId ?? "")?.name}
                              owner={ownerByTeam.get(m.awayTeamId ?? "")}
                            />
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {kickoffTimeFmt.format(m.kickoff!)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="card text-center text-sm text-slate-500">
                No upcoming games scheduled yet.
              </p>
            ),
          ]}
        />
      </section>

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
