import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import User from "@/models/User";
import { hashPassword, encryptPayload } from "@/lib/authHelper";
import { sendMail } from "@/lib/mailService";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { email, mobile, password, name } = body;

    if (!email || !mobile || !password || !name) {
      return NextResponse.json({ success: false, error: "Name, email, mobile number, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const mobileDigits = String(mobile).replace(/\D/g, "");

    if (mobileDigits.length !== 10) {
      return NextResponse.json({ success: false, error: "Mobile number must be strictly 10 digits" }, { status: 400 });
    }

    const numericMobile = Number(mobileDigits);

    const existingUserByEmail = await User.findOne({ email: cleanEmail });
    if (existingUserByEmail) {
      return NextResponse.json({ success: false, error: "User already exists with this email address" }, { status: 400 });
    }

    const existingUserByMobile = await User.findOne({ mobile: numericMobile });
    if (existingUserByMobile) {
      return NextResponse.json({ success: false, error: "User already exists with this mobile number" }, { status: 400 });
    }

    const { salt, hash } = hashPassword(password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Encrypt the signup payload including OTP and expiration timestamp
    const registrationToken = encryptPayload({
      email: cleanEmail,
      mobile: numericMobile,
      name: name.trim(),
      passwordHash: hash,
      salt,
      otp,
      expiresAt,
    });

    // Send verification email via Nodemailer SMTP
    const mailResult = await sendMail({
      to: email.toLowerCase(),
      subject: "SUTRA OTP Code",
      text:
        `SUTRA VERIFICATION\n\n` +
        `Hello ${name.trim()},\n\n` +
        `Your 6-digit OTP verification code is: ${otp}\n` +
        `This code is valid for 5 minutes.\n\n` +
        `— SUTRA System`,
      html: `
        <div style="font-family:'Courier New', Courier, monospace; color:#000000; background:#ffffff; border:1px solid #000000; padding:20px; max-width:500px;">
          <h2 style="font-family:'Courier New', Courier, monospace; margin:0 0 16px 0; font-size:16px; border-bottom:1px solid #000000; padding-bottom:8px; color:#000000;">SUTRA USER REGISTRATION</h2>
          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; color:#000000;">Hello <strong>${name.trim()}</strong>,</p>
          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; color:#000000;">Thank you for registering with SUTRA.</p>
          <div style="border:1px solid #000000; padding:12px; text-align:center; margin:16px 0; background:#ffffff; color:#000000;">
            <p style="font-family:'Courier New', Courier, monospace; margin:0; font-size:12px; font-weight:bold; color:#000000;">YOUR 6-DIGIT OTP CODE:</p>
            <p style="font-family:'Courier New', Courier, monospace; margin:8px 0 0 0; font-size:24px; font-weight:bold; letter-spacing:4px; color:#000000;">${otp}</p>
          </div>
          <p style="font-family:'Courier New', Courier, monospace; margin:0 0 12px 0; font-size:11px; color:#000000;">This code will expire in 5 minutes.</p>
          <p style="font-family:'Courier New', Courier, monospace; margin:16px 0 0 0; border-top:1px solid #000000; padding-top:8px; font-size:11px; color:#000000;">Regards,<br/>SUTRA System</p>
        </div>
      `,
    });

    if (!mailResult.success) {
      return NextResponse.json({ success: false, error: mailResult.error || "Failed to dispatch verification email." }, { status: 500 });
    }

    return NextResponse.json({ success: true, otpSent: true, email: email.toLowerCase(), registrationToken });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
