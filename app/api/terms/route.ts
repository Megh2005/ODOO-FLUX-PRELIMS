import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import TermTemplate from "@/models/TermTemplate";
import { requireAuth } from "@/lib/authHelper";

export async function GET() {
  try {
    await connectToDatabase();
    let companyId;
    try {
      const auth = await requireAuth();
      companyId = auth.companyId;
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (e.message === "NO_COMPANY") {
        return NextResponse.json({ success: false, error: "Company setup required", noCompany: true }, { status: 403 });
      }
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }

    const terms = await TermTemplate.find({ companyId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, terms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    let companyId;
    try {
      const auth = await requireAuth();
      companyId = auth.companyId;
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (e.message === "NO_COMPANY") {
        return NextResponse.json({ success: false, error: "Company setup required", noCompany: true }, { status: 403 });
      }
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }

    const body = await request.json();
    const { title, content, isDefault } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "Title and content are required" }, { status: 400 });
    }

    if (isDefault) {
      await TermTemplate.updateMany({ companyId }, { isDefault: false });
    }

    const term = await TermTemplate.create({ companyId, title, content, isDefault: !!isDefault });
    return NextResponse.json({ success: true, term }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
