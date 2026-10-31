import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import User from "@/models/User";
import { decryptPayload } from "@/lib/authHelper";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { otp, registrationToken } = body;

    if (!otp || !registrationToken) {
      return NextResponse.json({ success: false, error: "OTP and registration token are required" }, { status: 400 });
    }

    const payload = decryptPayload(registrationToken);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid registration token. Please try again." }, { status: 400 });
    }

    if (Date.now() > payload.expiresAt) {
      return NextResponse.json({ success: false, error: "Verification code has expired. Please register again." }, { status: 400 });
    }

    // Strictly verify the OTP code sent to the email address
    if (String(otp).trim() !== payload.otp) {
      return NextResponse.json({ success: false, error: "Invalid verification code. Please check your email and try again." }, { status: 400 });
    }

    // Double check that the user wasn't registered in the meantime
    const existingEmailUser = await User.findOne({ email: payload.email });
    if (existingEmailUser) {
      return NextResponse.json({ success: false, error: "User already exists with this email address" }, { status: 400 });
    }

    const mobileDigits = String(payload.mobile).replace(/\D/g, "");
    if (mobileDigits.length !== 10) {
      return NextResponse.json({ success: false, error: "Mobile number must be strictly 10 digits" }, { status: 400 });
    }

    const numericMobile = Number(mobileDigits);

    if (numericMobile) {
      const existingMobileUser = await User.findOne({ mobile: numericMobile });
      if (existingMobileUser) {
        return NextResponse.json({ success: false, error: "User already exists with this mobile number" }, { status: 400 });
      }
    }

    // Create the active user
    await User.create({
      email: payload.email,
      mobile: numericMobile,
      name: payload.name,
      passwordHash: payload.passwordHash,
      salt: payload.salt,
    });

    return NextResponse.json({
      success: true,
      message: "Email verified and registered successfully!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
