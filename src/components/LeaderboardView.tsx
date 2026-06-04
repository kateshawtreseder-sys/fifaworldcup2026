"use client";

import { useState } from "react";

export type TeamRow = {
  name: string;
  flag: string;
  points: number;
  champion: boolean;
  eliminated: boolean;
  reached: string; // furthest stage label, or ""
};

export type PlayerRow = {
  participantId: string;
  name: string;
  points: number;
  isMe: boolean;
  teams: TeamRow[];
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardView({ rows }: { rows: PlayerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-500">No players yet.</div>
    );
  }

  const top = rows.slice(0, 3);
  const leader = rows[0];

  return (
    <div>
      {/* Podium */}
      {rows.length >= 2 && (
        <div className="mb-5 grid grid-cols-3 items-end gap-2">
          {[1, 0, 2].map((idx) => {
            const r = top[idx];
            if (!r) return <div key={idx} />;
            const heights = ["h-20", "h-28", "h-16"]; // 2nd, 1st, 3rd
            const order = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            return (
              <div key={r.participantId} className="flex flex-col items-center">
                <div className="mb-1 text-2xl">{MEDALS[idx]}</div>
                <div className="max-w-full truncate text-center text-sm font-semibold">
                  {r.name}
                </div>
                <div className="text-xs text-slate-500">{r.points} pts</div>
                <div
                  className={`mt-1 w-full rounded-t-lg ${heights[order]} ${
                    idx === 0
                      ? "bg-yellow-300"
                      : idx === 1
                        ? "bg-slate-300"
                        : "bg-amber-600/70"
                  } ${r.isMe ? "ring-2 ring-pitch-600" : ""}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <Row key={r.participantId} row={r} rank={i + 1} gap={leader.points - r.points} />
        ))}
      </ol>
    </div>
  );
}

function Row({ row, rank, gap }: { row: PlayerRow; rank: number; gap: number }) {
  const [open, setOpen] = useState(false);
  const alive = row.teams.filter((t) => !t.eliminated).length;

  return (
    <li className={`card !p-0 overflow-hidden ${row.isMe ? "ring-2 ring-pitch-600" : ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 text-center text-lg font-bold text-slate-500">
            {rank <= 3 ? MEDALS[rank - 1] : rank}
          </span>
          <div>
            <p className="font-semibold">
              {row.name}
              {row.isMe && <span className="ml-2 text-xs text-pitch-700">(you)</span>}
            </p>
            <p className="text-xs text-slate-500">
              {row.teams.map((t) => t.flag).join(" ")}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {alive}/{row.teams.length} teams still in
              {rank > 1 && gap > 0 && ` · ${gap} behind leader`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-pitch-800">{row.points}</span>
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <ul className="space-y-1">
            {[...row.teams]
              .sort((a, b) => b.points - a.points)
              .map((t) => (
                <li
                  key={t.name}
                  className={`flex items-center justify-between text-sm ${
                    t.eliminated ? "text-slate-400 line-through" : ""
                  }`}
                >
                  <span>
                    {t.flag} {t.name}
                    {t.champion && <span className="ml-1">🏆</span>}
                    {!t.champion && t.reached && !t.eliminated && (
                      <span className="ml-2 rounded bg-pitch-100 px-1.5 py-0.5 text-[10px] font-medium text-pitch-800">
                        {t.reached}
                      </span>
                    )}
                    {t.eliminated && <span className="ml-1 text-[10px]">out</span>}
                  </span>
                  <span className="font-semibold">{t.points} pts</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </li>
  );
}
