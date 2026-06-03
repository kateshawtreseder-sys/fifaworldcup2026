import Link from "next/link";

export default function NotFound() {
  return (
    <main className="space-y-4 py-16 text-center">
      <div className="text-4xl">🤷‍♂️⚽</div>
      <h1 className="text-xl font-bold">Not found</h1>
      <p className="text-sm text-slate-600">
        That sweepstake or invite link doesn&apos;t exist (or has been removed).
      </p>
      <Link href="/" className="btn-primary">
        Start a new sweepstake →
      </Link>
    </main>
  );
}
