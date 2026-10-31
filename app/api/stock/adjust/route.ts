import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Product from "@/models/Product";
import StockMovement, { MovementType } from "@/models/StockMovement";
import { sendLowStockNotificationEmail } from "@/lib/emailNotifications";
import { logAudit } from "@/models/AuditLog";
import { requireAuth } from "@/lib/authHelper";

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
    const { productId, movementType, quantity, notes } = body;

    if (!productId || !movementType || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Product ID, movement type, and valid positive quantity are required" },
        { status: 400 }
      );
    }

    const product = await Product.findOne({ _id: productId, companyId });
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const previousStock = product.currentStock;
    const qty = Number(quantity);
    let newStock = previousStock;

    switch (movementType as MovementType) {
      case "ADDITION":
        newStock += qty;
        break;
      case "DEDUCTION":
      case "DAMAGE":
      case "WASTAGE":
        newStock = Math.max(0, newStock - qty);
        break;
      case "ADJUSTMENT":
        newStock = qty;
        break;
      default:
        return NextResponse.json({ success: false, error: "Invalid movement type" }, { status: 400 });
    }

    const movement = await StockMovement.create({
      companyId,
      productId: product._id,
      productName: product.productName,
      movementType,
      quantity: qty,
      previousStock,
      newStock,
      notes: notes || `Stock ${movementType.toLowerCase()}`,
    });

    let lowStockNotified = product.lowStockNotified;

    if (newStock > product.minimumStockQuantity) {
      lowStockNotified = false;
    } else if (newStock <= product.minimumStockQuantity && !lowStockNotified) {
      sendLowStockNotificationEmail(
        companyId.toString(),
        product.productName,
        newStock,
        product.minimumStockQuantity,
        product.unit,
        product.category,
        product.sku
      );
      lowStockNotified = true;
    }

    product.currentStock = newStock;
    product.lowStockNotified = lowStockNotified;
    await product.save();

    await logAudit(
      `STOCK_${movementType}`,
      "Product",
      product._id.toString(),
      `Adjusted stock for ${product.productName}: ${previousStock} -> ${newStock} (${movementType})`,
      companyId
    );

    return NextResponse.json({ success: true, product, movement });
  } catch (error: any) {
    console.error("POST /api/stock/adjust error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
