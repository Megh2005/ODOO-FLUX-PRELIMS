import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User";
import Company from "@/models/Company";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get active NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    }

    let company = null;
    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        mobile: user.mobile ? String(user.mobile) : "",
        name: user.name,
        role: user.role || "BUSINESS",
        companyId: user.companyId,
        customerId: user.customerId,
      },
      company,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
