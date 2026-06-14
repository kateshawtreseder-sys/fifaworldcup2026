// Optional automatic results sync from football-data.org (free tier).
// The World Cup competition code is "WC". Requires FOOTBALL_DATA_API_TOKEN.
//
// Group fixtures are seeded already, so for group matches we match an existing
// fixture by the (unordered) team pair and update its score. Knockout matches
// are created on demand as the tournament progresses. Matches flagged
// `manualEdit` are never overwritten, so an organiser correction always wins.

import { prisma } from "./prisma";

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
  LAST_32: "R32",
  ROUND_OF_32: "R32",
  LAST_16: "R16",
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "final",
  THIRD_PLACE: "third",
};

function mapStatus(s: string): string {
  if (s === "FINISHED") return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  return "scheduled";
}

type FDMatch = {
  id: number;
  stage: string;
  group?: string | null;
  status: string;
  utcDate?: string;
  homeTeam: { tla?: string | null; name?: string | null };
  awayTeam: { tla?: string | null; name?: string | null };
  score: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
};

export type SyncResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  error?: string;
};

export async function syncFromFootballData(): Promise<SyncResult> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    return { ok: false, created: 0, updated: 0, skipped: 0, error: "No FOOTBALL_DATA_API_TOKEN set" };
  }

  let data: { matches?: FDMatch[] };
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, created: 0, updated: 0, skipped: 0, error: `API ${res.status}` };
    }
    data = await res.json();
  } catch (e) {
    return { ok: false, created: 0, updated: 0, skipped: 0, error: String(e) };
  }

  const teams = await prisma.team.findMany();
  const byCode = new Map(teams.map((t) => [t.fifaCode.toUpperCase(), t]));
  const byName = new Map(teams.map((t) => [t.name.toLowerCase(), t]));
  const resolve = (tla?: string | null, name?: string | null) =>
    (tla && byCode.get(tla.toUpperCase())) ||
    (name && byName.get(name.toLowerCase())) ||
    null;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const m of data.matches ?? []) {
    const stage = STAGE_MAP[m.stage];
    if (!stage || stage === "third") {
      skipped++;
      continue;
    }
    const home = resolve(m.homeTeam?.tla, m.homeTeam?.name);
    const away = resolve(m.awayTeam?.tla, m.awayTeam?.name);
    if (!home || !away) {
      skipped++;
      continue;
    }

    const status = mapStatus(m.status);
    const homeScore = m.score.fullTime.home;
    const awayScore = m.score.fullTime.away;
    let winnerTeamId: string | null = null;
    if (m.score.winner === "HOME_TEAM") winnerTeamId = home.id;
    else if (m.score.winner === "AWAY_TEAM") winnerTeamId = away.id;

    // Find an existing match for this stage and team pair (either orientation).
    const existing = await prisma.match.findFirst({
      where: {
        stage,
        OR: [
          { homeTeamId: home.id, awayTeamId: away.id },
          { homeTeamId: away.id, awayTeamId: home.id },
        ],
      },
    });

    if (existing) {
      if (existing.manualEdit) {
        skipped++;
        continue;
      }
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          externalId: existing.externalId ?? `fd-${m.id}`,
          status,
          homeScore: existing.homeTeamId === home.id ? homeScore : awayScore,
          awayScore: existing.homeTeamId === home.id ? awayScore : homeScore,
          winnerTeamId,
          kickoff: m.utcDate ? new Date(m.utcDate) : existing.kickoff,
        },
      });
      updated++;
    } else {
      await prisma.match.create({
        data: {
          externalId: `fd-${m.id}`,
          stage,
          groupName: m.group ?? null,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore,
          awayScore,
          status,
          winnerTeamId,
          kickoff: m.utcDate ? new Date(m.utcDate) : null,
        },
      });
      created++;
    }
  }

  return { ok: true, created, updated, skipped };
}

// How stale results may get before a page view triggers a fresh sync.
const AUTO_SYNC_INTERVAL_MS = 120_000; // 2 minutes
// Safety valve: if a previous sync set `syncing` and never cleared it (crash),
// let another run reclaim the lock after this long.
const SYNC_LOCK_TIMEOUT_MS = 60_000;

// Called (via `after()`) when players view the app. Runs a real sync at most
// once every couple of minutes, guarded by a DB lock so concurrent viewers
// don't all hit the API. No-op when no token is configured.
export async function maybeAutoSync(): Promise<void> {
  if (!process.env.FOOTBALL_DATA_API_TOKEN) return;

  const now = Date.now();
  const fresh = new Date(now - AUTO_SYNC_INTERVAL_MS);
  const lockExpiry = new Date(now - SYNC_LOCK_TIMEOUT_MS);

  // Ensure the single row exists.
  await prisma.syncState.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });

  // Atomically claim the lock: only proceed if it's been long enough since the
  // last sync AND nobody else is currently syncing (or their lock is stale).
  const claimed = await prisma.syncState.updateMany({
    where: {
      id: "global",
      OR: [{ syncing: false }, { lastSyncAt: { lt: lockExpiry } }],
      AND: [{ OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: fresh } }] }],
    },
    data: { syncing: true },
  });
  if (claimed.count === 0) return; // too soon, or another viewer is syncing

  try {
    await syncFromFootballData();
  } catch {
    // ignore — manual sync / next view will retry
  } finally {
    await prisma.syncState.update({
      where: { id: "global" },
      data: { syncing: false, lastSyncAt: new Date() },
    });
  }
}
