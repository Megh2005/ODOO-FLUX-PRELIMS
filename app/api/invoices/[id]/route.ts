import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import Customer from "@/models/Customer";
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

    const invoice = await Invoice.findOne({ _id: params.id, companyId }).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
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

    const invoice = await Invoice.findOne({ _id: params.id, companyId });
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const previousStatus = invoice.status;
    const previousCustomerId = invoice.customerId;
    const previousGrandTotal = invoice.grandTotal || 0;
    const previousPaidAmount = invoice.paidAmount || 0;
    const previousLineItems = invoice.lineItems || [];

    // 1. RESTORE previous stock deductions if previous status was ISSUED or PAID or PARTIALLY_PAID
    if (previousStatus === "ISSUED" || previousStatus === "PAID" || previousStatus === "PARTIALLY_PAID") {
      for (const item of previousLineItems) {
        if (item.productId) {
          const product = await Product.findOne({ _id: item.productId, companyId });
          if (product) {
            const currentStock = product.currentStock || 0;
            product.currentStock = currentStock + item.quantity;
            if (product.currentStock > product.minimumStockQuantity) {
              product.lowStockNotified = false;
            }
            await product.save();
            await StockMovement.create({
              companyId,
              productId: product._id,
              productName: product.productName,
              movementType: "INVOICE_RESTORE",
              quantity: item.quantity,
              previousStock: currentStock,
              newStock: product.currentStock,
              referenceId: invoice.invoiceNumber,
              notes: `Restored stock due to editing ${invoice.documentType} ${invoice.invoiceNumber}`,
            });
          }
        }
      }
    }

    // 2. REVERT previous Customer outstanding balance
    if (previousCustomerId && previousStatus !== "PAID" && previousStatus !== "CANCELLED" && previousStatus !== "DRAFT") {
      const prevUnpaid = previousGrandTotal - previousPaidAmount;
      if (prevUnpaid > 0) {
        await Customer.findOneAndUpdate(
          { _id: previousCustomerId, companyId },
          { $inc: { outstandingBalance: -prevUnpaid } }
        );
      }
    }

    // 3. READ new values from request body or fall back to previous
    const documentType = body.documentType || invoice.documentType;
    const invoiceNumber = body.invoiceNumber || invoice.invoiceNumber;
    const customerId = body.customerId !== undefined ? body.customerId : invoice.customerId;
    const customerSnapshot = body.customerSnapshot || invoice.customerSnapshot;
    const issueDate = body.issueDate ? new Date(body.issueDate) : invoice.issueDate;
    const dueDate = body.dueDate ? new Date(body.dueDate) : invoice.dueDate;
    const paymentTerms = body.paymentTerms || invoice.paymentTerms;
    const notes = body.notes !== undefined ? body.notes : invoice.notes;
    const subject = body.subject !== undefined ? body.subject : invoice.subject;
    const termsAndConditions = body.termsAndConditions !== undefined ? body.termsAndConditions : invoice.termsAndConditions;
    const freightCharges = body.freightCharges !== undefined ? Number(body.freightCharges) : (invoice.freightCharges || 0);
    const adjustmentAmount = body.adjustmentAmount !== undefined ? Number(body.adjustmentAmount) : (invoice.adjustmentAmount || 0);
    const adjustmentDescription = body.adjustmentDescription !== undefined ? body.adjustmentDescription : invoice.adjustmentDescription;
    const totalDiscount = body.totalDiscount !== undefined ? Number(body.totalDiscount) : (invoice.totalDiscount || 0);
    const gstAmount = body.gstAmount !== undefined ? Number(body.gstAmount) : (invoice.gstAmount || 0);
    const lineItems = body.lineItems || invoice.lineItems;
    const bomItems = body.bomItems || invoice.bomItems || [];

    // Calculate line totals and subtotal
    let subTotal = 0;

    const processedLineItems = lineItems.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discountAmount) || 0;
      const lineTotal = Math.max(0, qty * price - discount);

      subTotal += qty * price;
      // We no longer sum line item discounts to totalDiscount, as it's passed from the client directly.

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
    const finalGstAmount = Number(gstAmount) || 0;
    const grandTotal = Math.round((netAmount + finalGstAmount + freightCharges + adjustmentAmount) * 100) / 100;

    const newStatus = body.status || previousStatus;
    let paidAmt = Number(body.paidAmount !== undefined ? body.paidAmount : invoice.paidAmount || 0);

    let finalStatus = newStatus;
    if (newStatus === "PAID") {
      paidAmt = grandTotal;
    } else if (paidAmt >= grandTotal) {
      finalStatus = "PAID";
    } else if (paidAmt > 0) {
      finalStatus = "PARTIALLY_PAID";
    }

    // 4. UPDATE fields on the invoice object
    invoice.documentType = documentType;
    invoice.invoiceNumber = invoiceNumber;
    invoice.customerId = customerId || undefined;
    invoice.customerSnapshot = customerSnapshot;
    invoice.issueDate = issueDate;
    invoice.dueDate = dueDate;
    invoice.paymentTerms = paymentTerms;
    invoice.lineItems = processedLineItems;
    invoice.subTotal = subTotal;
    invoice.totalDiscount = totalDiscount;
    invoice.freightCharges = freightCharges;
    invoice.adjustmentAmount = adjustmentAmount;
    invoice.adjustmentDescription = adjustmentDescription;
    invoice.gstCalculationMode = body.gstCalculationMode || invoice.gstCalculationMode || "ITEMIZED";
    invoice.overallGstRate = body.overallGstRate !== undefined ? Number(body.overallGstRate) : (invoice.overallGstRate || 18);
    invoice.gstPercentage = 18; // Legacy field
    invoice.gstAmount = finalGstAmount;
    invoice.grandTotal = grandTotal;
    invoice.status = finalStatus;
    invoice.paidAmount = paidAmt;
    invoice.notes = notes;
    invoice.subject = subject;
    invoice.termsAndConditions = termsAndConditions;
    invoice.signatoryName = body.signatoryName !== undefined ? body.signatoryName : invoice.signatoryName;
    invoice.signatoryDesignation = body.signatoryDesignation !== undefined ? body.signatoryDesignation : invoice.signatoryDesignation;
    invoice.signatorySignatureUrl = body.signatorySignatureUrl !== undefined ? body.signatorySignatureUrl : invoice.signatorySignatureUrl;
    invoice.bomItems = bomItems.map((item: any) => ({
      itemName: item.itemName || "",
      specification: item.specification || "",
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "Pcs",
    }));

    // 5. APPLY new stock deductions if new status is ISSUED or PAID or PARTIALLY_PAID
    if (finalStatus === "ISSUED" || finalStatus === "PAID" || finalStatus === "PARTIALLY_PAID") {
      for (const item of processedLineItems) {
        if (item.productId) {
          const product = await Product.findOne({ _id: item.productId, companyId });
          if (product) {
            const prevStock = product.currentStock;
            const newStock = Math.max(0, prevStock - item.quantity);
            product.currentStock = newStock;
            await product.save();

            await StockMovement.create({
              companyId,
              productId: product._id,
              productName: product.productName,
              movementType: "INVOICE_DEDUCTION",
              quantity: item.quantity,
              previousStock: prevStock,
              newStock,
              referenceId: invoice.invoiceNumber,
              notes: `Deducted via edited ${invoice.documentType} ${invoice.invoiceNumber}`,
            });
          }
        }
      }
    }

    // 6. APPLY new Customer outstanding balance
    if (customerId && finalStatus !== "PAID" && finalStatus !== "CANCELLED" && finalStatus !== "DRAFT") {
      const newUnpaid = grandTotal - paidAmt;
      if (newUnpaid > 0) {
        await Customer.findOneAndUpdate(
          { _id: customerId, companyId },
          { $inc: { outstandingBalance: newUnpaid } }
        );
      }
    }

    invoice.revisionHistory.push({
      revisedAt: new Date(),
      changes: body.revisionChangeNote || `Invoice Edited & Recalculated`,
    });

    await invoice.save();

    await logAudit("UPDATE_INVOICE", "Invoice", invoice._id.toString(), `Edited ${documentType} ${invoiceNumber}`, companyId);

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error("PUT /api/invoices/[id] error:", error);
    if (error.code === 11000 || (error.message && (error.message.includes("E11000") || error.message.includes("duplicate key")))) {
      return NextResponse.json(
        { success: false, error: "Please change the Invoice Number." },
        { status: 400 }
      );
    }
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

    const invoice = await Invoice.findOne({ _id: params.id, companyId });
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const num = invoice.invoiceNumber;
    await Invoice.deleteOne({ _id: params.id, companyId });

    await logAudit(
      "DELETE_INVOICE",
      "Invoice",
      params.id,
      `Permanently deleted invoice ${num}`,
      companyId
    );

    return NextResponse.json({ success: true, message: `Document ${num} permanently deleted` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
