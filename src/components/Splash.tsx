"use client";

import { useEffect, useState } from "react";

export function Splash() {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1200);
    const t2 = setTimeout(() => setGone(true), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b16] transition-opacity duration-500 ${fading ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="animate-bounce text-7xl leading-none">⚽</span>
        <h1 className="brand-gradient text-3xl font-extrabold">
          World Cup 2026
        </h1>
        <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase">
          Sweepstake
        </p>
      </div>
    </div>
  );
}
