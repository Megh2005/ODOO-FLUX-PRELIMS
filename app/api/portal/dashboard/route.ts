import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/dbConnection";
import User from "@/models/User";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    }

    const userEmail = (user.email || "").toLowerCase().trim();

    // Query customer profiles linked to this email or user record
    const customerFilter: any = {
      $or: [{ email: userEmail }],
    };
    if (user.customerId) {
      customerFilter.$or.push({ _id: user.customerId });
    }

    const customerProfiles = await Customer.find(customerFilter).lean();
    const primaryCustomer = customerProfiles[0] || null;

    const customerIds = customerProfiles.map((c) => c._id);
    if (user.customerId && !customerIds.some((id) => id.toString() === user.customerId?.toString())) {
      customerIds.push(user.customerId);
    }

    // Strict customer-level data isolation: query documents solely matching this customer
    const invoiceQuery: any = {
      $or: [
        { "customerSnapshot.email": userEmail },
      ],
    };
    if (customerIds.length > 0) {
      invoiceQuery.$or.push({ customerId: { $in: customerIds } });
    }

    const allDocuments = await Invoice.find(invoiceQuery)
      .sort({ issueDate: -1, createdAt: -1 })
      .select("-bomItems") // Strip internal bill-of-materials from customer view
      .lean();

    // Categorize documents for dedicated customer views
    const quotations = allDocuments.filter(
      (d) => d.documentType === "QUOTATION" || d.documentType === "ESTIMATE"
    );

    const invoices = allDocuments.filter(
      (d) => d.documentType === "TAX_INVOICE" || d.documentType === "SALES_ORDER" || d.documentType === "DELIVERY_CHALLAN"
    );

    const paymentRecords = allDocuments
      .filter((d) => (d.paidAmount || 0) > 0)
      .map((d) => ({
        invoiceId: d._id,
        invoiceNumber: d.invoiceNumber,
        documentType: d.documentType,
        issueDate: d.issueDate,
        grandTotal: d.grandTotal,
        paidAmount: d.paidAmount,
        status: d.status,
        paymentTerms: d.paymentTerms,
      }));

    // Subscriptions: extract active subscriptions / recurring billing contracts
    const subscriptions = allDocuments
      .filter(
        (d) =>
          d.paymentTerms?.toLowerCase().includes("month") ||
          d.paymentTerms?.toLowerCase().includes("annual") ||
          d.paymentTerms?.toLowerCase().includes("year") ||
          d.paymentTerms?.toLowerCase().includes("recurring") ||
          d.paymentTerms?.toLowerCase().includes("quarter") ||
          d.lineItems?.some((item: any) =>
            (item.productName || "").toLowerCase().includes("subscription") ||
            (item.productName || "").toLowerCase().includes("plan") ||
            (item.productName || "").toLowerCase().includes("license") ||
            (item.productName || "").toLowerCase().includes("maintenance")
          )
      )
      .map((d) => {
        const primaryItem = d.lineItems?.[0];
        return {
          id: d._id,
          contractNumber: d.invoiceNumber,
          planName: primaryItem?.productName || "Standard Enterprise Subscription",
          interval: d.paymentTerms || "Monthly Billing",
          amount: d.grandTotal,
          status: d.status === "CANCELLED" ? "CANCELLED" : "ACTIVE",
          startDate: d.issueDate,
          renewalDate: d.dueDate,
          itemsCount: d.lineItems?.length || 1,
        };
      });

    // Compute customer aggregate financial summary
    const taxInvoices = allDocuments.filter((d) => d.documentType === "TAX_INVOICE");
    const totalInvoiced = taxInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
    const totalPaid = taxInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
    const totalDue = Math.max(0, totalInvoiced - totalPaid);

    // Consolidated customer profile info
    const accountInfo = {
      name: user.name || primaryCustomer?.customerName || "",
      email: user.email,
      phone: user.mobile ? String(user.mobile) : primaryCustomer?.phone || "",
      companyName: primaryCustomer?.companyName || "",
      gstin: primaryCustomer?.gstin || "",
      billingAddress: primaryCustomer?.billingAddress || {
        street1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
      shippingAddress: primaryCustomer?.shippingAddress || {
        street1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
      role: user.role,
    };

    return NextResponse.json({
      success: true,
      accountInfo,
      metrics: {
        totalInvoiced,
        totalPaid,
        totalDue,
        totalInvoicesCount: invoices.length,
        totalQuotationsCount: quotations.length,
        activeSubscriptionsCount: subscriptions.length,
      },
      quotations,
      invoices,
      paymentRecords,
      subscriptions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, billingAddress, shippingAddress } = body;

    if (name) {
      user.name = name.trim();
    }
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, "").slice(0, 10);
      if (cleanPhone.length === 10) {
        user.mobile = Number(cleanPhone);
      }
    }
    await user.save();

    // Update matching customer records
    const userEmail = (user.email || "").toLowerCase().trim();
    await Customer.updateMany(
      { email: userEmail },
      {
        $set: {
          customerName: name || user.name,
          phone: phone || (user.mobile ? String(user.mobile) : undefined),
          ...(billingAddress ? { billingAddress } : {}),
          ...(shippingAddress ? { shippingAddress } : {}),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Customer account details updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
