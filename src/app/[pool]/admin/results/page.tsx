import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPoolContext } from "@/lib/loaders";
import { STAGE_LABELS } from "@/lib/format";
import { PoolNav } from "@/components/PoolNav";
import { saveResult, createKnockoutMatch, syncNow, loadTeams } from "../../../actions";

const STAGE_ORDER = ["group", "R32", "R16", "QF", "SF", "final"];

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ pool: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pool: slug } = await params;
  const { error } = await searchParams;
  const { pool, admin } = await getPoolContext(slug);
  if (!admin) redirect(`/${slug}`);

  const [matches, teams] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ stage: "asc" }, { groupName: "asc" }],
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  const byStage = new Map<string, typeof matches>();
  for (const m of matches) {
    const list = byStage.get(m.stage) ?? [];
    list.push(m);
    byStage.set(m.stage, list);
  }

  const hasToken = !!process.env.FOOTBALL_DATA_API_TOKEN;

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      {teams.length === 0 && (
        <div className="card mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-900">
            ⚠️ No teams loaded yet. Load the 48 World Cup teams and all the group fixtures to
            get started — you need this before the draw or entering results.
          </p>
          <form action={loadTeams.bind(null, slug)} className="mt-3">
            <button className="btn-primary">Load the 48 teams &amp; fixtures</button>
          </form>
        </div>
      )}

      {error === "teams" && (
        <div className="card mb-4 border-red-200 bg-red-50 text-sm text-red-700">
          Pick two different teams to add a knockout match.
        </div>
      )}

      <div className="card mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Results</h1>
          <p className="text-xs text-slate-500">
            Enter scores by hand, or sync from football-data.org. Saved scores are
            treated as final and won&apos;t be overwritten by a later sync.
          </p>
        </div>
        <form action={syncNow.bind(null, slug)}>
          <button className="btn-primary" disabled={!hasToken} title={hasToken ? "" : "Set FOOTBALL_DATA_API_TOKEN to enable"}>
            ⟳ Sync now
          </button>
        </form>
      </div>

      {teams.length > 0 && (
      <details className="card mb-4">
        <summary className="cursor-pointer font-semibold">+ Add a knockout match</summary>
        <form action={createKnockoutMatch.bind(null, slug)} className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <select name="stage" className="input">
              <option value="R32">Round of 32</option>
              <option value="R16">Round of 16</option>
              <option value="QF">Quarter-final</option>
              <option value="SF">Semi-final</option>
              <option value="final">Final</option>
            </select>
            <select name="homeTeamId" className="input">
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.flagEmoji} {t.name}
                </option>
              ))}
            </select>
            <select name="awayTeamId" className="input">
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.flagEmoji} {t.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-secondary">Add match</button>
        </form>
      </details>
      )}

      {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => (
        <section key={stage} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">
            {STAGE_LABELS[stage] ?? stage}
          </h2>
          <div className="space-y-2">
            {byStage.get(stage)!.map((m) => (
              <form
                key={m.id}
                action={saveResult.bind(null, slug)}
                className="card flex items-center gap-2 py-2 text-sm"
              >
                <input type="hidden" name="matchId" value={m.id} />
                <span className="flex-1 text-right">
                  {m.homeTeam?.flagEmoji} {m.homeTeam?.name ?? "TBD"}
                </span>
                <input
                  name="homeScore"
                  type="number"
                  min="0"
                  defaultValue={m.homeScore ?? ""}
                  className="w-14 rounded border border-slate-300 px-2 py-1 text-center"
                />
                <span>–</span>
                <input
                  name="awayScore"
                  type="number"
                  min="0"
                  defaultValue={m.awayScore ?? ""}
                  className="w-14 rounded border border-slate-300 px-2 py-1 text-center"
                />
                <span className="flex-1">
                  {m.awayTeam?.name ?? "TBD"} {m.awayTeam?.flagEmoji}
                </span>
                <button className="btn-secondary shrink-0">
                  {m.status === "finished" ? "Update" : "Save"}
                </button>
              </form>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
