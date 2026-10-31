import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  entity: string;
  entityId?: string;
  companyId: mongoose.Types.ObjectId;
  details: string;
  createdAt: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    details: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export async function logAudit(action: string, entity: string, entityId?: string, details?: string, companyId?: any) {
  try {
    if (!companyId) return;
    await AuditLog.create({
      companyId,
      action,
      entity,
      entityId,
      details: details || `${action} on ${entity}`,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export default AuditLog;
