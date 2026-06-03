"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  checkPassword,
  grantAdmin,
  revokeAdmin,
  isAdmin,
  setParticipant,
} from "@/lib/auth";
import { slugify } from "@/lib/format";
import { DEFAULT_SCORING } from "@/lib/scoring";
import { runDraw, newSeed } from "@/lib/draw";
import { syncFromFootballData } from "@/lib/football-data";

function token(bytes = 9): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

async function requireAdmin(slug: string) {
  const pool = await prisma.pool.findUnique({ where: { slug } });
  if (!pool) throw new Error("Pool not found");
  if (!(await isAdmin(slug, pool.id))) throw new Error("Not authorised");
  return pool;
}

// --- Pool creation & settings ---

export async function createPool(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const stakePounds = Number(formData.get("stake") ?? 0);
  const password = String(formData.get("password") ?? "");
  const paymentLink = String(formData.get("paymentLink") ?? "").trim() || null;

  if (!name || password.length < 4 || !(stakePounds > 0)) {
    throw new Error("Please provide a name, a stake, and a password of at least 4 characters.");
  }

  // Ensure a unique slug.
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.pool.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }

  const pool = await prisma.pool.create({
    data: {
      slug,
      name,
      stakeAmount: Math.round(stakePounds * 100),
      paymentLink,
      adminPasswordHash: await hashPassword(password),
      inviteToken: token(12),
      scoringConfig: JSON.stringify(DEFAULT_SCORING),
    },
  });

  await grantAdmin(slug, pool.id);
  redirect(`/${slug}`);
}

export async function updatePoolSettings(slug: string, formData: FormData) {
  const pool = await requireAdmin(slug);
  const stakePounds = Number(formData.get("stake") ?? 0);
  const paymentLink = String(formData.get("paymentLink") ?? "").trim() || null;
  await prisma.pool.update({
    where: { id: pool.id },
    data: {
      paymentLink,
      ...(stakePounds > 0 ? { stakeAmount: Math.round(stakePounds * 100) } : {}),
    },
  });
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/participants`);
}

// --- Admin auth ---

export async function adminLogin(slug: string, formData: FormData) {
  const pool = await prisma.pool.findUnique({ where: { slug } });
  if (!pool) throw new Error("Pool not found");
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password, pool.adminPasswordHash))) {
    redirect(`/${slug}?error=badpass`);
  }
  await grantAdmin(slug, pool.id);
  redirect(`/${slug}`);
}

export async function adminLogout(slug: string) {
  await revokeAdmin(slug);
  redirect(`/${slug}`);
}

// --- Joining ---

export async function joinPool(inviteToken: string, formData: FormData) {
  const pool = await prisma.pool.findUnique({ where: { inviteToken } });
  if (!pool) throw new Error("Invite not found");
  if (pool.status !== "open") throw new Error("This sweepstake is closed to new joiners.");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  if (!name) throw new Error("Please enter your name.");

  const participant = await prisma.participant.create({
    data: { poolId: pool.id, name, email, joinToken: token() },
  });

  await setParticipant(pool.slug, participant.joinToken);
  redirect(`/${pool.slug}/me`);
}

// --- Payments tracking ---

export async function setPaid(slug: string, participantId: string, paid: boolean) {
  const pool = await requireAdmin(slug);
  await prisma.participant.update({
    where: { id: participantId },
    data: { paid, paidAt: paid ? new Date() : null },
  });
  if (await prisma.participant.findFirst({ where: { id: participantId, poolId: pool.id } })) {
    revalidatePath(`/${slug}/participants`);
  }
}

export async function removeParticipant(slug: string, participantId: string) {
  await requireAdmin(slug);
  await prisma.participant.delete({ where: { id: participantId } });
  revalidatePath(`/${slug}/participants`);
}

// --- The draw ---

export async function runDrawAction(slug: string) {
  const pool = await requireAdmin(slug);
  if (pool.status !== "open") throw new Error("The draw has already been run.");

  const participants = await prisma.participant.findMany({ where: { poolId: pool.id } });
  if (participants.length === 0) throw new Error("No participants to draw for yet.");
  const teams = await prisma.team.findMany();

  const seed = newSeed();
  const assignments = runDraw(
    participants.map((p) => p.id),
    teams.map((t) => t.id),
    seed
  );

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { poolId: pool.id } }),
    prisma.assignment.createMany({
      data: assignments.map((a) => ({ ...a, poolId: pool.id })),
    }),
    prisma.pool.update({
      where: { id: pool.id },
      data: { status: "active", drawSeed: seed },
    }),
  ]);

  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/draw`);
  revalidatePath(`/${slug}/leaderboard`);
}

// --- Results (manual entry / override) ---

export async function saveResult(slug: string, formData: FormData) {
  await requireAdmin(slug);
  const matchId = String(formData.get("matchId"));
  const home = Number(formData.get("homeScore"));
  const away = Number(formData.get("awayScore"));
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    throw new Error("Scores must be non-negative whole numbers.");
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");

  let winnerTeamId: string | null = null;
  if (home > away) winnerTeamId = match.homeTeamId;
  else if (away > home) winnerTeamId = match.awayTeamId;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: home,
      awayScore: away,
      status: "finished",
      winnerTeamId,
      manualEdit: true,
    },
  });

  revalidatePath(`/${slug}/admin/results`);
  revalidatePath(`/${slug}/leaderboard`);
}

export async function createKnockoutMatch(slug: string, formData: FormData) {
  await requireAdmin(slug);
  const stage = String(formData.get("stage"));
  const homeTeamId = String(formData.get("homeTeamId"));
  const awayTeamId = String(formData.get("awayTeamId"));
  if (!["R32", "R16", "QF", "SF", "final"].includes(stage)) throw new Error("Invalid stage");
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    throw new Error("Pick two different teams.");
  }
  await prisma.match.create({
    data: { stage, homeTeamId, awayTeamId, status: "scheduled" },
  });
  revalidatePath(`/${slug}/admin/results`);
}

export async function syncNow(slug: string) {
  await requireAdmin(slug);
  await syncFromFootballData();
  revalidatePath(`/${slug}/admin/results`);
  revalidatePath(`/${slug}/leaderboard`);
}
