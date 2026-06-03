# World Cup 2026 Family Sweepstake ⚽🏆

A small web app for running a **FIFA World Cup 2026 sweepstake** with your family:
invite everyone, collect the stakes, draw the 48 teams out evenly, and follow a
**live leaderboard** as the matches are played.

## What it does

- **Invites** — generates a shareable join link plus a pre-filled message you can
  send straight to **WhatsApp**, **Telegram**, SMS or email. (More on WhatsApp below.)
- **Payments** — tracks who's paid and shows the running pot. You collect the money
  via your own **Monzo.me / PayPal.me** link; no card handling, no fees, no
  gambling-licence worries. Tick people off as they pay.
- **The draw** — once everyone's in, one click randomly shares all 48 teams between
  the players as evenly as possible (e.g. 5 players → 10/10/10/9/9). The draw uses a
  stored random **seed** so it's fair and reproducible.
- **Live leaderboard** — players earn points as their teams win, score and progress
  through the rounds. Results come in automatically from a free football API, or you
  can type them in by hand.

### A note on WhatsApp

WhatsApp **can't** be automated to post into a normal group chat — that needs Meta's
paid WhatsApp Business API with verification and approved templates, and it still
can't message an ordinary family group. So instead the app builds the invite link and
message for you and opens WhatsApp with it ready to send. If you want *automatic*
reminders/results posted to a group, **Telegram** supports that for free (a Telegram
bot could be added later).

## Scoring (default — editable)

Per team a player owns:

| Event | Points |
| --- | --- |
| Group-stage win | +3 |
| Group-stage draw | +1 |
| Each goal scored | +1 |
| Reach Round of 32 | +2 |
| Reach Round of 16 | +4 |
| Reach Quarter-final | +6 |
| Reach Semi-final | +8 |
| Reach Final | +10 |
| Win the tournament | +15 (bonus) |

A player's score is the sum across all their teams. Weights live in each pool's
`scoringConfig` (defaults in `src/lib/scoring.ts`).

## Tech

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Prisma** ORM — SQLite for local dev, Postgres for production
- Server Actions for all mutations; a cron-friendly `/api/sync` route for results

## Run it locally

Local dev uses the same Postgres database as production. The quickest way is to
point `DATABASE_URL` at a free [Neon](https://neon.tech) database (you can use a
separate Neon branch/db for dev).

```bash
npm install
cp .env.example .env          # then edit .env with your Neon DATABASE_URL
npx prisma db push            # creates the tables
npm run seed                  # loads the 48 teams + group fixtures
npm run dev                   # http://localhost:3000
```

Then open <http://localhost:3000>, create a sweepstake, and you're away.

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` locally; a Postgres URL in production |
| `APP_SECRET` | long random string used to sign session cookies |
| `NEXT_PUBLIC_BASE_URL` | public URL, used to build invite links |
| `FOOTBALL_DATA_API_TOKEN` | free token from <https://www.football-data.org/> (optional — manual entry works without it) |
| `SYNC_SECRET` | shared secret protecting `GET /api/sync?key=…` |

## How a sweepstake runs

1. **Create** a pool on the home page (name, stake, organiser password, payment link).
2. **Invite** the family from the Invite page (WhatsApp/Telegram/copy link).
3. Family **join** via the link and **pay** your Monzo/PayPal link; mark them paid on
   the Players page.
4. **Run the draw** — teams are shared out and the pool closes to new joiners.
5. **Results** flow in via Sync (or enter them on the Results page); everyone watches
   the **Leaderboard**.

## Results sync

- **Manual:** Results page → type scores → Save. A saved score is marked as a manual
  edit and won't be overwritten by a later sync.
- **Automatic:** with `FOOTBALL_DATA_API_TOKEN` set, hit "Sync now" on the Results
  page, or let the Vercel Cron (`vercel.json`, every 30 min) call `/api/sync`.
- Knockout fixtures can be added on the Results page as the bracket fills in.

## Deploy (Vercel + Postgres)

No command line needed — the build creates the database tables automatically
(`prisma db push` runs as part of `npm run build`).

1. Create a free Postgres database (e.g. **Neon**) and copy its connection string.
2. Import the repo into **Vercel** and set the environment variables above
   (`DATABASE_URL`, `APP_SECRET`, `NEXT_PUBLIC_BASE_URL`, `SYNC_SECRET`, and
   optionally `FOOTBALL_DATA_API_TOKEN` and a `CRON_SECRET`).
3. Deploy. The build connects to the database and creates the tables.
4. Load the teams once by visiting `https://your-app.vercel.app/api/setup?key=YOUR_SYNC_SECRET`.

That's it — open the site and create your sweepstake.

## Security

This is **family-trust-level** security: organiser actions are gated by a per-pool
password, and players are remembered by a signed cookie on their device. It's not
built to withstand a determined attacker — fine for a private family pool, not for
handling strangers' money.
