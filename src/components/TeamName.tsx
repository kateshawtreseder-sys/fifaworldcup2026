"use client";

import { useEffect, useRef, useState } from "react";

// A team name that, when tapped, shows which player owns it. Used wherever a
// team appears so you can always find out whose team it is.
export function TeamName({
  flag,
  name,
  owner,
}: {
  flag?: string | null;
  name?: string | null;
  owner?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="underline decoration-dotted decoration-slate-300 underline-offset-2"
      >
        {flag} {name ?? "TBC"}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg">
          {owner ? `👤 ${owner}` : "Not owned by anyone"}
        </span>
      )}
    </span>
  );
}
