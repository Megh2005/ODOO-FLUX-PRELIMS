import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductImage {
  url: string;
  fileId: string;
}

export type ItemType = "GOODS" | "SERVICE";

export interface IProduct extends Document {
  productName: string;
  productDescription?: string;
  category: string;
  unit: string;
  itemType: ItemType;
  hsnCode?: string;
  images: IProductImage[];
  purchasePrice?: number;
  sellingPrice: number;
  gstRate?: number;
  minimumStockQuantity: number;
  currentStock: number;
  sku?: string;
  companyId: mongoose.Types.ObjectId;
  isArchived: boolean;
  lowStockNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    productName: { type: String, required: true, trim: true },
    productDescription: { type: String, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    unit: { type: String, required: true, trim: true },
    itemType: {
      type: String,
      enum: ["GOODS", "SERVICE"],
      default: "GOODS",
    },
    hsnCode: { type: String, trim: true },
    images: [
      {
        url: { type: String, required: true },
        fileId: { type: String, required: true },
      },
    ],
    purchasePrice: { type: Number, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: false, min: -1, max: 28 },
    minimumStockQuantity: { type: Number, required: true, default: 10, min: 0 },
    currentStock: { type: Number, required: true, default: 0 },
    sku: { type: String, trim: true, sparse: true },
    isArchived: { type: Boolean, default: false, index: true },
    lowStockNotified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ productName: "text", hsnCode: "text", category: "text" });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
