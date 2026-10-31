import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/dbConnection";
import User from "@/models/User";
import { sendMail } from "@/lib/mailService";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // Respond positively even if user is not found to prevent email harvesting
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been dispatched.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    // Construct password reset link
    const origin =
      request.headers.get("origin") ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

    // Dispatch notification via Nodemailer with strict monospace and black & white theme
    await sendMail({
      to: cleanEmail,
      subject: "SUTRA Password Reset Request",
      text:
        `SUTRA - PASSWORD RESET REQUEST\n\n` +
        `Hello ${user.name},\n\n` +
        `We received a request to reset your SUTRA account password.\n` +
        `Click or copy the following link into your browser to complete your password reset:\n\n` +
        `${resetUrl}\n\n` +
        `This link is valid for 1 hour.\n` +
        `If you did not request this, you can safely disregard this message.\n\n` +
        `— SUTRA Security System`,
      html: `
        <div style="font-family:'Courier New', Courier, monospace; color:#000000; background:#ffffff; border:1px solid #000000; padding:20px; max-width:550px;">
          <h2 style="font-family:'Courier New', Courier, monospace; margin:0 0 16px 0; font-size:16px; border-bottom:1px solid #000000; padding-bottom:8px; color:#000000;">SUTRA PASSWORD RECOVERY</h2>
          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; color:#000000;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 16px 0; color:#000000;">A request was submitted to reset your account password.</p>
          
          <div style="border:1px solid #000000; padding:16px; text-align:center; margin:16px 0; background:#ffffff;">
            <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; font-size:12px; font-weight:bold; color:#000000;">SECURE PASSWORD RESET LINK:</p>
            <a href="${resetUrl}" style="display:inline-block; font-family:'Courier New', Courier, monospace; background:#000000; color:#ffffff; padding:10px 20px; text-decoration:none; font-weight:bold; font-size:13px; border:1px solid #000000;">RESET PASSWORD</a>
            <p style="font-family:'Courier New', Courier, monospace; margin:12px 0 0 0; font-size:11px; word-break:break-all; color:#000000;">${resetUrl}</p>
          </div>

          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; font-size:11px; color:#000000;">This link will expire in 60 minutes.</p>
          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; font-size:11px; color:#000000;">If you did not make this request, no further action is required.</p>
          <p style="font-family:'Courier New', Courier, monospace; margin:16px 0 0 0; border-top:1px solid #000000; padding-top:8px; font-size:11px; color:#000000;">Regards,<br/>SUTRA Security System</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been dispatched.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
