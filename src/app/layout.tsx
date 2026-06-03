import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup 2026 Sweepstake",
  description: "A family sweepstake for the FIFA World Cup 2026 — join, pay, get your teams, follow the live leaderboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-3xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
