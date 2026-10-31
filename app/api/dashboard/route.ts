import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Product from "@/models/Product";
import Invoice from "@/models/Invoice";
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

    // Inventory Valuations
    const products = await Product.find({ companyId }).lean();
    let totalPurchaseValuation = 0;

    for (const p of products) {
      totalPurchaseValuation += (p.currentStock || 0) * (p.purchasePrice || 0);
    }

    // Actual Sales Revenue (TAX_INVOICE with ISSUED, PAID, PARTIALLY_PAID status)
    const salesInvoices = await Invoice.find({
      companyId,
      documentType: "TAX_INVOICE",
      status: { $in: ["ISSUED", "PAID", "PARTIALLY_PAID"] }
    }).select("grandTotal paidAmount status").lean();

    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    for (const inv of salesInvoices) {
      const gTotal = Number(inv.grandTotal || 0);
      let pAmt = Number(inv.paidAmount || 0);
      if (inv.status === "PAID") {
        pAmt = gTotal;
      }
      const dAmt = Math.max(0, gTotal - pAmt);

      totalSales += gTotal;
      totalPaid += pAmt;
      totalDue += dAmt;
    }

    // Recent Invoices
    const recentInvoices = await Invoice.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      stats: {
        totalProductsCount: products.length,
        totalPurchaseValuation,
        totalSales,
        totalPaid,
        totalDue,
      },
      recentInvoices,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
