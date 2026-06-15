import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUSES = ["open", "drawn", "active", "finished"];

// Diagnostics + repair — protected by SYNC_SECRET.
//
//   Check a pool's state:
//     GET /api/pool-admin?key=SECRET
//   Set the pool status (e.g. restore the leaderboard after an accidental reopen):
//     GET /api/pool-admin?key=SECRET&status=active
//   (optionally &slug=<pool>; defaults to the pool with the most players.)
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.SYNC_SECRET || url.searchParams.get("key") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const slug = url.searchParams.get("slug");
  let pool;
  if (slug) {
    pool = await prisma.pool.findUnique({ where: { slug } });
  } else {
    const pools = await prisma.pool.findMany({
      include: { _count: { select: { participants: true } } },
    });
    pool = pools.sort(
      (a, b) => b._count.participants - a._count.participants || +b.createdAt - +a.createdAt
    )[0];
  }
  if (!pool) return NextResponse.json({ error: "no pool found" }, { status: 404 });

  const setStatus = url.searchParams.get("status");
  if (setStatus && STATUSES.includes(setStatus)) {
    await prisma.pool.update({ where: { id: pool.id }, data: { status: setStatus } });
  }

  const [participants, assignments, matches, finished] = await Promise.all([
    prisma.participant.count({ where: { poolId: pool.id } }),
    prisma.assignment.count({ where: { poolId: pool.id } }),
    prisma.match.count(),
    prisma.match.count({ where: { status: "finished" } }),
  ]);

  return NextResponse.json({
    ok: true,
    pool: pool.slug,
    status: setStatus && STATUSES.includes(setStatus) ? setStatus : pool.status,
    statusChanged: !!(setStatus && STATUSES.includes(setStatus)),
    counts: { participants, assignments, matches, finished },
  });
}
