import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPoolContext } from "@/lib/loaders";
import { PoolNav } from "@/components/PoolNav";
import { postAnnouncement, deleteAnnouncement } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminHub({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  if (!admin) redirect(`/${slug}`);

  const [announcements, pendingClaims, playerCount, paidCount] = await Promise.all([
    prisma.announcement.findMany({ where: { poolId: pool.id }, orderBy: { createdAt: "desc" } }),
    prisma.participant.count({ where: { poolId: pool.id, paidClaimed: true, paid: false } }),
    prisma.participant.count({ where: { poolId: pool.id } }),
    prisma.participant.count({ where: { poolId: pool.id, paid: true } }),
  ]);

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />
      <h1 className="mb-4 text-xl font-bold">🛠️ Organiser panel</h1>

      {!pool.paymentLink && (
        <div className="card mb-4 border-amber-200 bg-amber-50 text-sm text-amber-900">
          ⚠️ You haven&apos;t set a <strong>payment link</strong> yet, so guests can&apos;t tap to
          pay. Add your Monzo/PayPal link on the{" "}
          <Link href={`/${slug}`} className="font-semibold underline">
            dashboard settings
          </Link>
          .
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href={`/${slug}/participants`} className="card text-center hover:bg-slate-50">
          <div className="text-2xl">💷</div>
          <div className="mt-1 text-sm font-semibold">Players &amp; pay</div>
          {pendingClaims > 0 && (
            <div className="mt-1 text-xs font-bold text-amber-700">
              {pendingClaims} to confirm
            </div>
          )}
        </Link>
        <Link href={`/${slug}/draw`} className="card text-center hover:bg-slate-50">
          <div className="text-2xl">🎲</div>
          <div className="mt-1 text-sm font-semibold">Run / view draw</div>
        </Link>
        <Link href={`/${slug}/admin/results`} className="card text-center hover:bg-slate-50">
          <div className="text-2xl">📊</div>
          <div className="mt-1 text-sm font-semibold">Scores &amp; sync</div>
        </Link>
        <Link href={`/${slug}/leaderboard`} className="card text-center hover:bg-slate-50">
          <div className="text-2xl">🏆</div>
          <div className="mt-1 text-sm font-semibold">Leaderboard</div>
        </Link>
      </div>

      <div className="card mb-4">
        <h2 className="mb-1 font-semibold">📣 Send an announcement</h2>
        <p className="mb-3 text-xs text-slate-500">
          Everyone sees this at the top of the leaderboard and their teams page. It appears for
          them within a minute (the pages refresh themselves). {playerCount} players · {paidCount}{" "}
          paid.
        </p>
        <form action={postAnnouncement.bind(null, slug)} className="space-y-2">
          <textarea
            name="message"
            className="input"
            rows={2}
            maxLength={500}
            placeholder="e.g. Kick-off tonight 8pm! Draw happens Friday — pay your stake by then 🙏"
            required
          />
          <button className="btn-primary">Post announcement</button>
        </form>
      </div>

      {announcements.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Posted announcements</h2>
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 rounded bg-slate-50 px-3 py-2">
                <div>
                  <p className="whitespace-pre-wrap text-sm">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <form action={deleteAnnouncement.bind(null, slug, a.id)}>
                  <button className="text-xs text-red-600 underline">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
