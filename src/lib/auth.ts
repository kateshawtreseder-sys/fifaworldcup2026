// Lightweight, family-trust-level auth.
//
//  - Organiser actions are gated by a per-pool admin password (bcrypt-hashed).
//    On success we set a signed cookie proving admin access to that pool.
//  - Participants are identified by their joinToken stored in a signed cookie.
//
// This is intentionally simple — appropriate for a private family pool, not a
// hardened multi-tenant SaaS.

import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const SECRET = process.env.APP_SECRET ?? "dev-insecure-secret";
const SECURE = process.env.NODE_ENV === "production";
const YEAR = 60 * 60 * 24 * 365;

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  // constant-time compare
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return value;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- Admin session (per pool) ---

const adminCookie = (slug: string) => `admin_${slug}`;

export async function grantAdmin(slug: string, poolId: string) {
  const store = await cookies();
  store.set(adminCookie(slug), sign(poolId), {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: YEAR,
  });
}

export async function revokeAdmin(slug: string) {
  const store = await cookies();
  store.delete(adminCookie(slug));
}

export async function isAdmin(slug: string, poolId: string): Promise<boolean> {
  const store = await cookies();
  return verify(store.get(adminCookie(slug))?.value) === poolId;
}

// --- Participant session (per pool) ---

const pidCookie = (slug: string) => `pid_${slug}`;

export async function setParticipant(slug: string, joinToken: string) {
  const store = await cookies();
  store.set(pidCookie(slug), sign(joinToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: YEAR,
  });
}

export async function clearParticipant(slug: string) {
  const store = await cookies();
  store.delete(pidCookie(slug));
}

export async function getParticipantToken(slug: string): Promise<string | null> {
  const store = await cookies();
  return verify(store.get(pidCookie(slug))?.value);
}
