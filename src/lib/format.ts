// Money is stored in minor units (pence). Format for display.

export function formatMoney(minor: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "pool"
  );
}

export const STAGE_LABELS: Record<string, string> = {
  group: "Group stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  final: "Final",
};

// Ensure a user-entered link is treated as an external URL. Without a scheme,
// browsers treat e.g. "monzo.me/x" as a relative path on our own site.
export function externalUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const KNOCKOUT_STAGES = new Set(["R32", "R16", "QF", "SF", "final"]);

// Just the fields needed to describe how a match was decided.
export type MatchScoreFields = {
  stage: string;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  duration: string | null;
  homeScore90: number | null;
  awayScore90: number | null;
  homePens: number | null;
  awayPens: number | null;
  winnerTeamId: string | null;
};

export type MatchBreakdown = {
  /** Headline suffix: "" (90'), "AET", or "pens". */
  tag: "" | "AET" | "pens";
  /** 90-minute score, only when the match went past 90' and we know it. */
  ninety: { home: number; away: number } | null;
  /** Penalty-shootout score, only for shootouts. */
  pens: { home: number; away: number } | null;
  /** Team eliminated by this match (finished knockout only), else null. */
  eliminatedTeamId: string | null;
};

// Describe how a knockout match was decided (extra time / penalties) and who
// went out. The headline `homeScore–awayScore` is rendered by the caller; this
// adds the 90-minute and shootout detail plus the eliminated team.
export function matchBreakdown(m: MatchScoreFields): MatchBreakdown {
  const duration = m.duration ?? "REGULAR";
  const beyond90 = duration === "EXTRA_TIME" || duration === "PENALTY_SHOOTOUT";

  const tag: MatchBreakdown["tag"] = duration === "PENALTY_SHOOTOUT" ? "pens" : beyond90 ? "AET" : "";
  const ninety =
    beyond90 && m.homeScore90 != null && m.awayScore90 != null
      ? { home: m.homeScore90, away: m.awayScore90 }
      : null;
  const pens =
    duration === "PENALTY_SHOOTOUT" && m.homePens != null && m.awayPens != null
      ? { home: m.homePens, away: m.awayPens }
      : null;

  let eliminatedTeamId: string | null = null;
  if (KNOCKOUT_STAGES.has(m.stage) && m.status === "finished" && m.winnerTeamId) {
    eliminatedTeamId = m.winnerTeamId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
  }

  return { tag, ninety, pens, eliminatedTeamId };
}

// Furthest knockout round a team reached, as a friendly label ("" if none).
const STAGE_RANK = ["R32", "R16", "QF", "SF", "final"];
export function furthestStageLabel(stages: string[]): string {
  let bestIdx = -1;
  for (const s of stages) {
    const i = STAGE_RANK.indexOf(s);
    if (i > bestIdx) bestIdx = i;
  }
  return bestIdx >= 0 ? STAGE_LABELS[STAGE_RANK[bestIdx]] ?? "" : "";
}
