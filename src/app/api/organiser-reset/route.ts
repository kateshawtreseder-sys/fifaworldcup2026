import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Organiser recovery — protected by SYNC_SECRET.
//
//   Check current organiser email:
//     GET /api/organiser-reset?key=SECRET
//   Set organiser email and/or password:
//     GET /api/organiser-reset?key=SECRET&email=you@example.com&password=newpass
//   (optionally &slug=<pool> to target a specific pool; defaults to the pool
//    with the most players.)
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.SYNC_SECRET || url.searchParams.get("key") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const password = url.searchParams.get("password");
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

  // No changes requested → just report the current organiser email.
  if (!email && !password) {
    return NextResponse.json({
      ok: true,
      pool: pool.slug,
      currentOrganiserEmail: pool.adminEmail,
    });
  }

  const data: { adminEmail?: string; adminPasswordHash?: string } = {};
  if (email) data.adminEmail = email;
  if (password) data.adminPasswordHash = await hashPassword(password);
  await prisma.pool.update({ where: { id: pool.id }, data });

  return NextResponse.json({
    ok: true,
    pool: pool.slug,
    organiserEmail: email ?? pool.adminEmail,
    passwordChanged: !!password,
  });
}
