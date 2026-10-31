import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/dbConnection";
import Invoice from "@/models/Invoice";
import Company from "@/models/Company";
import { generateInvoicePDFBuffer } from "@/lib/invoicePdfGenerator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const isCustomer = sessionUser.role === "CUSTOMER";

    let invoice: any;
    let company: any;

    if (isCustomer) {
      // Customer access: enforce strict customer data isolation
      invoice = await Invoice.findById(params.id).lean();
      if (!invoice) {
        return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
      }

      const userEmail = (sessionUser.email || "").toLowerCase().trim();
      const customerEmail = (invoice.customerSnapshot?.email || "").toLowerCase().trim();
      const isOwner =
        customerEmail === userEmail ||
        (sessionUser.customerId && invoice.customerId?.toString() === sessionUser.customerId.toString());

      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: "Access denied. You can only access your own documents." },
          { status: 403 }
        );
      }

      company = await Company.findById(invoice.companyId).lean();
    } else {
      // Business access: enforce company-level isolation
      const companyId = sessionUser.companyId;
      if (!companyId) {
        return NextResponse.json({ success: false, error: "Company profile setup required" }, { status: 403 });
      }

      invoice = await Invoice.findOne({ _id: params.id, companyId }).lean();
      if (!invoice) {
        return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
      }

      company = await Company.findById(companyId).lean();
    }

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
