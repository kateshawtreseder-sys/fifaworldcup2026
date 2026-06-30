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
            This shares all {teamCount} teams between the {participants.length} player
            {participants.length === 1 ? "" : "s"} who have joined — in a{" "}
            <strong>balanced</strong> way: everyone gets a fair mix of strong and weaker teams,
            and where the numbers don&apos;t divide evenly, the few players who get an extra team
            only get one of the lowest-ranked teams. So having more teams isn&apos;t an unfair
            advantage.
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              <span className="font-medium">Split:</span>{" "}
              {describeSplit(teamCount, participants.length)}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {paidCount} of {participants.length} have paid. You can still draw with unpaid
              players — chase them up on the Players page.
            </p>
          </div>
          <p className="text-xs text-amber-700">
            ⚠️ Once you run the draw, the sweepstake closes to new joiners. Make sure everyone
            has joined first.
          </p>
          {teamCount === 0 && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              No teams are loaded yet. Go to the <strong>Results</strong> page and tap
              “Load the 48 teams &amp; fixtures” first.
            </p>
          )}
          <form action={runDrawAction.bind(null, slug)}>
            <button className="btn-primary w-full" disabled={participants.length === 0 || teamCount === 0}>
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
              <p className="mt-1 text-xs text-slate-600">Draw seed: {pool.drawSeed}</p>
            )}
          </div>
          {[...byParticipant.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <div key={p.name} className="card">
                <p className="font-semibold">
                  {p.name} <span className="text-xs text-slate-600">({p.teams.length} teams)</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">{p.teams.join(" · ")}</p>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
