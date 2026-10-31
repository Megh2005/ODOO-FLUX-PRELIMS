import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

export interface MailPayload {
  subject: string;
  text: string;
  html?: string;
  to?: string | string[];
  attachments?: SendMailOptions["attachments"];
}

export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let _transporter: Transporter | null = null;

// Get or initialize singleton SMTP transporter
function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Mail service: SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables must be set."
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    rateDelta: 20_000,
    rateLimit: 10,
  });

  return _transporter;
}

// Verify SMTP connection
export async function verifyTransporter(): Promise<boolean> {
  try {
    const t = getTransporter();
    await t.verify();
    return true;
  } catch (err) {
    console.error("[mailService] Transporter verification failed:", (err as Error).message);
    return false;
  }
}

// Formats email body strictly in monospace font and black & white theme
export function formatMonospaceBlackAndWhiteHtml(htmlBody?: string, textBody?: string): string {
  let content = htmlBody || "";

  if (!content && textBody) {
    const safeText = textBody
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    content = `<pre style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; color: #000000; background-color: #ffffff;">${safeText}</pre>`;
  }

  // Strip color styles from inline CSS and force monospace font + black & white theme
  content = content
    .replace(/color\s*:\s*(?!#000000|#ffffff|black|white)[^;"]+/gi, "color: #000000")
    .replace(/background(-color)?\s*:\s*(?!#000000|#ffffff|black|white)[^;"]+/gi, "background-color: #ffffff")
    .replace(/border(-color)?\s*:\s*(?!#000000|#ffffff|black|white)[^;"]+/gi, "border-color: #000000")
    .replace(/font-family\s*:\s*[^;"]+/gi, "font-family: 'Courier New', Courier, monospace");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      font-family: 'Courier New', Courier, monospace !important;
      color: #000000 !important;
    }
    body, table, td, p, div, span, strong, b, h1, h2, h3, h4, h5, h6 {
      font-family: 'Courier New', Courier, monospace !important;
      color: #000000 !important;
      background-color: #ffffff !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 16px; background-color: #ffffff; color: #000000; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.5;">
  <div style="font-family: 'Courier New', Courier, monospace; max-width: 650px; margin: 0 auto; background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 20px;">
    ${content}
  </div>
</body>
</html>`;
}

// Primary send email function
export async function sendMail(payload: MailPayload): Promise<MailResult> {
  const { subject, text, html, attachments } = payload;

  const adminEmail = process.env.NEXT_ADMIN_EMAIL;
  const to = payload.to ?? adminEmail;

  if (!to) {
    return {
      success: false,
      error: "No recipient specified and NEXT_ADMIN_EMAIL is not configured.",
    };
  }

  const fromAddress = process.env.SMTP_USER;
  if (!fromAddress) {
    return { success: false, error: "SMTP_USER is not configured." };
  }

  try {
    const transporter = getTransporter();

    // Format all outgoing email HTML in 100% Monospace Black & White theme
    const formattedHtml = formatMonospaceBlackAndWhiteHtml(html, text);

    const info = await transporter.sendMail({
      from: `"SUTRA" <${fromAddress}>`,
      to,
      subject,
      text,
      html: formattedHtml,
      ...(attachments ? { attachments } : {}),
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Never expose raw SMTP errors to callers; log internally
    const message = (err as Error).message;
    console.error("[mailService] sendMail failed:", message);
    return { success: false, error: "Failed to send email. Please try again later." };
  }
}
