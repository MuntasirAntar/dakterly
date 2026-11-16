import nodemailer from "nodemailer";

export const WEBSITE_PARTNER_EMAIL = process.env.PARTNER_NOTIFICATION_EMAIL?.trim() || "antar2390@gmail.com";

export type PartnershipEmailPayload = {
  referenceId: string;
  clinicName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  doctorCount?: string | null;
  message?: string | null;
  createdAt: string;
};

export type EmailSendResult =
  | { sent: true; provider: "resend" | "smtp" }
  | { sent: false; reason: string };

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailContent(payload: PartnershipEmailPayload) {
  const subject = `[Dakterly] Partnership Request: ${payload.clinicName} (${payload.city}) — ${payload.referenceId}`;

  const text = [
    "New Clinic Partnership Request on Dakterly",
    "",
    `Reference ID: ${payload.referenceId}`,
    `Submitted At: ${payload.createdAt}`,
    "",
    `Clinic Name: ${payload.clinicName}`,
    `Contact Person: ${payload.contactName}`,
    `Official Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `City: ${payload.city}`,
    `Active Doctors: ${payload.doctorCount || "Not specified"}`,
    "",
    "Specialties & Notes:",
    payload.message || "None provided",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.5;">
      <div style="background:#0f766e;color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#a7f3d0;">Dakterly Clinic Onboarding</p>
        <h1 style="margin:6px 0 0;font-size:20px;">New Partnership Request</h1>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:0;padding:20px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
        <p style="margin:0 0 16px;">Reference: <strong>${escapeHtml(payload.referenceId)}</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#64748b;width:150px;">Clinic Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(payload.clinicName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Contact Person</td><td style="padding:6px 0;">${escapeHtml(payload.contactName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;">${escapeHtml(payload.phone)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">City</td><td style="padding:6px 0;">${escapeHtml(payload.city)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Active Doctors</td><td style="padding:6px 0;">${escapeHtml(payload.doctorCount || "Not specified")}</td></tr>
        </table>
        <div style="margin-top:16px;padding:12px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#475569;">Specialties &amp; Notes</p>
          <p style="margin:0;font-size:14px;white-space:pre-wrap;">${escapeHtml(payload.message || "None provided")}</p>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export async function sendPartnershipNotificationEmail(payload: PartnershipEmailPayload): Promise<EmailSendResult> {
  const to = WEBSITE_PARTNER_EMAIL;
  const { subject, text, html } = buildEmailContent(payload);

  // Option 1: Resend API (zero-config HTTP delivery when RESEND_API_KEY is set)
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM?.trim() || "Dakterly <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: payload.email,
          subject,
          text,
          html,
        }),
      });
      if (res.ok) {
        return { sent: true, provider: "resend" };
      }
      const errBody = await res.text().catch(() => "");
      console.warn("[Dakterly] Resend email failed:", res.status, errBody);
    } catch (err) {
      console.warn("[Dakterly] Resend email error:", err);
    }
  }

  // Option 2: SMTP (works with Gmail App Password or any SMTP relay)
  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)?.trim();
  if (smtpUser && smtpPass) {
    try {
      const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
      const port = Number(process.env.SMTP_PORT || "465");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM?.trim() || `"Dakterly Partnerships" <${smtpUser}>`,
        to,
        replyTo: payload.email,
        subject,
        text,
        html,
      });
      return { sent: true, provider: "smtp" };
    } catch (err) {
      console.warn("[Dakterly] SMTP email error:", err);
      return { sent: false, reason: "smtp_failed" };
    }
  }

  console.info(`[Dakterly] Partnership inquiry ${payload.referenceId} saved for Super Admin (email transport not configured).`);
  return { sent: false, reason: "not_configured" };
}
