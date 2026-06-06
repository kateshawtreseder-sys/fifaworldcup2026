import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { joinPool } from "../../actions";

const JOIN_ERRORS: Record<string, string> = {
  missing: "Please enter your name and email.",
  shortpass: "Your password needs at least 4 characters.",
  exists: "That email has already joined. Log in instead (or check your password).",
  closed: "This sweepstake is now closed to new joiners.",
};

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const pool = await prisma.pool.findUnique({ where: { inviteToken: token } });
  if (!pool) notFound();

  const playerCount = await prisma.participant.count({ where: { poolId: pool.id } });
  const open = pool.status === "open";

  return (
    <main className="space-y-6">
      <header className="text-center">
        <div className="text-4xl">⚽🏆</div>
        <h1 className="mt-2 text-2xl font-bold text-pitch-900">{pool.name}</h1>
        <p className="mt-1 text-sm text-slate-600">World Cup 2026 family sweepstake</p>
      </header>

      <div className="card text-center">
        <p className="text-sm text-slate-500">Stake to play</p>
        <p className="text-3xl font-bold text-pitch-800">
          {formatMoney(pool.stakeAmount, pool.currency)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {playerCount} {playerCount === 1 ? "person has" : "people have"} joined so far.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">How it works</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Join below with your name.</li>
          <li>Pay your {formatMoney(pool.stakeAmount, pool.currency)} stake.</li>
          <li>
            Once everyone&apos;s in, the organiser draws the 48 teams out evenly between
            all players.
          </li>
          <li>Earn points as your teams win, score and progress — follow the live leaderboard!</li>
        </ol>
      </div>

      {open ? (
        <div className="card">
          <h2 className="mb-1 font-semibold">Create your account &amp; join</h2>
          <p className="mb-3 text-xs text-slate-500">
            Your email and password let you log back in any time, on any device.
          </p>
          {error && JOIN_ERRORS[error] && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {JOIN_ERRORS[error]}
            </p>
          )}
          <form action={joinPool.bind(null, token)} className="space-y-3">
            <div>
              <label className="label" htmlFor="name">
                Your name
              </label>
              <input id="name" name="name" className="input" placeholder="e.g. Auntie Sue" required />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" className="input" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Choose a password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="at least 4 characters"
                minLength={4}
                required
              />
            </div>
            <button className="btn-primary w-full">Create account &amp; join →</button>
          </form>
          <p className="mt-3 text-center text-sm text-slate-500">
            Already joined?{" "}
            <Link href={`/${pool.slug}/login`} className="font-semibold text-pitch-700 underline">
              Log in
            </Link>
          </p>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-sm text-slate-600">
            This sweepstake is closed to new joiners — the teams have already been drawn.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href={`/${pool.slug}/login`} className="btn-primary">
              Log in to your account →
            </Link>
            <Link href={`/${pool.slug}/leaderboard`} className="btn-secondary">
              View leaderboard
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
