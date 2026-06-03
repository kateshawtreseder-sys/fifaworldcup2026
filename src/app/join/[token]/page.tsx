import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { joinPool } from "../../actions";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
          <h2 className="mb-3 font-semibold">Join the sweepstake</h2>
          <form action={joinPool.bind(null, token)} className="space-y-3">
            <div>
              <label className="label" htmlFor="name">
                Your name
              </label>
              <input id="name" name="name" className="input" placeholder="e.g. Auntie Sue" required />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email (optional)
              </label>
              <input id="email" name="email" type="email" className="input" placeholder="so you can be reminded" />
            </div>
            <button className="btn-primary w-full">Count me in →</button>
          </form>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-sm text-slate-600">
            This sweepstake is closed to new joiners — the teams have already been drawn.
          </p>
          <Link href={`/${pool.slug}/leaderboard`} className="btn-primary mt-3">
            View the leaderboard →
          </Link>
        </div>
      )}
    </main>
  );
}
