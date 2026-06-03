import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedTeamsAndFixtures } from "@/lib/seed";

export const dynamic = "force-dynamic";

// One-time (idempotent) data load after deploying. Visit once:
//   GET /api/setup?key=YOUR_SYNC_SECRET
// Loads the 48 teams and 72 group fixtures. Safe to run again (upserts).
export async function GET(request: Request) {
  const secret = process.env.SYNC_SECRET;
  const key = new URL(request.url).searchParams.get("key");
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const result = await seedTeamsAndFixtures(prisma);
  return NextResponse.json({ ok: true, ...result });
}
