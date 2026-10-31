import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import StockMovement from "@/models/StockMovement";
import { requireAuth } from "@/lib/authHelper";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    const productId = searchParams.get("productId");
    const movementType = searchParams.get("movementType");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: any = { companyId };

    if (productId) {
      query.productId = productId;
    }
    if (movementType) {
      query.movementType = movementType;
    }
    if (search) {
      query.productName = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [movements, total] = await Promise.all([
      StockMovement.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      StockMovement.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
