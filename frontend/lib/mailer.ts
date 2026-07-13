import nodemailer from "nodemailer";

// build a gmail transport from env creds; null when unconfigured so callers can no-op instead of throwing
export function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// send the reset link; with no mail creds we just log it (dev) and report sent:false so the flow still works
export async function sendPasswordResetEmail(to: string, link: string): Promise<{ sent: boolean }> {
  const transport = getTransport();
  if (!transport) {
    console.warn("[mailer] GMAIL_USER/GMAIL_APP_PASSWORD not set — reset link (dev fallback):", link);
    return { sent: false };
  }
  const from = process.env.MAIL_FROM ?? process.env.GMAIL_USER ?? "";
  await transport.sendMail({
    from,
    to,
    subject: "Reset your RxVKG password",
    text: `Reset your RxVKG password using this link (valid for 1 hour):\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
      <h2 style="color:#365bce;margin-bottom:8px">RxVKG — Reset your password</h2>
      <p>We received a request to reset your password. Click the button below (valid for 1 hour):</p>
      <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#365bce;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Reset password</a></p>
      <p style="color:#6b7280;font-size:13px">Or copy this link into your browser:<br><span style="word-break:break-all">${link}</span></p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>`,
  });
  return { sent: true };
}
