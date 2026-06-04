import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPoolContext } from "@/lib/loaders";
import { formatMoney } from "@/lib/format";
import { PoolNav } from "@/components/PoolNav";
import { setPaid, removeParticipant } from "../../actions";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  if (!admin) redirect(`/${slug}`);

  const participants = await prisma.participant.findMany({
    where: { poolId: pool.id },
    orderBy: { createdAt: "asc" },
  });
  const paidCount = participants.filter((p) => p.paid).length;
  const pot = paidCount * pool.stakeAmount;

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Collected pot</p>
          <p className="text-2xl font-bold text-pitch-800">{formatMoney(pot, pool.currency)}</p>
          <p className="text-xs text-slate-500">
            {paidCount} of {participants.length} paid ·{" "}
            {formatMoney(pool.stakeAmount, pool.currency)} each
          </p>
        </div>
        {pool.paymentLink && (
          <a href={pool.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            Open payment link ↗
          </a>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          No one has joined yet. Share your invite link to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.id} className="card flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{p.name}</p>
                {p.email && <p className="text-xs text-slate-500">{p.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    p.paid
                      ? "bg-pitch-100 text-pitch-800"
                      : p.paidClaimed
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {p.paid ? "Paid" : p.paidClaimed ? "Says paid ✋" : "Unpaid"}
                </span>
                {p.paidClaimed && !p.paid ? (
                  <form action={setPaid.bind(null, slug, p.id, true)}>
                    <button className="btn-primary">Confirm</button>
                  </form>
                ) : (
                  <form action={setPaid.bind(null, slug, p.id, !p.paid)}>
                    <button className="btn-secondary">{p.paid ? "Mark unpaid" : "Mark paid"}</button>
                  </form>
                )}
                {pool.status === "open" && (
                  <form action={removeParticipant.bind(null, slug, p.id)}>
                    <button className="text-xs text-red-600 underline" title="Remove">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
