// Money is stored in minor units (pence). Format for display.

export function formatMoney(minor: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "pool"
  );
}

export const STAGE_LABELS: Record<string, string> = {
  group: "Group stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  final: "Final",
};

// Ensure a user-entered link is treated as an external URL. Without a scheme,
// browsers treat e.g. "monzo.me/x" as a relative path on our own site.
export function externalUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
