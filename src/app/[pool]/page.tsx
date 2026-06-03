import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { formatMoney } from "@/lib/format";
import { inviteUrl } from "@/lib/share";
import { PoolNav } from "@/components/PoolNav";
import { CopyButton } from "@/components/CopyButton";
import { adminLogin, adminLogout, updatePoolSettings } from "../actions";

export default async function PoolHome({
  params,
  searchParams,
}: {
  params: Promise<{ pool: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pool: slug } = await params;
  const { error } = await searchParams;
  const { pool, admin } = await getPoolContext(slug);

  const [playerCount, paidCount] = await Promise.all([
    prisma.participant.count({ where: { poolId: pool.id } }),
    prisma.participant.count({ where: { poolId: pool.id, paid: true } }),
  ]);
  const me = await getCurrentParticipant(slug, pool.id);
  const pot = paidCount * pool.stakeAmount;

  const statusLabel: Record<string, string> = {
    open: "Open — people can still join",
    drawn: "Teams drawn",
    active: "Teams drawn — tournament under way",
    finished: "Finished",
  };

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Stake</p>
            <p className="text-xl font-bold">{formatMoney(pool.stakeAmount, pool.currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Status</p>
            <p className="font-semibold text-pitch-800">{statusLabel[pool.status]}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Players" value={String(playerCount)} />
          <Stat label="Paid" value={`${paidCount}/${playerCount}`} />
          <Stat label="Pot" value={formatMoney(pot, pool.currency)} />
        </div>
      </div>

      {!me && pool.status === "open" && (
        <div className="card mb-4 bg-pitch-50">
          <p className="text-sm">
            Haven&apos;t joined yet?{" "}
            <Link href={`/join/${pool.inviteToken}`} className="font-semibold text-pitch-700 underline">
              Join the sweepstake →
            </Link>
          </p>
        </div>
      )}

      {admin ? (
        <div className="space-y-4">
          <div className="card">
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

          <div className="card">
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

          <form action={adminLogout.bind(null, slug)}>
            <button className="text-sm text-slate-500 underline">Log out of organiser mode</button>
          </form>
        </div>
      ) : (
        <div className="card">
          <h2 className="mb-1 font-semibold">Organiser sign in</h2>
          <p className="mb-3 text-sm text-slate-500">
            Enter the organiser password to manage payments, run the draw, and enter results.
          </p>
          {error === "badpass" && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              Wrong password — try again.
            </p>
          )}
          <form action={adminLogin.bind(null, slug)} className="flex gap-2">
            <input name="password" type="password" className="input" placeholder="Organiser password" required />
            <button className="btn-primary">Sign in</button>
          </form>
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
