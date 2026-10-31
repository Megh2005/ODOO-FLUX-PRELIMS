import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import User from "@/models/User";
import Customer from "@/models/Customer";
import { hashPassword, validateCustomerPassword } from "@/lib/authHelper";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check single account per email rule
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists" },
        { status: 400 }
      );
    }

    // Validate password policy: more than 8 chars, 1 uppercase, 1 lowercase, 1 special char
    const passwordCheck = validateCustomerPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { success: false, error: passwordCheck.error },
        { status: 400 }
      );
    }

    let numericMobile: number | undefined;
    if (phone) {
      const mobileDigits = String(phone).replace(/\D/g, "");
      if (mobileDigits.length !== 10) {
        return NextResponse.json(
          { success: false, error: "Mobile number must be strictly 10 digits" },
          { status: 400 }
        );
      }
      numericMobile = Number(mobileDigits);
      const existingUserByMobile = await User.findOne({ mobile: numericMobile });
      if (existingUserByMobile) {
        return NextResponse.json(
          { success: false, error: "An account with this mobile number already exists" },
          { status: 400 }
        );
      }
    }

    // Find any existing customer profile matching email
    const existingCustomer = await Customer.findOne({ email: cleanEmail }).lean();

    const { salt, hash } = hashPassword(password);

    const newUser = await User.create({
      email: cleanEmail,
      name: name.trim(),
      mobile: numericMobile,
      passwordHash: hash,
      salt,
      role: "CUSTOMER",
      customerId: existingCustomer?._id || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Customer account created successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
