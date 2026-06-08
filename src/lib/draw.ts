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

// Balanced "snake" draft so the allocation is fair when teams don't divide
// evenly between players:
//   - Teams are ordered strongest → weakest (by pot, random within a pot).
//   - Players are dealt in a snaking order (1..N, then N..1, ...), so whoever
//     gets the best team gets a weaker next pick — balancing total strength.
//   - The teams dealt last (the "extra" teams some players get) are therefore
//     the weakest available, so an extra team is only ever a minnow.
export function runDraw(
  participantIds: string[],
  teams: { id: string; pot: number }[],
  seed: string
): DrawResult {
  if (participantIds.length === 0) return [];
  const rand = seededRandom(seed);
  const players = shuffle(participantIds, rand);

  // Order teams strongest → weakest, randomising within each pot.
  const ordered = teams
    .map((t) => ({ t, key: rand() }))
    .sort((a, b) => a.t.pot - b.t.pot || a.key - b.key)
    .map((x) => x.t);

  const result: DrawResult = [];
  let round = 0;
  for (let i = 0; i < ordered.length; round++) {
    const order = round % 2 === 0 ? players : [...players].reverse();
    for (const participantId of order) {
      if (i >= ordered.length) break;
      result.push({ participantId, teamId: ordered[i].id });
      i++;
    }
  }
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
