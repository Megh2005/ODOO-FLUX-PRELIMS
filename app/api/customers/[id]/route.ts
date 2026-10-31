import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import { logAudit } from "@/models/AuditLog";
import { requireAuth } from "@/lib/authHelper";
import { isValidMobileNumber } from "@/lib/utils";

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

    const customer = await Customer.findOne({ _id: params.id, companyId }).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const invoices = await Invoice.find({ customerId: params.id, companyId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, customer, invoices });
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

    if (!isValidMobileNumber(body.phone)) {
      return NextResponse.json(
        { success: false, error: "Customer mobile number must be strictly 10 numeric digits without country code or special characters" },
        { status: 400 }
      );
    }

    const billingAddress = body.billingAddress;
    const shippingAddress = body.shippingAddress;

    const streetVal = billingAddress?.street1 || billingAddress?.street || "";
    const formattedBilling = billingAddress
      ? {
          street: streetVal,
          street1: streetVal,
          street2: billingAddress.street2 || "",
          city: billingAddress.city || "",
          state: billingAddress.state || body.placeOfSupply || "Maharashtra",
          pincode: String(billingAddress.pincode || ""),
          country: billingAddress.country || "India",
        }
      : undefined;

    const shipStreetVal = shippingAddress?.street1 || shippingAddress?.street || streetVal;
    const formattedShipping = shippingAddress
      ? {
          street: shipStreetVal,
          street1: shipStreetVal,
          street2: shippingAddress.street2 || "",
          city: shippingAddress.city || formattedBilling?.city || "",
          state: shippingAddress.state || formattedBilling?.state || "Maharashtra",
          pincode: String(shippingAddress.pincode || formattedBilling?.pincode || ""),
          country: shippingAddress.country || "India",
        }
      : formattedBilling;

    const customer = await Customer.findOneAndUpdate(
      { _id: params.id, companyId },
      {
        customerType: body.customerType,
        salutation: body.salutation,
        customerName: body.customerName,
        companyName: body.companyName,
        contactPersonName: body.contactPersonName,
        email: body.email,
        phone: body.phone,
        gstin: body.gstin,
        billingAddress: formattedBilling,
        shippingAddress: formattedShipping,
        projectReferences: body.projectReferences,
        notes: body.notes,
      },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    await logAudit("UPDATE_CUSTOMER", "Customer", customer._id.toString(), `Updated customer ${customer.customerName}`, companyId);

    return NextResponse.json({ success: true, customer });
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

    const customer = await Customer.findOne({ _id: params.id, companyId });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const name = customer.customerName;
    await Customer.deleteOne({ _id: params.id, companyId });

    await logAudit(
      "DELETE_CUSTOMER",
      "Customer",
      params.id,
      `Permanently deleted customer ${name}`,
      companyId
    );

    return NextResponse.json({ success: true, message: `Customer ${name} permanently deleted` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
