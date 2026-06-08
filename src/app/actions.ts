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
  clearParticipant,
  getParticipantToken,
} from "@/lib/auth";
import { slugify, externalUrl } from "@/lib/format";
import { DEFAULT_SCORING } from "@/lib/scoring";
import { runDraw, newSeed } from "@/lib/draw";
import { syncFromFootballData } from "@/lib/football-data";
import { seedTeamsAndFixtures } from "@/lib/seed";

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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const stakePounds = Number(formData.get("stake") ?? 0);
  const password = String(formData.get("password") ?? "");
  const paymentLink = externalUrl(String(formData.get("paymentLink") ?? "")) || null;

  if (!name || !email || password.length < 4 || !(stakePounds > 0)) {
    throw new Error("Please provide a name, your email, a stake, and a password of at least 4 characters.");
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
      adminEmail: email,
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
  const paymentLink = externalUrl(String(formData.get("paymentLink") ?? "")) || null;
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordOk = await checkPassword(password, pool.adminPasswordHash);
  // Older pools have no admin email — fall back to password-only for them.
  const emailOk = !pool.adminEmail || pool.adminEmail === email;
  if (!passwordOk || !emailOk) {
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
  if (pool.status !== "open") redirect(`/join/${inviteToken}?error=closed`);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email) redirect(`/join/${inviteToken}?error=missing`);
  if (password.length < 4) redirect(`/join/${inviteToken}?error=shortpass`);

  // If this email already joined, log them in (if the password matches).
  const existing = await prisma.participant.findFirst({
    where: { poolId: pool.id, email },
  });
  if (existing) {
    if (existing.passwordHash && (await checkPassword(password, existing.passwordHash))) {
      await setParticipant(pool.slug, existing.joinToken);
      redirect(`/${pool.slug}/me`);
    }
    redirect(`/join/${inviteToken}?error=exists`);
  }

  const participant = await prisma.participant.create({
    data: { poolId: pool.id, name, email, passwordHash: await hashPassword(password), joinToken: token() },
  });

  await setParticipant(pool.slug, participant.joinToken);
  redirect(`/${pool.slug}/me`);
}

// Existing guest logs back in with their email + password (any device).
export async function participantLogin(slug: string, formData: FormData) {
  const pool = await prisma.pool.findUnique({ where: { slug } });
  if (!pool) throw new Error("Pool not found");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const p = email
    ? await prisma.participant.findFirst({ where: { poolId: pool.id, email } })
    : null;
  if (!p || !p.passwordHash || !(await checkPassword(password, p.passwordHash))) {
    redirect(`/${slug}/login?error=bad`);
  }
  await setParticipant(slug, p.joinToken);
  redirect(`/${slug}/me`);
}

export async function participantLogout(slug: string) {
  await clearParticipant(slug);
  redirect(`/${slug}/login`);
}

// --- Payments tracking ---

export async function setPaid(slug: string, participantId: string, paid: boolean) {
  const pool = await requireAdmin(slug);
  // Confirming clears the pending "I've paid" claim; un-paying clears everything.
  await prisma.participant.update({
    where: { id: participantId },
    data: {
      paid,
      paidAt: paid ? new Date() : null,
      paidClaimed: false,
      paidClaimedAt: null,
    },
  });
  if (await prisma.participant.findFirst({ where: { id: participantId, poolId: pool.id } })) {
    revalidatePath(`/${slug}/participants`);
  }
}

// Guest taps "I've paid" — flags them as awaiting the organiser's confirmation.
export async function claimPaid(slug: string) {
  const token = await getParticipantToken(slug);
  if (!token) throw new Error("We don't recognise you in this sweepstake.");
  const participant = await prisma.participant.findUnique({ where: { joinToken: token } });
  if (!participant) throw new Error("Participant not found");
  if (!participant.paid) {
    await prisma.participant.update({
      where: { id: participant.id },
      data: { paidClaimed: true, paidClaimedAt: new Date() },
    });
  }
  revalidatePath(`/${slug}/me`);
  revalidatePath(`/${slug}/participants`);
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
  if (!["R32", "R16", "QF", "SF", "final"].includes(stage)) {
    redirect(`/${slug}/admin/results?error=stage`);
  }
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    redirect(`/${slug}/admin/results?error=teams`);
  }
  await prisma.match.create({
    data: { stage, homeTeamId, awayTeamId, status: "scheduled" },
  });
  revalidatePath(`/${slug}/admin/results`);
}

// Loads the 48 teams + group fixtures into the database (idempotent).
// Available to the organiser so they never need the /api/setup URL.
export async function loadTeams(slug: string) {
  await requireAdmin(slug);
  await seedTeamsAndFixtures(prisma);
  revalidatePath(`/${slug}/admin/results`);
  revalidatePath(`/${slug}/draw`);
  revalidatePath(`/${slug}/leaderboard`);
}

export async function syncNow(slug: string) {
  await requireAdmin(slug);
  await syncFromFootballData();
  revalidatePath(`/${slug}/admin/results`);
  revalidatePath(`/${slug}/leaderboard`);
}

// --- Announcements ---

export async function postAnnouncement(slug: string, formData: FormData) {
  const pool = await requireAdmin(slug);
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;
  await prisma.announcement.create({ data: { poolId: pool.id, message: message.slice(0, 500) } });
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/leaderboard`);
  revalidatePath(`/${slug}/me`);
  revalidatePath(`/${slug}`);
}

export async function deleteAnnouncement(slug: string, id: string) {
  const pool = await requireAdmin(slug);
  await prisma.announcement.deleteMany({ where: { id, poolId: pool.id } });
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/leaderboard`);
  revalidatePath(`/${slug}/me`);
  revalidatePath(`/${slug}`);
}
