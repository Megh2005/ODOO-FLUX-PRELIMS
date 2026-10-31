"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TbBuildingWarehouse,
  TbLock,
  TbCheck,
  TbX,
  TbArrowLeft,
  TbEye,
  TbEyeOff,
  TbShieldCheck,
} from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Criteria evaluation
  const hasMinLength = password.length > 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid =
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasSpecialChar &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      toast.error("Invalid password reset link. Missing token or email.");
      return;
    }

    if (!isFormValid) {
      toast.error("Please fulfill all password security requirements.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        toast.success(data.message || "Password updated successfully");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
          <TbX className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Invalid Password Reset Link</h2>
        <p className="text-xs text-slate-600">
          The password reset token is missing or malformed. Please request a new recovery link.
        </p>
        <Link href="/login" className="inline-block pt-2">
          <Button variant="default" size="sm">
            Return to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
          <TbShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Password Updated</h2>
        <p className="text-xs text-slate-600">
          Your account password has been updated securely. You can now log into your account using your new credentials.
        </p>
        <Link href="/login" className="inline-block pt-2">
          <Button variant="default" size="sm">
            Sign In with New Password
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-slate-700 text-[10px] font-bold">New Password</Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <TbLock className="w-3.5 h-3.5" />
          </span>
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            className="pl-9 pr-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <TbEyeOff className="w-3.5 h-3.5" /> : <TbEye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-slate-700 text-[10px] font-bold">Confirm Password</Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <TbLock className="w-3.5 h-3.5" />
          </span>
          <Input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
            required
          />
        </div>
      </div>

      {/* Password criteria requirement list */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
        <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wide">
          Password Policy Checklist
        </p>
        <div className="grid grid-cols-1 gap-1">
          <div className="flex items-center gap-1.5">
            {hasMinLength ? (
              <TbCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <TbX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-500"}>
              More than 8 characters (at least 9)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasUpperCase ? (
              <TbCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <TbX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={hasUpperCase ? "text-emerald-700 font-medium" : "text-slate-500"}>
              At least one uppercase letter (A-Z)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasLowerCase ? (
              <TbCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <TbX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={hasLowerCase ? "text-emerald-700 font-medium" : "text-slate-500"}>
              At least one lowercase letter (a-z)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasSpecialChar ? (
              <TbCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <TbX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={hasSpecialChar ? "text-emerald-700 font-medium" : "text-slate-500"}>
              At least one special character (!@#$%^&*...)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {passwordsMatch ? (
              <TbCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <TbX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={passwordsMatch ? "text-emerald-700 font-medium" : "text-slate-500"}>
              Passwords match
            </span>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold h-9 text-xs rounded-lg"
      >
        {loading ? "Updating Password..." : "Set New Password"}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <TbArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 px-4 py-8 text-slate-800">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block group">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 mb-1 border border-amber-500/20 group-hover:bg-amber-500/20 transition-all">
              <TbBuildingWarehouse className="w-6 h-6 text-amber-600 group-hover:scale-105 transition-transform" />
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
              SUTRA
            </h1>
          </Link>
          <p className="text-[11px] font-medium text-slate-500">
            Set your new secure account password
          </p>
        </div>

        <Suspense fallback={<div className="text-xs text-center py-6 text-slate-500">Loading form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
