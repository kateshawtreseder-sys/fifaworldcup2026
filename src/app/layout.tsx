import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Splash } from "@/components/Splash";

// iOS ignores the manifest `background_color`, so an installed PWA shows a white
// launch frame unless we supply an exact-size startup image per device. These
// solid #070b16 PNGs (regenerate via `node scripts/gen-ios-splash.mjs`) match
// the <Splash> overlay so the native launch blends into the in-app splash.
// [cssWidth, cssHeight, dpr] — keep in sync with DEVICES in the script.
const IOS_SPLASH_DEVICES: [number, number, number][] = [
  [320, 568, 2], [375, 667, 2], [414, 736, 3], [375, 812, 3],
  [414, 896, 2], [414, 896, 3], [390, 844, 3], [428, 926, 3],
  [393, 852, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3],
];

const startupImage = IOS_SPLASH_DEVICES.map(([w, h, dpr]) => ({
  url: `/splash/splash-${w * dpr}x${h * dpr}.png`,
  media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  title: "World Cup 2026 Sweepstake",
  description: "A family sweepstake for the FIFA World Cup 2026 — join, pay, get your teams, follow the live leaderboard.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WC Sweepstake",
    statusBarStyle: "black-translucent",
    startupImage,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Full-screen wallpaper. Drop a public/wallpaper.jpg in to override the
            default SVG — if it isn't there, the SVG below shows through. */}
        <Splash />
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
