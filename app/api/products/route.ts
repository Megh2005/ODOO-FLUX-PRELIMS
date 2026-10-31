import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { sendLowStockNotificationEmail } from "@/lib/emailNotifications";
import { logAudit } from "@/models/AuditLog";
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

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const stockStatus = searchParams.get("stockStatus") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const query: any = { companyId };

    if (search) {
      query.$and = [
        { companyId },
        {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { hsnCode: { $regex: search, $options: "i" } },
          ]
        }
      ];
    }

    if (category && category !== "ALL") {
      query.category = category;
    }

    if (stockStatus === "LOW") {
      query.$expr = { $lte: ["$currentStock", "$minimumStockQuantity"] };
    } else if (stockStatus === "OUT") {
      query.currentStock = { $lte: 0 };
    } else if (stockStatus === "IN") {
      query.$expr = { $gt: ["$currentStock", "$minimumStockQuantity"] };
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
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

    const {
      productName,
      productDescription,
      category,
      unit,
      itemType = "GOODS",
      hsnCode = "",
      images,
      purchasePrice,
      sellingPrice,
      gstRate = 18,
      minimumStockQuantity,
      currentStock,
    } = body;

    if (!productName || !category || !unit || sellingPrice === undefined) {
      return NextResponse.json(
        { success: false, error: "Product name, category, unit, and selling price are required" },
        { status: 400 }
      );
    }

    const initialStock = Number(currentStock) || 0;
    const minStock = Number(minimumStockQuantity) || 10;
    const isLowStock = initialStock <= minStock;

    const product = await Product.create({
      companyId,
      productName,
      productDescription,
      category,
      unit,
      itemType,
      hsnCode,
      images: images || [],
      purchasePrice: purchasePrice !== undefined && purchasePrice !== "" ? Number(purchasePrice) : undefined,
      sellingPrice: Number(sellingPrice),
      gstRate: Number(gstRate !== undefined ? gstRate : 18),
      minimumStockQuantity: minStock,
      currentStock: initialStock,
      lowStockNotified: isLowStock,
    });

    if (initialStock > 0) {
      await StockMovement.create({
        companyId,
        productId: product._id,
        productName: product.productName,
        movementType: "ADDITION",
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        notes: "Initial inventory setup",
      });
    }

    if (isLowStock) {
      sendLowStockNotificationEmail(
        companyId.toString(),
        product.productName,
        product.currentStock,
        product.minimumStockQuantity,
        product.unit,
        product.category
      );
    }

    await logAudit("CREATE_PRODUCT", "Product", product._id.toString(), `Created product ${productName}`, companyId);

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
