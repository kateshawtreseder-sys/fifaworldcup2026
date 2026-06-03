// The draw: distribute all teams across participants as evenly as possible,
// using a seeded shuffle so the result is reproducible and auditable.

import crypto from "crypto";

// Deterministic PRNG (mulberry32) seeded from a string.
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): string {
  return crypto.randomBytes(8).toString("hex");
}

// Fisher–Yates shuffle driven by the seeded PRNG.
function shuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type DrawResult = { participantId: string; teamId: string }[];

// Allocate teams round-robin to participants after a seeded shuffle of both,
// so each participant gets floor(T/N) or ceil(T/N) teams (differ by at most 1).
export function runDraw(
  participantIds: string[],
  teamIds: string[],
  seed: string
): DrawResult {
  if (participantIds.length === 0) return [];
  const rand = seededRandom(seed);
  const people = shuffle(participantIds, rand);
  const teams = shuffle(teamIds, rand);

  const result: DrawResult = [];
  teams.forEach((teamId, i) => {
    const participantId = people[i % people.length];
    result.push({ participantId, teamId });
  });
  return result;
}

// How many teams each person will get, e.g. 48 teams / 5 people → "10 or 9".
export function describeSplit(teamCount: number, peopleCount: number): string {
  if (peopleCount === 0) return "—";
  const base = Math.floor(teamCount / peopleCount);
  const remainder = teamCount % peopleCount;
  if (remainder === 0) return `${base} each`;
  return `${remainder} player(s) get ${base + 1}, the rest get ${base}`;
}
