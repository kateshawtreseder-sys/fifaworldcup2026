import { notFound } from "next/navigation";
import { prisma } from "./prisma";
import { isAdmin, getParticipantToken } from "./auth";

// Loads a pool by slug plus the viewer's admin status. 404s if missing.
export async function getPoolContext(slug: string) {
  const pool = await prisma.pool.findUnique({ where: { slug } });
  if (!pool) notFound();
  const admin = await isAdmin(slug, pool.id);
  return { pool, admin };
}

// The current participant in this pool (from their cookie), if any.
export async function getCurrentParticipant(slug: string, poolId: string) {
  const token = await getParticipantToken(slug);
  if (!token) return null;
  return prisma.participant.findFirst({ where: { joinToken: token, poolId } });
}
