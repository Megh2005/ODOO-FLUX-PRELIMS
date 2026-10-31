import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { sendLowStockNotificationEmail } from "@/lib/emailNotifications";
import { logAudit } from "@/models/AuditLog";
import { requireAuth } from "@/lib/authHelper";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const product = await Product.findOne({ _id: params.id, companyId }).lean();
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const stockHistory = await StockMovement.find({ productId: params.id, companyId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ success: true, product, stockHistory });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const product = await Product.findOne({ _id: params.id, companyId });
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const previousStock = product.currentStock;
    const newStock = body.currentStock !== undefined ? Number(body.currentStock) : previousStock;
    const minStock = body.minimumStockQuantity !== undefined ? Number(body.minimumStockQuantity) : product.minimumStockQuantity;

    let lowStockNotified = product.lowStockNotified;

    if (newStock > minStock) {
      lowStockNotified = false;
    } else if (newStock <= minStock && !lowStockNotified) {
      sendLowStockNotificationEmail(
        companyId.toString(),
        body.productName || product.productName,
        newStock,
        minStock,
        body.unit || product.unit,
        body.category || product.category
      );
      lowStockNotified = true;
    }

    if (newStock !== previousStock) {
      const stockDiff = newStock - previousStock;
      await StockMovement.create({
        companyId,
        productId: product._id,
        productName: body.productName || product.productName,
        movementType: stockDiff > 0 ? "ADDITION" : "ADJUSTMENT",
        quantity: Math.abs(stockDiff),
        previousStock,
        newStock,
        notes: body.stockAdjustmentNote || "Direct product update adjustment",
      });
    }

    product.productName = body.productName ?? product.productName;
    product.productDescription = body.productDescription ?? product.productDescription;
    product.category = body.category ?? product.category;
    product.unit = body.unit ?? product.unit;
    product.images = body.images ?? product.images;
    product.purchasePrice = body.purchasePrice !== undefined && body.purchasePrice !== "" ? Number(body.purchasePrice) : undefined;
    product.sellingPrice = body.sellingPrice !== undefined ? Number(body.sellingPrice) : product.sellingPrice;
    product.gstRate = body.gstRate !== undefined ? Number(body.gstRate) : (product.gstRate ?? 18);
    product.minimumStockQuantity = minStock;
    product.currentStock = newStock;
    product.lowStockNotified = lowStockNotified;

    await product.save();

    await logAudit("UPDATE_PRODUCT", "Product", product._id.toString(), `Updated product ${product.productName}`, companyId);

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const product = await Product.findOne({ _id: params.id, companyId });
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const productName = product.productName;

    // Permanent Hard Deletion of Product & Its Stock Movements
    await Promise.all([
      Product.deleteOne({ _id: params.id, companyId }),
      StockMovement.deleteMany({ productId: params.id, companyId }),
    ]);

    await logAudit(
      "DELETE_PRODUCT",
      "Product",
      params.id,
      `Permanently deleted product ${productName}`,
      companyId
    );

    return NextResponse.json({
      success: true,
      message: `Product ${productName} permanently deleted`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
