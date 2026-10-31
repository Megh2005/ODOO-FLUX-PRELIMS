import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Invoice from "@/models/Invoice";
import Company from "@/models/Company";
import { generateInvoicePDFBuffer } from "@/lib/invoicePdfGenerator";
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

    const invoice = await Invoice.findOne({ _id: params.id, companyId }).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const company = await Company.findById(companyId).lean();

    const pdfBuffer = await generateInvoicePDFBuffer(invoice, company);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber || "Invoice"}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/invoices/[id]/pdf error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
