import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strict 10-digit mobile number validation regex (digits only, no special chars, no country code)
export function isValidMobileNumber(phone: string | number | undefined | null): boolean {
  if (!phone) return false;
  const cleaned = String(phone).trim();
  return /^\d{10}$/.test(cleaned);
}

// Sanitize mobile input to strict 10 digits
export function sanitizeMobileInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}
