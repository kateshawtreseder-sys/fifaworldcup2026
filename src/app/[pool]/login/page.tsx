import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPoolContext, getCurrentParticipant } from "@/lib/loaders";
import { redirect } from "next/navigation";
import { participantLogin } from "../../actions";

export default async function ParticipantLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ pool: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pool: slug } = await params;
  const { error } = await searchParams;
  const { pool } = await getPoolContext(slug);

  // Already logged in? Go straight to your teams.
  const me = await getCurrentParticipant(slug, pool.id);
  if (me) redirect(`/${slug}/me`);

  return (
    <main className="space-y-6">
      <header className="text-center">
        <div className="text-4xl">⚽🏆</div>
        <h1 className="mt-2 text-2xl font-extrabold brand-gradient">{pool.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to your sweepstake account</p>
      </header>

      <div className="card">
        <h2 className="mb-3 font-semibold">Log in</h2>
        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Email or password not recognised — try again.
          </p>
        )}
        <form action={participantLogin.bind(null, slug)} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" className="input" required />
          </div>
          <button className="btn-primary w-full">Log in →</button>
        </form>
        {pool.status === "open" && (
          <p className="mt-3 text-center text-sm text-slate-600">
            Not joined yet?{" "}
            <Link href={`/join/${pool.inviteToken}`} className="font-semibold text-pitch-700 underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
