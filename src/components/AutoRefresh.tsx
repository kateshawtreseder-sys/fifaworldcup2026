"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Periodically refreshes server-rendered data so the leaderboard stays live
// during matches without a manual reload.
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
