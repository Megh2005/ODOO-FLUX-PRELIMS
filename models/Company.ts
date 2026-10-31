import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompany extends Document {
  name: string;
  logoUrl?: string;
  tagline?: string;
  email: string;
  phone: string;
  gstin?: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  signatoryName: string;
  signatoryDesignation: string;
  signatories?: {
    name: string;
    designation: string;
    signatureUrl?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema<ICompany> = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true, trim: true },
    logoUrl: { type: String },
    tagline: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    gstin: { type: String },
    address: {
      street1: { type: String, required: true },
      street2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
    },
    signatoryName: { type: String, required: true },
    signatoryDesignation: { type: String, required: true },
    signatories: [
      {
        name: { type: String, required: true },
        designation: { type: String, required: true },
        signatureUrl: { type: String },
      }
    ],
  },
  { timestamps: true }
);

const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);
export default Company;
