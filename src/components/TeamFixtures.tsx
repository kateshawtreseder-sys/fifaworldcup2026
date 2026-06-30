import { STAGE_LABELS, matchBreakdown } from "@/lib/format";
import { pointsForTeamInMatch, type TeamBreakdown, type ScoringConfig } from "@/lib/scoring";
import { TeamName } from "@/components/TeamName";

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

type MatchLite = {
  id: string;
  stage: string;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  duration: string | null;
  homeScore90: number | null;
  awayScore90: number | null;
  homePens: number | null;
  awayPens: number | null;
  winnerTeamId: string | null;
  kickoff: Date | null;
};

// Renders a player's teams, each with its fixtures: opponent + BST kick-off for
// upcoming games, score + points gained once played. Shared by My teams and the
// expandable rows on All teams.
export function TeamFixtures({
  teams,
  matches,
  teamById,
  cfg,
  ownerByTeam,
}: {
  teams: TeamBreakdown[];
  matches: MatchLite[];
  teamById: Map<string, { flagEmoji: string; name: string }>;
  cfg: ScoringConfig;
  ownerByTeam: Map<string, string>;
}) {
  return (
    <div className="space-y-4">
      {[...teams]
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
                  <TeamName flag={team?.flagEmoji} name={team?.name} owner={ownerByTeam.get(bd.teamId)} />
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
                    // Knockout breakdown, oriented to this team's scored–conceded.
                    const det = matchBreakdown(m);
                    const facing = (p: { home: number; away: number } | null) =>
                      p ? { s: isHome ? p.home : p.away, c: isHome ? p.away : p.home } : null;
                    const ninety = facing(det.ninety);
                    const pens = facing(det.pens);
                    const knockedOutHere = det.eliminatedTeamId === bd.teamId;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p>
                            <span className="text-xs text-slate-400">
                              {STAGE_LABELS[m.stage] ?? m.stage} ·{" "}
                            </span>
                            vs{" "}
                            <TeamName
                              flag={opp?.flagEmoji}
                              name={opp?.name}
                              owner={ownerByTeam.get((isHome ? m.awayTeamId : m.homeTeamId) ?? "")}
                            />
                          </p>
                          {!finished && !live && (
                            <p className="text-xs text-slate-500">
                              {m.kickoff ? kickoffFmt.format(m.kickoff) : "Date to be confirmed"}
                            </p>
                          )}
                          {finished && (ninety || pens || knockedOutHere) && (
                            <p className="text-xs text-slate-400">
                              {ninety && <span>90&apos; {ninety.s}–{ninety.c}</span>}
                              {pens && <span>{ninety ? " · " : ""}pens {pens.s}–{pens.c}</span>}
                              {knockedOutHere && <span className="ml-1 font-medium text-slate-500">· knocked out</span>}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {finished || live ? (
                            <p className="font-semibold">
                              {scored}–{conceded}
                              {det.tag && <span className="ml-1 text-xs font-normal text-slate-400">({det.tag})</span>}
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
  );
}
