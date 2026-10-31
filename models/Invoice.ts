import mongoose, { Schema, Document, Model } from "mongoose";

export type DocumentType =
  | "QUOTATION"
  | "ESTIMATE"
  | "TAX_INVOICE"
  | "DELIVERY_CHALLAN"
  | "PURCHASE_ORDER"
  | "SALES_ORDER"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";

export interface IInvoiceLineItem {
  productId?: mongoose.Types.ObjectId;
  productName: string;
  productDescription?: string;
  sku?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  gstRate?: number;
  totalAmount: number;
}

export interface IInvoiceRevision {
  revisedAt: Date;
  changes: string;
}

export interface IInvoice extends Document {
  documentType: DocumentType;
  invoiceNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerSnapshot: {
    customerName: string;
    companyName?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    billingAddress?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };

  };
  issueDate: Date;
  dueDate: Date;
  paymentTerms: string;
  lineItems: IInvoiceLineItem[];
  subTotal: number;
  totalDiscount: number;
  freightCharges: number;
  adjustmentAmount: number;
  adjustmentDescription?: string;
  gstCalculationMode?: "ITEMIZED" | "OVERALL";
  overallGstRate?: number;
  gstPercentage: number;
  gstAmount: number;
  grandTotal: number;
  status: InvoiceStatus;
  paidAmount: number;
  notes?: string;
  subject?: string;
  termsAndConditions?: string;
  bomItems?: {
    itemName: string;
    specification?: string;
    quantity: number;
    unit: string;
  }[];
  revisionHistory: IInvoiceRevision[];
  companyId: mongoose.Types.ObjectId;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatorySignatureUrl?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    productDescription: { type: String },
    sku: { type: String },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 18, min: 0, max: 28 },
    totalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceRevisionSchema = new Schema(
  {
    revisedAt: { type: Date, default: Date.now },
    changes: { type: String, required: true },
  },
  { _id: false }
);

const InvoiceBOMItemSchema = new Schema(
  {
    itemName: { type: String, required: true },
    specification: { type: String },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, default: "Pcs" },
  },
  { _id: false }
);

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    documentType: {
      type: String,
      required: true,
      enum: [
        "QUOTATION",
        "ESTIMATE",
        "TAX_INVOICE",
        "DELIVERY_CHALLAN",
        "PURCHASE_ORDER",
        "SALES_ORDER",
        "CREDIT_NOTE",
        "DEBIT_NOTE",
      ],
      default: "TAX_INVOICE",
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    customerSnapshot: {
      customerName: { type: String, required: true },
      companyName: { type: String },
      email: { type: String },
      phone: { type: String, required: true },
      gstin: { type: String },
      billingAddress: { type: Schema.Types.Mixed },

    },
    issueDate: { type: Date, required: true, default: Date.now, index: true },
    dueDate: { type: Date, required: true, default: Date.now },
    paymentTerms: { type: String, required: true, default: "Due on Receipt" },
    lineItems: [InvoiceLineItemSchema],
    subTotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    freightCharges: { type: Number, default: 0, min: 0 },
    adjustmentAmount: { type: Number, default: 0 },
    adjustmentDescription: { type: String, trim: true },
    gstCalculationMode: {
      type: String,
      enum: ["ITEMIZED", "OVERALL"],
      default: "ITEMIZED",
    },
    overallGstRate: { type: Number, default: 18, min: 0 },
    gstPercentage: { type: Number, required: true, default: 18 },
    gstAmount: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "ISSUED", "PAID", "PARTIALLY_PAID", "CANCELLED"],
      default: "ISSUED",
      index: true,
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    subject: { type: String, trim: true },
    notes: { type: String, trim: true },
    termsAndConditions: { type: String, trim: true },
    bomItems: [InvoiceBOMItemSchema],
    revisionHistory: [InvoiceRevisionSchema],
    signatoryName: { type: String, trim: true },
    signatoryDesignation: { type: String, trim: true },
    signatorySignatureUrl: { type: String, trim: true },
    isArchived: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ invoiceNumber: "text", "customerSnapshot.customerName": "text" });

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;
