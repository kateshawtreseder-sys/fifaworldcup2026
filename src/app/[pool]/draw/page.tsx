import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPoolContext } from "@/lib/loaders";
import { describeSplit } from "@/lib/draw";
import { PoolNav } from "@/components/PoolNav";
import { runDrawAction } from "../../actions";

export default async function DrawPage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  if (!admin) redirect(`/${slug}`);

  const [participants, teamCount, paidCount] = await Promise.all([
    prisma.participant.findMany({ where: { poolId: pool.id }, orderBy: { name: "asc" } }),
    prisma.team.count(),
    prisma.participant.count({ where: { poolId: pool.id, paid: true } }),
  ]);

  const alreadyDrawn = pool.status !== "open";

  // If drawn, load allocations grouped by participant.
  const assignments = alreadyDrawn
    ? await prisma.assignment.findMany({
        where: { poolId: pool.id },
        include: { team: true, participant: true },
      })
    : [];
  const byParticipant = new Map<string, { name: string; teams: string[] }>();
  for (const a of assignments) {
    const entry = byParticipant.get(a.participantId) ?? { name: a.participant.name, teams: [] };
    entry.teams.push(`${a.team.flagEmoji} ${a.team.name}`);
    byParticipant.set(a.participantId, entry);
  }

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      {!alreadyDrawn ? (
        <div className="card space-y-4">
          <h1 className="text-lg font-semibold">Run the draw</h1>
          <p className="text-sm text-slate-600">
            This randomly shares all {teamCount} teams between the {participants.length} player
            {participants.length === 1 ? "" : "s"} who have joined.
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              <span className="font-medium">Split:</span>{" "}
              {describeSplit(teamCount, participants.length)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {paidCount} of {participants.length} have paid. You can still draw with unpaid
              players — chase them up on the Players page.
            </p>
          </div>
          <p className="text-xs text-amber-700">
            ⚠️ Once you run the draw, the sweepstake closes to new joiners. Make sure everyone
            has joined first.
          </p>
          <form action={runDrawAction.bind(null, slug)}>
            <button className="btn-primary w-full" disabled={participants.length === 0}>
              🎲 Run the draw
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <h1 className="text-lg font-semibold">The draw is done! 🎉</h1>
            <p className="text-sm text-slate-600">
              Teams were shared out using a fair, reproducible random seed.
            </p>
            {pool.drawSeed && (
              <p className="mt-1 text-xs text-slate-400">Draw seed: {pool.drawSeed}</p>
            )}
          </div>
          {[...byParticipant.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <div key={p.name} className="card">
                <p className="font-semibold">
                  {p.name} <span className="text-xs text-slate-500">({p.teams.length} teams)</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">{p.teams.join(" · ")}</p>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
