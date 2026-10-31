import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "BUSINESS" | "CUSTOMER";

export interface IUser extends Document {
  email: string;
  mobile?: number;
  name: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  companyId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    mobile: { type: Number, required: false, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    role: { type: String, enum: ["BUSINESS", "CUSTOMER"], default: "BUSINESS", index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
