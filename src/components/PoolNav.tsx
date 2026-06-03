import Link from "next/link";

export function PoolNav({
  slug,
  name,
  isAdmin,
}: {
  slug: string;
  name: string;
  isAdmin: boolean;
}) {
  return (
    <header className="mb-6 border-b border-slate-200 pb-4">
      <Link href={`/${slug}`} className="text-lg font-bold text-pitch-900">
        ⚽ {name}
      </Link>
      <nav className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href={`/${slug}/leaderboard`} className="btn-secondary">
          🏆 Leaderboard
        </Link>
        <Link href={`/${slug}/me`} className="btn-secondary">
          👤 My teams
        </Link>
        {isAdmin && (
          <>
            <Link href={`/${slug}/invite`} className="btn-secondary">
              📨 Invite
            </Link>
            <Link href={`/${slug}/participants`} className="btn-secondary">
              💷 Players &amp; pay
            </Link>
            <Link href={`/${slug}/draw`} className="btn-secondary">
              🎲 Draw
            </Link>
            <Link href={`/${slug}/admin/results`} className="btn-secondary">
              📊 Results
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
