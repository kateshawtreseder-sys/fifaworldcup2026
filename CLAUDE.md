# CLAUDE.md

Orientation for working on this repo with Claude Code. See `README.md` for the full product write-up.

## What this is
A **FIFA World Cup 2026 family sweepstake** web app. Next.js (App Router) + TypeScript + Tailwind +
Prisma (Postgres). Deployed on **Vercel**, database on **Neon**. The tournament is **live**, so the
production database holds **real family data** — be careful with anything destructive.

## Workflow
- Develop on branch **`claude/friendly-bohr-Ddjs0`**; commit + push there. Don't open PRs unless asked.
- Vercel auto-deploys on push. The build runs `prisma generate && prisma db push && next build`, so
  **schema changes are applied to prod on deploy** (additive changes are safe; avoid destructive ones).
- This sandbox's network egress is allowlisted — you **cannot** `curl` the live `*.vercel.app` site.
  `raw.githubusercontent.com` and web search/fetch tools work.

## Commands
```bash
npm run dev                          # local dev
npx prisma generate && npx next build  # verify it compiles WITHOUT touching a DB (preferred check)
npm run build                        # full build incl. `prisma db push` (needs a reachable Postgres)
npm run seed                         # load 48 teams + group fixtures (local)
```
To run logic checks quickly: `npx tsx -e '...'` importing from `src/lib/*` (used throughout for
draw/scoring sanity checks). For a local DB, temporarily switch `prisma/schema.prisma` provider to
`sqlite` + `DATABASE_URL=file:./x.db`, then **restore to `postgresql` before committing**.

## Architecture
- **Pages** `src/app/[pool]/`: `page.tsx` (home = leaderboard + Results/Upcoming tabs, for players &
  organiser), `me` (My teams + fixtures), `all-teams`, `draw`, `participants` (pay), `invite`,
  `login` (player), `organiser` (admin login), `admin` (organiser panel) + `admin/results`.
  Join flow at `src/app/join/[token]`. Root `src/app/page.tsx` redirects to the pool (most players).
- **Server actions**: `src/app/actions.ts` (createPool, join/login/logout, setPaid/claimPaid, draw,
  saveResult, announcements, loadTeams, loadFixtureDates, syncNow, …).
- **Lib** `src/lib/`: `scoring.ts` (`buildLeaderboard`, `pointsForTeam`, `pointsForTeamInMatch`,
  `DEFAULT_SCORING`), `draw.ts` (seeded snake draft), `football-data.ts` (`syncFromFootballData`,
  `maybeAutoSync`), `seed.ts` (`seedTeamsAndFixtures`, `importFixtureDates`), `auth.ts`,
  `loaders.ts`, `format.ts`, `share.ts`.
- **Data**: `prisma/schema.prisma`; `prisma/data/teams.ts` (48 teams + `TEAM_POT` strength tiers),
  `prisma/data/fixtures.ts` (official group schedule with UTC kick-offs).
- **Client components**: `LeaderboardView` (has a `compact` podium-only mode), `Tabs`, `BurgerMenu`,
  `SubmitButton` (useFormStatus loading state), `AutoRefresh`, `CopyButton`, `Announcements`.

## Conventions
- Pages that read cookies/DB use `export const dynamic = "force-dynamic"`.
- Auth is per-pool and cookie-based (`src/lib/auth.ts`): `admin` = organiser; participant = player.
- Money stored in **pence**; format with `formatMoney`. Dates/times shown in **BST** via
  `Intl.DateTimeFormat(..., { timeZone: "Europe/London", timeZoneName: "short" })`.
- Scoring must stay consistent: `sum(pointsForTeamInMatch over a team's matches) === pointsForTeam`.
- Auto-sync runs via `after(() => maybeAutoSync())` on player-facing pages; throttled by the
  `SyncState` row (~2 min). Needs `FOOTBALL_DATA_API_TOKEN` (already set in prod).

## Gotchas
- **Vercel blocks deploys on a vulnerable `next` version** — keep `next` patched (we're on 15.5.x).
- **`seedTeamsAndFixtures` is destructive** (wipes teams/matches/assignments, reopens the pool) —
  used by `loadTeams` and `/api/setup`. **`importFixtureDates` is non-destructive** (only sets
  kick-offs) — used by `loadFixtureDates`. Don't conflate them mid-tournament.
- Sync **skips matches with `manualEdit = true`** so organiser corrections are never overwritten.
  Manually-entered matches have **no kick-off** unless `loadFixtureDates`/sync sets it — that drove
  the "results dated today" bug; results are dated by `kickoff ?? updatedAt`.
- Env vars: `DATABASE_URL` (Neon **direct**, not pooled, `?sslmode=require`), `APP_SECRET`,
  `NEXT_PUBLIC_BASE_URL`, `SYNC_SECRET`, `FOOTBALL_DATA_API_TOKEN`, optional `CRON_SECRET`.
- Never put secrets in code/commits. Never commit a sqlite provider switch.
