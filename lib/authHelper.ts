import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/dbConnection";

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

export function validateCustomerPassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length <= 8) {
    return { valid: false, error: "Password must contain more than 8 characters (minimum 9 characters)" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }
  return { valid: true };
}

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth(): Promise<{ userId: string; companyId: string }> {
  await connectToDatabase();
  const session = await getSession();
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error("UNAUTHORIZED");
  }
  if ((session.user as any).role === "CUSTOMER") {
    throw new Error("FORBIDDEN_CUSTOMER");
  }
  if (!(session.user as any).companyId) {
    throw new Error("NO_COMPANY");
  }
  return {
    userId: (session.user as any).id,
    companyId: (session.user as any).companyId,
  };
}

export async function requireCustomerAuth(): Promise<{ userId: string; email: string; customerId?: string }> {
  await connectToDatabase();
  const session = await getSession();
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    userId: (session.user as any).id,
    email: (session.user as any).email || "",
    customerId: (session.user as any).customerId,
  };
}

const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.NEXTAUTH_SECRET || "fallback_secret_for_registration_key_scrypt",
  "registration_salt",
  32
);

export function encryptPayload(payload: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptPayload(token: string): any {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
}
