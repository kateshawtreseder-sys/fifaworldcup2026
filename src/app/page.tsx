import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createPool } from "./actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Once a sweepstake exists, the root URL (and any home-screen icon pointing at
  // it) sends people straight to it — never to the "create" form. The create
  // form only shows on a brand-new install with no pools yet.
  const pools = await prisma.pool.findMany({
    include: { _count: { select: { participants: true } } },
  });
  if (pools.length > 0) {
    const best = [...pools].sort(
      (a, b) => b._count.participants - a._count.participants || +b.createdAt - +a.createdAt
    )[0];
    redirect(`/${best.slug}`);
  }

  return (
    <main className="space-y-6">
      <header>
        <div className="text-4xl">⚽🏆</div>
        <h1 className="mt-2 text-3xl font-extrabold brand-gradient">
          World Cup 2026 Sweepstake
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Set up a family sweepstake in a minute. Invite everyone, collect the
          stakes, draw the teams, and follow a live leaderboard through the
          tournament.
        </p>
      </header>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Create your sweepstake</h2>
        <form action={createPool} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Sweepstake name
            </label>
            <input
              id="name"
              name="name"
              className="input"
              placeholder="e.g. The Shawcross Family Cup"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Your email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              required
            />
            <p className="mt-1 text-xs text-slate-600">
              You&apos;ll sign in as organiser with this email and password.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="stake">
                Stake per person (£)
              </label>
              <input
                id="stake"
                name="stake"
                type="number"
                min="1"
                step="0.5"
                defaultValue="10"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Organiser password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="min 4 characters"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="paymentLink">
              Payment link (optional)
            </label>
            <input
              id="paymentLink"
              name="paymentLink"
              className="input"
              placeholder="https://monzo.me/yourname or https://paypal.me/yourname"
            />
            <p className="mt-1 text-xs text-slate-600">
              Where people send their stake. You&apos;ll tick people off as paid.
              Leave blank and add it later.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full">
            Create sweepstake →
          </button>
        </form>
      </section>

      <p className="text-center text-xs text-slate-600">
        The organiser password protects the draw, payments and results. Keep it
        safe — anyone with it can manage the pool.
      </p>
    </main>
  );
}
