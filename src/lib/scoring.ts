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

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    if (!isHome && !isAway) continue;

    // Appearing in a knockout match means the team reached that round.
    if (m.stage in STAGE_BONUS) reachedStages.add(m.stage);

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
