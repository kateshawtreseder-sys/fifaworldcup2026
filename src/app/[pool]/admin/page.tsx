import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPoolContext } from "@/lib/loaders";
import { formatMoney } from "@/lib/format";
import { inviteUrl } from "@/lib/share";
import { PoolNav } from "@/components/PoolNav";
import { CopyButton } from "@/components/CopyButton";
import { postAnnouncement, deleteAnnouncement, updatePoolSettings } from "../../actions";

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
  const pot = paidCount * pool.stakeAmount;

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />
      <h1 className="mb-4 text-xl font-bold">🛠️ Organiser panel</h1>

      {/* Stats */}
      <div className="card mb-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Players" value={String(playerCount)} />
        <Stat label="Paid" value={`${paidCount}/${playerCount}`} />
        <Stat label="Pot" value={formatMoney(pot, pool.currency)} />
      </div>

      {!pool.paymentLink && (
        <div className="card mb-4 border-amber-200 bg-amber-50 text-sm text-amber-900">
          ⚠️ You haven&apos;t set a <strong>payment link</strong> yet, so guests can&apos;t tap to
          pay. Add your Monzo/PayPal link in <strong>Settings</strong> below.
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
        <Link href={`/${slug}/invite`} className="card text-center hover:bg-slate-50">
          <div className="text-2xl">📨</div>
          <div className="mt-1 text-sm font-semibold">Invite</div>
        </Link>
      </div>

      {/* Share invite */}
      <div className="card mb-4">
        <h2 className="mb-3 font-semibold">Share your invite</h2>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded bg-slate-100 px-3 py-2 text-xs">
            {inviteUrl(pool.inviteToken)}
          </code>
          <CopyButton value={inviteUrl(pool.inviteToken)} label="Copy link" />
          <Link href={`/${slug}/invite`} className="btn-primary">
            Share options →
          </Link>
        </div>
      </div>

      {/* Settings */}
      <div className="card mb-4">
        <h2 className="mb-3 font-semibold">Settings</h2>
        <form action={updatePoolSettings.bind(null, slug)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stake per person (£)</label>
              <input
                name="stake"
                type="number"
                min="1"
                step="0.5"
                defaultValue={(pool.stakeAmount / 100).toString()}
                className="input"
              />
            </div>
            <div>
              <label className="label">Payment link</label>
              <input
                name="paymentLink"
                defaultValue={pool.paymentLink ?? ""}
                placeholder="https://monzo.me/yourname"
                className="input"
              />
            </div>
          </div>
          <button className="btn-primary">Save settings</button>
        </form>
      </div>

      <div className="card mb-4">
        <h2 className="mb-1 font-semibold">📣 Send an announcement</h2>
        <p className="mb-3 text-xs text-slate-500">
          Everyone sees this at the top of the leaderboard. It appears for them within a minute (the
          pages refresh themselves).
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

