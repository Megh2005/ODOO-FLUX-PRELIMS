import mongoose, { Schema, Document, Model } from "mongoose";

export type CustomerType = "INDIVIDUAL" | "BUSINESS";
export type SalutationType = "Mr" | "Mrs" | "Ms" | "Dr" | "Er" | "Prof";
export type GstTreatmentType = "BUSINESS_GST" | "CONSUMER" | "UNREGISTERED";

export interface ICustomerAddress {
  street?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface ICustomer extends Document {
  customerType: CustomerType;
  salutation?: SalutationType;
  customerName: string; // Individual name or Business Name
  companyName?: string;
  contactPersonName?: string; // Point of Contact name for Business
  email?: string;
  phone?: string; // POC phone for business, or Mobile for individual
  gstin?: string;
  gstTreatment?: GstTreatmentType;
  placeOfSupply?: string;
  billingAddress?: ICustomerAddress;
  shippingAddress?: ICustomerAddress;
  projectReferences: string[];
  notes?: string;
  outstandingBalance: number;
  companyId: mongoose.Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    street1: { type: String, trim: true },
    street2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false }
);

const CustomerSchema: Schema<ICustomer> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerType: {
      type: String,
      enum: ["INDIVIDUAL", "BUSINESS"],
      default: "INDIVIDUAL",
      required: true,
      index: true,
    },
    salutation: {
      type: String,
      enum: ["Mr", "Mrs", "Ms", "Dr", "Er", "Prof"],
      default: "Mr",
    },
    customerName: { type: String, required: true, trim: true, index: true },
    companyName: { type: String, trim: true },
    contactPersonName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    gstTreatment: {
      type: String,
      enum: ["BUSINESS_GST", "CONSUMER", "UNREGISTERED"],
      default: "BUSINESS_GST",
    },
    placeOfSupply: { type: String, trim: true, default: "Maharashtra" },
    billingAddress: { type: AddressSchema },
    shippingAddress: { type: AddressSchema },
    projectReferences: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    outstandingBalance: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

CustomerSchema.index({
  customerName: "text",
  companyName: "text",
  contactPersonName: "text",
  email: "text",
  phone: "text",
});

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
