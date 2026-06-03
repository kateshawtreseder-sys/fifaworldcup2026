// Helpers for building shareable invite links and pre-filled messages.
// WhatsApp can't be automated server-side, so we generate deep links the
// organiser taps to open their own chat app with the message ready to send.

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

export function inviteUrl(inviteToken: string): string {
  return `${baseUrl()}/join/${inviteToken}`;
}

export function inviteMessage(poolName: string, stake: string, url: string): string {
  return (
    `⚽ You're invited to our "${poolName}" World Cup 2026 sweepstake!\n\n` +
    `Stake is ${stake}. Tap to join, then you'll be drawn your teams once everyone's in. ` +
    `Follow the live leaderboard as the matches play out.\n\n${url}`
  );
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function telegramShareUrl(url: string, message: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
    message
  )}`;
}

export function smsShareUrl(message: string): string {
  return `sms:?&body=${encodeURIComponent(message)}`;
}

export function emailShareUrl(subject: string, message: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    message
  )}`;
}
