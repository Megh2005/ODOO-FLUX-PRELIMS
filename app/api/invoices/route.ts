import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Invoice, { DocumentType, InvoiceStatus } from "@/models/Invoice";
import Company from "@/models/Company";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
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
    const documentType = searchParams.get("documentType") || "";
    const status = searchParams.get("status") || "";
    const customerId = searchParams.get("customerId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const query: any = { companyId };

    if (search) {
      query.$and = [
        { companyId },
        {
          $or: [
            { invoiceNumber: { $regex: search, $options: "i" } },
            { "customerSnapshot.customerName": { $regex: search, $options: "i" } },
            { "customerSnapshot.companyName": { $regex: search, $options: "i" } },
          ]
        }
      ];
    }

    if (documentType && documentType !== "ALL") {
      query.documentType = documentType;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ issueDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/invoices error:", error);
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
      documentType = "TAX_INVOICE",
      invoiceNumber: customInvNum,
      customerId,
      customerSnapshot: customCustomerSnapshot,
      issueDate,
      dueDate,
      paymentTerms = "Due on Receipt",
      lineItems = [],
      freightCharges = 0,
      totalDiscount = 0,
      gstAmount = 0,
      status = "ISSUED",
      notes,
      subject,
      termsAndConditions,
      bomItems = [],
      signatoryName,
      signatoryDesignation,
    } = body;

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json({ success: false, error: "At least one line item is required" }, { status: 400 });
    }

    // Fetch company to extract business prefix
    const company = await Company.findById(companyId).lean();
    const companyName = company?.name || "";

    // Auto-generate invoice number template: [Business Prefix]-[Month of bill]-[Year of billing]-[Serial number]
    // Rule: Multi-word (has spaces) -> Initials (e.g. Somay Engineering -> SE)
    // Single word (no spaces) -> Full Name in CAPS (e.g. Manage-o-Pedia -> MANAGE-O-PEDIA)
    let invoiceNumber = customInvNum;
    if (!invoiceNumber) {
      let prefix = "MOP";
      if (companyName && companyName.trim()) {
        const words = companyName.trim().split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          const initials = words
            .map((w) => {
              const clean = w.replace(/[^a-zA-Z0-9]/g, "");
              return clean ? clean[0] : "";
            })
            .join("");
          if (initials) prefix = initials.toUpperCase();
        } else {
          const cleaned = companyName.trim().replace(/[^a-zA-Z0-9-]/g, "");
          if (cleaned) prefix = cleaned.toUpperCase();
        }
      }
      const d = issueDate ? new Date(issueDate) : new Date();
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      const month = String(validDate.getMonth() + 1).padStart(2, "0");
      const year = String(validDate.getFullYear());
      const count = await Invoice.countDocuments({ companyId, documentType });
      const sl = String(count + 1).padStart(3, "0");
      invoiceNumber = `${prefix}-${month}-${year}-${sl}`;
    }

    // Fetch customer info if customerId passed
    let customerSnapshot = customCustomerSnapshot || {};
    if (customerId && (!customerSnapshot.customerName || !customerSnapshot.email)) {
      const dbCustomer = await Customer.findOne({ _id: customerId, companyId }).lean();
      if (dbCustomer) {
        customerSnapshot = {
          customerName: dbCustomer.customerName,
          companyName: dbCustomer.companyName,
          email: dbCustomer.email,
          phone: dbCustomer.phone,
          gstin: dbCustomer.gstin,
          billingAddress: dbCustomer.billingAddress,
        };
      }
    }

    if (!customerSnapshot.phone) {
      return NextResponse.json(
        { success: false, error: "Mobile number is strictly required for all customers, invoices, and quotations" },
        { status: 400 }
      );
    }

    // Calculate line totals and subtotal
    let subTotal = 0;

    const processedLineItems = lineItems.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discountAmount) || 0;
      const lineTotal = Math.max(0, qty * price - discount);

      subTotal += qty * price;

      return {
        productId: item.productId || undefined,
        productName: item.productName,
        productDescription: item.productDescription || item.description || "",
        sku: item.sku,
        unit: item.unit || "Pcs",
        quantity: qty,
        unitPrice: price,
        discountAmount: discount,
        gstRate: item.gstRate !== undefined && item.gstRate !== "" ? Number(item.gstRate) : 18,
        totalAmount: lineTotal,
      };
    });

    const netAmount = Math.max(0, subTotal - Number(totalDiscount));
    const freight = Number(freightCharges) || 0;
    const adjustment = Number(body.adjustmentAmount) || 0;
    const adjustmentDesc = body.adjustmentDescription || "";
    // gstAmount is calculated and passed by the client
    const finalGstAmount = Number(gstAmount) || 0;
    const grandTotal = Math.round((netAmount + finalGstAmount + freight + adjustment) * 100) / 100;

    const paidAmt = status === "PAID" ? grandTotal : Number(body.paidAmount || 0);

    const invoice = await Invoice.create({
      companyId,
      documentType,
      invoiceNumber,
      customerId: customerId || undefined,
      customerSnapshot,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 86400000),
      paymentTerms,
      lineItems: processedLineItems,
      bomItems: bomItems.map((item: any) => ({
        itemName: item.itemName || "",
        specification: item.specification || "",
        quantity: Number(item.quantity) || 0,
        unit: item.unit || "Pcs",
      })),
      subTotal,
      totalDiscount: Number(totalDiscount),
      freightCharges: freight,
      adjustmentAmount: adjustment,
      adjustmentDescription: adjustmentDesc,
      gstCalculationMode: body.gstCalculationMode || "ITEMIZED",
      overallGstRate: body.overallGstRate !== undefined ? Number(body.overallGstRate) : 18,
      gstPercentage: 18, // Legacy field
      gstAmount: finalGstAmount,
      grandTotal,
      status,
      paidAmount: paidAmt,
      notes,
      subject,
      termsAndConditions,
      signatoryName: signatoryName || undefined,
      signatoryDesignation: signatoryDesignation || undefined,
      signatorySignatureUrl: body.signatorySignatureUrl || undefined,
      revisionHistory: [{ revisedAt: new Date(), changes: "Invoice Created" }],
    });

    // Deduct stock if document status is ISSUED or PAID (and for sales orders/tax invoices)
    if (status === "ISSUED" || status === "PAID") {
      for (const item of processedLineItems) {
        if (item.productId) {
          const product = await Product.findOne({ _id: item.productId, companyId });
          if (product) {
            const previousStock = product.currentStock;
            const newStock = Math.max(0, previousStock - item.quantity);

            product.currentStock = newStock;

            if (newStock <= product.minimumStockQuantity && !product.lowStockNotified) {
              sendLowStockNotificationEmail(
                companyId.toString(),
                product.productName,
                newStock,
                product.minimumStockQuantity,
                product.unit,
                product.category,
                product.sku
              );
              product.lowStockNotified = true;
            }

            await product.save();

            await StockMovement.create({
              companyId,
              productId: product._id,
              productName: product.productName,
              movementType: "INVOICE_DEDUCTION",
              quantity: item.quantity,
              previousStock,
              newStock,
              referenceId: invoice.invoiceNumber,
              notes: `Deducted via ${documentType} ${invoice.invoiceNumber}`,
            });
          }
        }
      }
    }

    // Update Customer Outstanding Balance if invoice has unpaid balance
    if (customerId && status !== "PAID" && status !== "CANCELLED" && status !== "DRAFT") {
      const remainingBalance = grandTotal - paidAmt;
      if (remainingBalance > 0) {
        await Customer.findOneAndUpdate(
          { _id: customerId, companyId },
          { $inc: { outstandingBalance: remainingBalance } }
        );
      }
    }

    await logAudit("CREATE_INVOICE", "Invoice", invoice._id.toString(), `Created ${documentType} ${invoiceNumber}`, companyId);

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/invoices error:", error);
    if (error.code === 11000 || (error.message && (error.message.includes("E11000") || error.message.includes("duplicate key")))) {
      return NextResponse.json(
        { success: false, error: "Please change the Invoice Number." },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
