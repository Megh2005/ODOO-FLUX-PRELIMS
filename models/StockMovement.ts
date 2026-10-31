import mongoose, { Schema, Document, Model } from "mongoose";

export type MovementType =
  | "ADDITION"
  | "DEDUCTION"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "WASTAGE"
  | "INVOICE_DEDUCTION"
  | "INVOICE_RESTORE";

export interface IStockMovement extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  companyId: mongoose.Types.ObjectId;
  referenceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema: Schema<IStockMovement> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productName: { type: String, required: true },
    movementType: {
      type: String,
      required: true,
      enum: [
        "ADDITION",
        "DEDUCTION",
        "ADJUSTMENT",
        "DAMAGE",
        "WASTAGE",
        "INVOICE_DEDUCTION",
        "INVOICE_RESTORE",
      ],
      index: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);

export default StockMovement;
