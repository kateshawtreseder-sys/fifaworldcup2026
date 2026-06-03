import { redirect } from "next/navigation";
import { getPoolContext } from "@/lib/loaders";
import { formatMoney } from "@/lib/format";
import {
  inviteUrl,
  inviteMessage,
  whatsappShareUrl,
  telegramShareUrl,
  smsShareUrl,
  emailShareUrl,
} from "@/lib/share";
import { PoolNav } from "@/components/PoolNav";
import { CopyButton } from "@/components/CopyButton";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = await params;
  const { pool, admin } = await getPoolContext(slug);
  if (!admin) redirect(`/${slug}`);

  const url = inviteUrl(pool.inviteToken);
  const stake = formatMoney(pool.stakeAmount, pool.currency);
  const message = inviteMessage(pool.name, stake, url);

  return (
    <main>
      <PoolNav slug={slug} name={pool.name} isAdmin={admin} />

      <div className="card mb-4">
        <h1 className="mb-2 text-lg font-semibold">Invite the family</h1>
        <p className="text-sm text-slate-600">
          Tap a button below to open the app with the message ready, then send it to your
          family group. (WhatsApp can&apos;t post to a group automatically — this opens your
          WhatsApp with everything pre-filled so you just hit send.)
        </p>
      </div>

      <div className="card mb-4">
        <label className="label">Invite link</label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded bg-slate-100 px-3 py-2 text-xs">{url}</code>
          <CopyButton value={url} label="Copy link" />
        </div>
      </div>

      <div className="card mb-4">
        <label className="label">Share to…</label>
        <div className="flex flex-wrap gap-2">
          <a className="btn-primary" href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer">
            💬 WhatsApp
          </a>
          <a className="btn-secondary" href={telegramShareUrl(url, message)} target="_blank" rel="noopener noreferrer">
            ✈️ Telegram
          </a>
          <a className="btn-secondary" href={smsShareUrl(message)}>
            📱 SMS
          </a>
          <a className="btn-secondary" href={emailShareUrl(`Join "${pool.name}" sweepstake`, message)}>
            ✉️ Email
          </a>
        </div>
      </div>

      <div className="card">
        <label className="label">Message preview</label>
        <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-700">{message}</pre>
        <div className="mt-2">
          <CopyButton value={message} label="Copy message" />
        </div>
      </div>
    </main>
  );
}
