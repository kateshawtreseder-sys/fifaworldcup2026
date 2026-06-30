// Scoring logic for the live points league. Pure functions so they're easy to
// reason about and test: feed in matches + assignments, get points out.

export type ScoringConfig = {
  groupWin: number;
  groupDraw: number;
  perGoal: number;
  reachR32: number;
  reachR16: number;
  reachQF: number;
  reachSF: number;
  reachFinal: number;
  champion: number;
};

export const DEFAULT_SCORING: ScoringConfig = {
  groupWin: 3,
  groupDraw: 1,
  perGoal: 1,
  reachR32: 2,
  reachR16: 4,
  reachQF: 6,
  reachSF: 8,
  reachFinal: 10,
  champion: 15,
};

export function parseScoring(json: string | null | undefined): ScoringConfig {
  if (!json) return DEFAULT_SCORING;
  try {
    return { ...DEFAULT_SCORING, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SCORING;
  }
}

const STAGE_BONUS: Record<string, keyof ScoringConfig> = {
  R32: "reachR32",
  R16: "reachR16",
  QF: "reachQF",
  SF: "reachSF",
  final: "reachFinal",
};

export type ScoringMatch = {
  stage: string;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
};

export type TeamBreakdown = {
  teamId: string;
  points: number;
  goals: number;
  wins: number;
  draws: number;
  reachedStages: string[];
  champion: boolean;
  eliminated: boolean; // lost a finished knockout match
};

// Points earned by a single team across all its matches.
export function pointsForTeam(
  teamId: string,
  matches: ScoringMatch[],
  cfg: ScoringConfig
): TeamBreakdown {
  let points = 0;
  let goals = 0;
  let wins = 0;
  let draws = 0;
  const reachedStages = new Set<string>();
  let champion = false;
  let eliminated = false;
  let inKnockout = false; // team appears in any knockout match
  let groupTotal = 0; // group matches this team has
  let groupFinished = 0; // ...of which are finished

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    if (!isHome && !isAway) continue;

    // Appearing in a knockout match means the team reached that round.
    if (m.stage in STAGE_BONUS) {
      reachedStages.add(m.stage);
      inKnockout = true;
    }
    if (m.stage === "group") {
      groupTotal++;
      if (m.status === "finished") groupFinished++;
    }

    if (m.status !== "finished") continue;

    // Losing a finished knockout match knocks the team out.
    if (m.stage in STAGE_BONUS && m.winnerTeamId && m.winnerTeamId !== teamId) {
      eliminated = true;
    }
    const scored = (isHome ? m.homeScore : m.awayScore) ?? 0;
    const conceded = (isHome ? m.awayScore : m.homeScore) ?? 0;

    goals += scored;
    points += scored * cfg.perGoal;

    if (m.stage === "group") {
      if (scored > conceded) {
        wins++;
        points += cfg.groupWin;
      } else if (scored === conceded) {
        draws++;
        points += cfg.groupDraw;
      }
    }

    if (m.stage === "final" && m.winnerTeamId === teamId) champion = true;
  }

  for (const stage of reachedStages) {
    points += cfg[STAGE_BONUS[stage]];
  }
  if (champion) points += cfg.champion;

  // Group-stage elimination: once the knockout stage exists (the R32 field is
  // set), a team that played its group games but reached no knockout match
  // didn't qualify — it's out. (Guarded on the knockout stage having started so
  // teams aren't marked out mid-group-stage.)
  const knockoutStarted = matches.some((m) => m.stage in STAGE_BONUS);
  if (!inKnockout && knockoutStarted && groupTotal > 0 && groupFinished === groupTotal) {
    eliminated = true;
  }

  return {
    teamId,
    points,
    goals,
    wins,
    draws,
    reachedStages: [...reachedStages],
    champion,
    eliminated: eliminated && !champion,
  };
}

// Points a single match contributes to a team (consistent with pointsForTeam:
// summing this over all a team's matches equals their total). Knockout "reach"
// bonus is credited as soon as the team appears in that round's match (even
// before kick-off); goals and win/draw count only once finished.
export function pointsForTeamInMatch(teamId: string, m: ScoringMatch, cfg: ScoringConfig): number {
  const isHome = m.homeTeamId === teamId;
  const isAway = m.awayTeamId === teamId;
  if (!isHome && !isAway) return 0;

  let pts = 0;
  if (m.stage in STAGE_BONUS) pts += cfg[STAGE_BONUS[m.stage]];

  if (m.status === "finished") {
    const scored = (isHome ? m.homeScore : m.awayScore) ?? 0;
    const conceded = (isHome ? m.awayScore : m.homeScore) ?? 0;
    pts += scored * cfg.perGoal;
    if (m.stage === "group") {
      if (scored > conceded) pts += cfg.groupWin;
      else if (scored === conceded) pts += cfg.groupDraw;
    }
    if (m.stage === "final" && m.winnerTeamId === teamId) pts += cfg.champion;
  }
  return pts;
}

// Points a participant earned from their most-recently-played finished match —
// the "what just moved them" delta shown on the podium. Returns null if none of
// their teams have a finished match yet, or the gain was zero.
export type RecentMatch = ScoringMatch & {
  id: string;
  kickoff: Date | null;
  updatedAt: Date;
};
export function mostRecentDelta(
  teamIds: Set<string>,
  matches: RecentMatch[],
  cfg: ScoringConfig
): { pts: number; teamId: string; match: RecentMatch } | null {
  let best: RecentMatch | null = null;
  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (!teamIds.has(m.homeTeamId ?? "") && !teamIds.has(m.awayTeamId ?? "")) continue;
    if (!best || +(m.kickoff ?? m.updatedAt) > +(best.kickoff ?? best.updatedAt)) best = m;
  }
  if (!best) return null;

  // Sum across the participant's teams in that match (usually one, but they may
  // own both sides), so the badge reflects their full gain from that game.
  let pts = 0;
  let teamId = "";
  for (const tid of teamIds) {
    if (best.homeTeamId === tid || best.awayTeamId === tid) {
      pts += pointsForTeamInMatch(tid, best, cfg);
      teamId = tid;
    }
  }
  return pts > 0 ? { pts, teamId, match: best } : null;
}

export type ParticipantStanding = {
  participantId: string;
  name: string;
  paid: boolean;
  points: number;
  teams: TeamBreakdown[];
};

export type LeaderboardInput = {
  participants: { id: string; name: string; paid: boolean }[];
  assignments: { participantId: string; teamId: string }[];
  matches: ScoringMatch[];
  cfg: ScoringConfig;
};

// Full leaderboard, sorted high-to-low with a stable tie-break on name.
export function buildLeaderboard(input: LeaderboardInput): ParticipantStanding[] {
  const { participants, assignments, matches, cfg } = input;

  // Precompute each team's breakdown once.
  const teamIds = new Set(assignments.map((a) => a.teamId));
  const teamPoints = new Map<string, TeamBreakdown>();
  for (const teamId of teamIds) {
    teamPoints.set(teamId, pointsForTeam(teamId, matches, cfg));
  }

  const byParticipant = new Map<string, TeamBreakdown[]>();
  for (const a of assignments) {
    const list = byParticipant.get(a.participantId) ?? [];
    const bd = teamPoints.get(a.teamId);
    if (bd) list.push(bd);
    byParticipant.set(a.participantId, list);
  }

  const standings: ParticipantStanding[] = participants.map((p) => {
    const teams = byParticipant.get(p.id) ?? [];
    const points = teams.reduce((sum, t) => sum + t.points, 0);
    return { participantId: p.id, name: p.name, paid: p.paid, points, teams };
  });

  standings.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return standings;
}
