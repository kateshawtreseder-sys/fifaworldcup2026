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
    <header className="mb-3 border-b border-slate-200 pb-3">
      <Link href={`/${slug}`} className="text-base font-extrabold brand-gradient">
        ⚽ {name}
      </Link>
      {isAdmin && (
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={`/${slug}/leaderboard`} className="btn-secondary">
            🏆 Leaderboard
          </Link>
          <Link href={`/${slug}/me`} className="btn-secondary">
            👤 My teams
          </Link>
          <Link href={`/${slug}/admin`} className="btn-secondary">
            🛠️ Organiser
          </Link>
          <Link href={`/${slug}/invite`} className="btn-secondary">
            📨 Invite
          </Link>
          <Link href={`/${slug}/participants`} className="btn-secondary">
            💷 Players &amp; pay
          </Link>
          <Link href={`/${slug}/admin/results`} className="btn-secondary">
            📊 Results
          </Link>
        </nav>
      )}
    </header>
  );
}
