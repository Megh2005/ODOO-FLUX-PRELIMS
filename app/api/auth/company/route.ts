import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/dbConnection";
import { getSession } from "@/lib/authHelper";
import User from "@/models/User";
import Company from "@/models/Company";
import { isValidMobileNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getSession();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const {
      name,
      logoUrl,
      tagline,
      email,
      phone,
      gstin,
      address,
      signatories,
    } = body;

    if (
      !name ||
      !email ||
      !phone ||
      !address?.street1 ||
      !address?.city ||
      !address?.state ||
      !address?.pincode ||
      !signatories ||
      !Array.isArray(signatories) ||
      signatories.length === 0
    ) {
      return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });
    }

    if (!isValidMobileNumber(phone)) {
      return NextResponse.json({ success: false, error: "Company mobile number must be strictly 10 numeric digits without country code or special characters" }, { status: 400 });
    }

    // Case-independent company name uniqueness check
    const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, "i") }
    });
    if (existingCompany) {
      return NextResponse.json({ success: false, error: "A business with this company name already exists (case-independent match)" }, { status: 400 });
    }

    // Resolve legacy values from first signatory in list
    const signatoryName = signatories[0].name;
    const signatoryDesignation = signatories[0].designation;

    const company = await Company.create({
      name: name.trim(),
      logoUrl,
      tagline,
      email,
      phone,
      gstin,
      address: {
        street1: address.street1,
        street2: address.street2 || "",
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country || "India",
      },
      signatoryName,
      signatoryDesignation,
      signatories,
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { companyId: company._id },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      company,
      user: { email: user?.email, companyId: user?.companyId }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getSession();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await User.findById(userId).lean();
    if (!user || !user.companyId) {
      return NextResponse.json({ success: false, error: "No company associated with this account" }, { status: 404 });
    }

    const body = await request.json();
    const { name, logoUrl, tagline, email, phone, gstin, address, signatories } = body;

    if (
      !name ||
      !email ||
      !phone ||
      !address?.street1 ||
      !address?.city ||
      !address?.state ||
      !address?.pincode ||
      !signatories ||
      !Array.isArray(signatories) ||
      signatories.length === 0
    ) {
      return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });
    }

    if (!isValidMobileNumber(phone)) {
      return NextResponse.json({ success: false, error: "Company mobile number must be strictly 10 numeric digits without country code or special characters" }, { status: 400 });
    }

    // Case-independent company name uniqueness check excluding current company
    const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      _id: { $ne: user.companyId }
    });
    if (existingCompany) {
      return NextResponse.json({ success: false, error: "A business with this company name already exists (case-independent match)" }, { status: 400 });
    }

    const signatoryName = signatories[0].name;
    const signatoryDesignation = signatories[0].designation;

    const updated = await Company.findByIdAndUpdate(
      user.companyId,
      {
        name: name.trim(),
        logoUrl,
        tagline,
        email,
        phone,
        gstin,
        address: {
          street1: address.street1,
          street2: address.street2 || "",
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: "India",
        },
        signatoryName,
        signatoryDesignation,
        signatories,
      },
      { new: true }
    );

    return NextResponse.json({ success: true, company: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
