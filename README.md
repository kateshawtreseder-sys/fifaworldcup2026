# World Cup 2026 Family Sweepstake ⚽🏆

A web app for running a **FIFA World Cup 2026 sweepstake** with your family: invite everyone,
collect the stakes, draw the 48 teams out **fairly**, and follow a **live leaderboard** that updates
itself as the matches are played.

Built with **Next.js (App Router) + TypeScript + Tailwind + Prisma (Postgres)**, deployed on
**Vercel** with a free **Neon** database.

---

## What it does

**For everyone (the home screen)**
- 🏆 **Leaderboard** — a top-3 podium plus the full ranking by points.
- **Results / Upcoming tabs** — results grouped by day (newest day open, older days collapsed);
  upcoming games with **BST** kick-off times.
- Players open a clean, single-scroll view; the **☰ burger menu** has My teams, All teams and Log out.
- The organiser gets the same view plus their nav buttons (Invite, Players & pay, Results, Organiser).

**Accounts**
- Players **sign up with email + password** (from the invite link) and can **log back in** on any
  device; sessions last a year. The organiser signs in with their own email + password.

**Payments**
- Tracks who's paid and the running pot. Players tap **Pay** (your Monzo/PayPal link) then **"I've
  paid"**; the organiser **confirms**. No card handling, no fees.

**The draw (fair)**
- Teams are tiered into strength pots and dealt with a **seeded snake draft**, so everyone gets a
  balanced mix and any "extra" team (when 48 doesn't divide evenly) is one of the **weakest** — so
  having 3 teams instead of 2 is **not** an advantage.

**Per player**
- **My teams** — each of your teams with its fixtures: opponent + kick-off (BST) for upcoming games,
  and score + **points gained** once played.
- **All teams** — every player and the teams they own.

**Results**
- **Auto-sync** from [football-data.org](https://www.football-data.org/) while anyone has the app
  open (throttled to ~once every 2 min), plus a manual **Sync now** button and **manual score
  entry/override**. Bundled **official group-stage schedule** fills kick-off times without the API.

**Organiser tools**
- Announcements (shown to everyone), payment confirmation, run/redo the draw, load teams & fixture
  dates, edit scores. Once a pool exists, the root URL redirects to it and the "create" form is
  hidden — so nobody can spin up a new sweepstake.

---

## Scoring (default — editable per pool in `scoringConfig`)

| Event | Points |
| --- | --- |
| Group win / draw | +3 / +1 |
| Each goal scored | +1 |
| Reach R32 / R16 / QF / SF / Final | +2 / +4 / +6 / +8 / +10 |
| Win the tournament | +15 |

A player's score = the sum across all their teams. Defaults live in `src/lib/scoring.ts`; the values
shown to players ("How scoring works" on the home page) read from the pool's config.

---

## Run locally

Uses Postgres (a free [Neon](https://neon.tech) database works for dev too).

```bash
npm install
cp .env.example .env          # then set DATABASE_URL etc.
npx prisma db push            # create the tables
npm run seed                  # load the 48 teams + group fixtures
npm run dev                   # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon **direct** URL, `?sslmode=require`) |
| `APP_SECRET` | long random string — signs session cookies |
| `NEXT_PUBLIC_BASE_URL` | public site URL — used to build invite links |
| `FOOTBALL_DATA_API_TOKEN` | free token from football-data.org — enables auto-sync (optional) |
| `SYNC_SECRET` | protects `GET /api/sync?key=…` |
| `CRON_SECRET` | (optional) for the once-a-day Vercel cron sync |

---

## Deploy (Vercel + Postgres)

No CLI needed — the build creates the tables (`prisma db push` runs in `npm run build`).

1. Create a free **Neon** Postgres DB; copy the **direct** connection string.
2. Import the repo into **Vercel**; set the env vars above.
3. Deploy. The build connects and creates the tables.
4. Visit `https://your-app.vercel.app/api/setup?key=YOUR_SYNC_SECRET` once to load the 48 teams.

> Notes: a Next.js version with a known CVE is blocked by Vercel — keep `next` patched. Vercel
> Hobby allows only a **daily** cron, so `vercel.json` schedules `/api/sync` once a day; live
> updates come from the in-app "sync while watching" instead.

---

## How a sweepstake runs

1. **Create** the pool (name, your email + organiser password, stake, payment link).
2. **Invite** the family (Invite page → WhatsApp/Telegram/copy link). They sign up + pay.
3. **Load teams** (Results page) then **Run the draw** (Draw page) — this closes joining.
4. During the tournament, results **auto-update** (with the token) or you enter them on **Results**;
   everyone follows the **leaderboard**.

---

## Key paths

- Pages: `src/app/[pool]/` — home (`page.tsx`), `me`, `all-teams`, `draw`, `participants`,
  `invite`, `login`, `organiser`, `admin` (+ `admin/results`); join at `src/app/join/[token]`.
- Logic: `src/lib/` — `scoring.ts`, `draw.ts`, `football-data.ts` (sync + `maybeAutoSync`),
  `seed.ts` (teams/fixtures), `auth.ts`, `loaders.ts`, `format.ts`, `share.ts`.
- Server actions: `src/app/actions.ts`. Data/schema: `prisma/`.

---

## Security

Family-trust-level: organiser actions are gated by a per-pool password; players are remembered by a
signed cookie. Fine for a private family pool, not hardened multi-tenant SaaS.
