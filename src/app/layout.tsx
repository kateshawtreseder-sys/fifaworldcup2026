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
        {/* Full-screen wallpaper. Drop a public/wallpaper.jpg in to override the
            default SVG — if it isn't there, the SVG below shows through. */}
        <div
          className="flex min-h-screen w-full justify-end bg-cover bg-fixed bg-center"
          style={{ backgroundImage: "url('/wallpaper.jpg'), url('/wallpaper.svg')" }}
        >
          {/* Content panel, anchored to the right over the wallpaper */}
          <div className="w-full max-w-xl bg-white/85 px-4 py-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-md lg:mr-[6vw]">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
