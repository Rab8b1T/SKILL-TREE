import "server-only";
import { HttpError } from "./mongo";

/**
 * Transactional email through Resend. Only the password-reset flow uses this,
 * so it stays a single function rather than a client abstraction.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new HttpError(503, "Email is not configured");

  const from = process.env.RESET_FROM_EMAIL || "Skill Tree <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });

  if (!res.ok) {
    // Log the provider's reason; never return it to the caller.
    console.error("Resend rejected the message:", await res.text());
    throw new HttpError(502, "Could not send the email");
  }
}

export function resetEmailHtml(username: string, link: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;color:#090f15;border:1px solid #ebe8e4;border-radius:16px">
  <p style="margin:0 0 4px;font-size:15px;font-weight:600">Skill Tree</p>
  <p style="margin:0 0 24px;font-size:13px;color:#777169">Password reset</p>
  <p style="font-size:14px;line-height:1.6">Hi <strong>${escapeHtml(username)}</strong>,</p>
  <p style="font-size:14px;line-height:1.6">Use the button below to set a new password. The link expires in <strong>one hour</strong>.</p>
  <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#2b7fff;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px">Reset password</a>
  <p style="font-size:12px;color:#a59f97;line-height:1.6">Or paste this link into your browser:<br>
    <a href="${link}" style="color:#2b7fff;word-break:break-all">${link}</a>
  </p>
  <p style="font-size:12px;color:#a59f97;margin-top:28px;line-height:1.6">If you didn't request this, ignore this email — nothing has changed.</p>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
