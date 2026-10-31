import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  mobile: number;
  name: string;
  passwordHash: string;
  salt: string;
  companyId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    mobile: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
