import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import Customer from "@/models/Customer";
import { logAudit } from "@/models/AuditLog";
import { requireAuth } from "@/lib/authHelper";
import { isValidMobileNumber } from "@/lib/utils";

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
    const customerType = searchParams.get("customerType") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const query: any = { companyId };

    if (customerType && customerType !== "ALL") {
      query.customerType = customerType;
    }

    if (search) {
      query.$and = [
        { companyId },
        {
          $or: [
            { customerName: { $regex: search, $options: "i" } },
            { companyName: { $regex: search, $options: "i" } },
            { contactPersonName: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { gstin: { $regex: search, $options: "i" } },
          ]
        }
      ];
    }

    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
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
      customerType = "INDIVIDUAL",
      salutation = "Mr",
      customerName,
      companyName,
      contactPersonName,
      email,
      phone,
      gstin,
      gstTreatment = "BUSINESS_GST",
      placeOfSupply = "Maharashtra",
      billingAddress,
      shippingAddress,
      projectReferences,
      notes,
    } = body;

    if (!customerName) {
      return NextResponse.json(
        { success: false, error: "Customer name / Business name is required" },
        { status: 400 }
      );
    }

    if (!isValidMobileNumber(phone)) {
      return NextResponse.json(
        { success: false, error: "Mobile number must be strictly 10 numeric digits without country code or special characters" },
        { status: 400 }
      );
    }

    if (customerType === "BUSINESS" && !contactPersonName) {
      return NextResponse.json(
        { success: false, error: "Point of Contact name is required for Business customers" },
        { status: 400 }
      );
    }

    const streetVal = billingAddress?.street1 || billingAddress?.street || "";
    const formattedBilling = billingAddress
      ? {
          street: streetVal,
          street1: streetVal,
          street2: billingAddress.street2 || "",
          city: billingAddress.city || "",
          state: billingAddress.state || placeOfSupply || "Maharashtra",
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

    const customer = await Customer.create({
      companyId,
      customerType,
      salutation,
      customerName,
      companyName: customerType === "BUSINESS" ? companyName || customerName : undefined,
      contactPersonName,
      email,
      phone,
      gstin,
      gstTreatment,
      placeOfSupply,
      billingAddress: formattedBilling,
      shippingAddress: formattedShipping,
      projectReferences: projectReferences || [],
      notes,
    });

    await logAudit("CREATE_CUSTOMER", "Customer", customer._id.toString(), `Created ${customerType} customer ${customerName}`, companyId);

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
