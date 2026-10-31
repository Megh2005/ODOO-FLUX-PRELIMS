import { NextRequest, NextResponse } from "next/server";
import { sendMail, verifyTransporter } from "@/lib/mailService";

interface SendEmailRequestBody {
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  to?: unknown;
  attachments?: unknown;
}

// Strip control characters and trim whitespace
function sanitizeString(value: unknown, maxLength = 2000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: SendEmailRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const subject = sanitizeString(body.subject, 500);
  const text = sanitizeString(body.text, 20_000);

  if (!subject) {
    return NextResponse.json(
      { success: false, message: "Field 'subject' is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { success: false, message: "Field 'text' is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  const html =
    typeof body.html === "string" && body.html.trim()
      ? body.html.trim().slice(0, 500_000)
      : undefined;

  let to: string | string[] | undefined;
  if (body.to !== undefined && body.to !== null && body.to !== "") {
    if (typeof body.to === "string") {
      const cleaned = body.to.trim();
      if (!isValidEmail(cleaned)) {
        return NextResponse.json(
          { success: false, message: `Invalid recipient email address: "${cleaned}".` },
          { status: 400 }
        );
      }
      to = cleaned;
    } else if (Array.isArray(body.to)) {
      const addresses = (body.to as unknown[]).filter(
        (e): e is string => typeof e === "string" && isValidEmail(e.trim())
      );
      if (addresses.length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid recipient email addresses provided." },
          { status: 400 }
        );
      }
      to = addresses.map((e) => e.trim());
    } else {
      return NextResponse.json(
        { success: false, message: "Field 'to' must be a string or an array of strings." },
        { status: 400 }
      );
    }
  }

  const attachments = Array.isArray(body.attachments)
    ? (body.attachments as object[])
    : undefined;

  const transporterOk = await verifyTransporter();
  if (!transporterOk) {
    console.error("[/api/send-email] Transporter verification failed – aborting send.");
    return NextResponse.json(
      { success: false, message: "Mail service is currently unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const result = await sendMail({ subject, text, html, to, attachments });

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Failed to send email." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Email sent successfully.",
      messageId: result.messageId,
    },
    { status: 200 }
  );
}

export function GET() {
  return NextResponse.json(
    { success: false, message: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
