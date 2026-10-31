import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITermTemplate extends Document {
  title: string;
  content: string;
  companyId: mongoose.Types.ObjectId;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TermTemplateSchema: Schema<ITermTemplate> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

TermTemplateSchema.index({ companyId: 1, title: 1 }, { unique: true });

const TermTemplate: Model<ITermTemplate> =
  mongoose.models.TermTemplate ||
  mongoose.model<ITermTemplate>("TermTemplate", TermTemplateSchema);

export default TermTemplate;
