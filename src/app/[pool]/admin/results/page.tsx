import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPoolContext } from "@/lib/loaders";
import { STAGE_LABELS } from "@/lib/format";
import { PoolNav } from "@/components/PoolNav";
import { SubmitButton } from "@/components/SubmitButton";
import { saveResult, createKnockoutMatch, syncNow, loadTeams, loadFixtureDates } from "../../../actions";

const STAGE_ORDER = ["group", "R32", "R16", "QF", "SF", "final"];

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ pool: string }>;
  searchParams: Promise<{ error?: string; sync?: string; c?: string; u?: string; s?: string; m?: string; dates?: string }>;
}) {
  const { pool: slug } = await params;
  const { error, sync, c, u, s, m, dates } = await searchParams;
  const { pool, admin } = await getPoolContext(slug);
  if (!admin) redirect(`/${slug}`);

  const [matches, teams] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ stage: "asc" }, { groupName: "asc" }],
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Only unplayed games get editable rows; finished games go in a compact,
  // expandable "played" list.
  const unplayed = matches.filter((mm) => mm.status !== "finished");
  const played = matches
    .filter((mm) => mm.status === "finished")
    .sort((a, b) => +(b.kickoff ?? b.updatedAt) - +(a.kickoff ?? a.updatedAt));
  const unplayedByStage = new Map<string, typeof matches>();
  for (const mm of unplayed) {
    const list = unplayedByStage.get(mm.stage) ?? [];
    list.push(mm);
    unplayedByStage.set(mm.stage, list);
  }

  const hasToken = !!process.env.FOOTBALL_DATA_API_TOKEN;

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      <div className="card mb-4 border-amber-200 bg-amber-50">
        <p className="text-sm font-medium text-amber-900">
          {teams.length === 0
            ? "⚠️ No teams loaded yet. Load the 48 official World Cup 2026 teams and all the group fixtures to get started — you need this before the draw or entering results."
            : "Load the official World Cup 2026 teams & fixtures. Use this to (re)load the line-up."}
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Note: this resets teams, fixtures and any draw/results, and reopens the pool for a fresh
          draw. Players, payments and announcements are kept. Do it <strong>before</strong> the
          tournament starts.
        </p>
        <form action={loadTeams.bind(null, slug)} className="mt-3">
          <SubmitButton className="btn-primary" pendingText="Loading teams…">
            {teams.length === 0 ? "Load the 48 teams & fixtures" : "Reload official teams & fixtures"}
          </SubmitButton>
        </form>
      </div>

      {teams.length > 0 && (
        <div className="card mb-4">
          <p className="text-sm font-medium">📅 Fixture dates &amp; times</p>
          <p className="mt-1 text-xs text-slate-600">
            Fill in the official group-stage kick-off times so they show on players&apos; teams.
            Safe to run any time — it doesn&apos;t change teams, the draw or any scores.
          </p>
          <form action={loadFixtureDates.bind(null, slug)} className="mt-3">
            <SubmitButton className="btn-secondary" pendingText="Loading dates…">
              📅 Load fixture dates &amp; times
            </SubmitButton>
          </form>
        </div>
      )}

      {dates !== undefined && (
        <div className="card mb-4 border-pitch-200 bg-pitch-50 text-sm text-pitch-800">
          ✅ Loaded kick-off times for {dates} group fixtures.
        </div>
      )}

      {error === "teams" && (
        <div className="card mb-4 border-red-200 bg-red-50 text-sm text-red-700">
          Pick two different teams to add a knockout match.
        </div>
      )}

      {sync === "ok" && (
        <div className="card mb-4 border-pitch-200 bg-pitch-50 text-sm text-pitch-800">
          ✅ Synced from football-data.org — {u ?? 0} match{u === "1" ? "" : "es"} updated,{" "}
          {c ?? 0} added{Number(s) > 0 ? `, ${s} skipped (not matched)` : ""}.
        </div>
      )}
      {sync === "err" && (
        <div className="card mb-4 border-red-200 bg-red-50 text-sm text-red-700">
          ⚠️ Sync didn&apos;t work: {m ? decodeURIComponent(m) : "unknown error"}. You can still
          enter scores by hand below.
        </div>
      )}

      <div className="card mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Results</h1>
          <p className="text-xs text-slate-600">
            Enter scores by hand, or sync from football-data.org. Saved scores are
            treated as final and won&apos;t be overwritten by a later sync.
          </p>
        </div>
        <form action={syncNow.bind(null, slug)}>
          <SubmitButton className="btn-primary" pendingText="Syncing…" disabled={!hasToken} title={hasToken ? "" : "Set FOOTBALL_DATA_API_TOKEN to enable"}>
            ⟳ Sync now
          </SubmitButton>
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

      {/* Games still to be played — editable */}
      {STAGE_ORDER.filter((s) => unplayedByStage.has(s)).map((stage) => (
        <section key={stage} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">
            {STAGE_LABELS[stage] ?? stage} — to play
          </h2>
          <div className="space-y-2">
            {unplayedByStage.get(stage)!.map((m) => (
              <div key={m.id} className="card py-2">
                <EditRow m={m} slug={slug} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Played games — compact read-only, tap to expand & edit */}
      {played.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">
            Played games ({played.length})
          </h2>
          <div className="space-y-1">
            {played.map((m) => (
              <details key={m.id} className="rounded bg-white px-3 py-2 text-sm shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-2">
                  <span>
                    {m.homeTeam?.flagEmoji} {m.homeTeam?.name} {m.homeScore}–{m.awayScore}{" "}
                    {m.awayTeam?.name} {m.awayTeam?.flagEmoji}
                  </span>
                  <span className="text-xs text-slate-600">{STAGE_LABELS[m.stage] ?? m.stage}</span>
                </summary>
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <EditRow m={m} slug={slug} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function EditRow({
  m,
  slug,
}: {
  m: {
    id: string;
    homeTeam: { flagEmoji: string; name: string } | null;
    awayTeam: { flagEmoji: string; name: string } | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  };
  slug: string;
}) {
  return (
    <form action={saveResult.bind(null, slug)} className="flex items-center gap-2 text-sm">
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
      <SubmitButton className="btn-secondary shrink-0" pendingText="Saving…">
        {m.status === "finished" ? "Update" : "Save"}
      </SubmitButton>
    </form>
  );
}
