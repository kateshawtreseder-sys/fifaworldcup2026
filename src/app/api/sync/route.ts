import { NextResponse } from "next/server";
import { syncFromFootballData } from "@/lib/football-data";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (see vercel.json) and usable manually:
//   GET /api/sync?key=YOUR_SYNC_SECRET
// Protected by SYNC_SECRET so it can't be triggered by just anyone.
export async function GET(request: Request) {
  const secret = process.env.SYNC_SECRET;
  const key = new URL(request.url).searchParams.get("key");

  // Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header.
  const authHeader = request.headers.get("authorization");
  const cronOk = authHeader === `Bearer ${process.env.CRON_SECRET}` && !!process.env.CRON_SECRET;

  if (!cronOk && (!secret || key !== secret)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const result = await syncFromFootballData();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
