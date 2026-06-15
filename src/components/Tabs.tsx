"use client";

import { useState } from "react";

// Simple tabbed panels. Panels are server-rendered and passed in; the first is
// the default view.
export function Tabs({ labels, panels }: { labels: string[]; panels: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              active === i
                ? "border-pitch-600 text-pitch-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {panels[active]}
    </div>
  );
}
