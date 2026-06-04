type Announcement = { id: string; message: string; createdAt: Date };

// Shown to everyone on the leaderboard / their-teams pages. Pages that include
// it already auto-refresh, so new announcements appear without a manual reload.
export function Announcements({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {items.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span className="mr-2">📣</span>
          <span className="whitespace-pre-wrap">{a.message}</span>
        </div>
      ))}
    </div>
  );
}
