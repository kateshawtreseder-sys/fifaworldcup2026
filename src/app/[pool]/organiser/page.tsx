import Link from "next/link";
import { redirect } from "next/navigation";
import { getPoolContext } from "@/lib/loaders";
import { adminLogin } from "../../actions";

export const dynamic = "force-dynamic";

export default async function OrganiserLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ pool: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { pool: slug } = await params;
  const { error } = await searchParams;
  const { pool, admin } = await getPoolContext(slug);
  if (admin) redirect(`/${slug}`);

  return (
    <main className="space-y-6">
      <header className="text-center">
        <div className="text-4xl">🛠️</div>
        <h1 className="mt-2 text-2xl font-extrabold brand-gradient">{pool.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Organiser sign in</p>
      </header>

      <div className="card">
        <p className="mb-3 text-sm text-slate-600">
          Sign in with your organiser email and password to manage payments, run the draw, and enter
          results.
        </p>
        {error === "badpass" && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Email or password not recognised — try again.
          </p>
        )}
        <form action={adminLogin.bind(null, slug)} className="space-y-2">
          <input name="email" type="email" className="input" placeholder="Organiser email" required />
          <input name="password" type="password" className="input" placeholder="Organiser password" required />
          <button className="btn-primary w-full">Sign in</button>
        </form>
      </div>

      <p className="text-center text-sm">
        <Link href={`/${slug}`} className="text-slate-600 underline">
          ← Back to the sweepstake
        </Link>
      </p>
    </main>
  );
}
