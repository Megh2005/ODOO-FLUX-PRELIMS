"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TbBuildingWarehouse,
  TbLock,
  TbMail,
  TbShieldCheck,
  TbUser,
  TbArrowLeft,
  TbPhone,
  TbEye,
  TbEyeOff,
} from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [registrationToken, setRegistrationToken] = useState("");

  // Registration step (1 = credentials form, 2 = OTP check)
  const [registerStep, setRegisterStep] = useState(1);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData.success) {
        toast.success("Successfully signed in!");

        // Trigger browser Credential Management API to save password prompt
        if (
          typeof window !== "undefined" &&
          "PasswordCredential" in window &&
          (window as any).PasswordCredential
        ) {
          try {
            const cred = new (window as any).PasswordCredential({
              id: email,
              password: password,
              name: meData.user?.name || email,
            });
            await navigator.credentials.store(cred);
          } catch (err) {
            // Ignore if credential store is blocked by environment
          }
        }

        // Full window navigation forces Chrome browser to show native 'Save Password' prompt
        const targetPath = meData.company ? "/dashboard" : "/setup-company";
        window.location.href = targetPath;
      } else {
        toast.error(
          "Signed in successfully, but failed to retrieve user profile.",
        );
      }
    } catch (error: any) {
      toast.error("An error occurred during sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !mobile || !password) {
      toast.error("Please fill in all required fields including mobile number");
      return;
    }

    const mobileDigits = mobile.replace(/\D/g, "");
    if (mobileDigits.length !== 10) {
      toast.error("Mobile number must be strictly 10 digits");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile: mobileDigits, password }),
      });

      const data = await response.json();
      if (data.success && data.otpSent) {
        toast.success("Verification code sent to your email!");
        setRegistrationToken(data.registrationToken);
        setRegisterStep(2);
      } else {
        toast.error(data.error || "Failed to initiate registration");
      }
    } catch (error: any) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    const digit = numericValue.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      const newDigits = [...otpDigits];
      if (!otpDigits[index] && index > 0) {
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
      } else {
        newDigits[index] = "";
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .trim()
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasteData.length === 6) {
      const newDigits = pasteData.split("");
      setOtpDigits(newDigits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, registrationToken }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Email verified and account registered!");

        const loginResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginResult?.error) {
          toast.error(
            "Account created, but automatic sign-in failed. Please login manually.",
          );
          setActiveTab("login");
          setRegisterStep(1);
          setOtpDigits(Array(6).fill(""));
        } else {
          // Trigger browser Credential Management API to save password prompt
          if (
            typeof window !== "undefined" &&
            "PasswordCredential" in window &&
            (window as any).PasswordCredential
          ) {
            try {
              const cred = new (window as any).PasswordCredential({
                id: email,
                password: password,
                name: name || email,
              });
              await navigator.credentials.store(cred);
            } catch (err) {
              // Ignore if credential store is blocked by environment
            }
          }

          window.location.href = "/setup-company";
        }
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error: any) {
      toast.error("An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 px-4 py-8 text-slate-800">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5">
        {/* App Branding Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block group">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 mb-1 border border-amber-500/20 group-hover:bg-amber-500/20 transition-all">
              <TbBuildingWarehouse className="w-6 h-6 text-amber-600 group-hover:scale-105 transition-transform" />
            </div>
            <h1 className="text-lg font-black text-slate-900  group-hover:text-amber-600 transition-colors">
              SUTRA
            </h1>
          </Link>
          <p className="text-[11px] font-medium text-slate-500">
            {activeTab === "login"
              ? "Sign in to access your business workspace"
              : registerStep === 2
                ? "Verify email address"
                : "Register your SUTRA account"}
          </p>
        </div>

        {/* Minimalist Tab Selector */}
        {!(activeTab === "register" && registerStep === 2) && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => {
                setActiveTab("login");
                setRegisterStep(1);
              }}
              className={`py-1.5 rounded transition-all ${
                activeTab === "login"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`py-1.5 rounded transition-all ${
                activeTab === "register"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Auth Forms */}
        {activeTab === "login" ? (
          /* Sign In Form */
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1">
              <Label
                htmlFor="login-email"
                className="text-slate-700 text-[10px] font-bold"
              >
                Email Address
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbMail className="w-3.5 h-3.5" />
                </span>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="login-password"
                className="text-slate-700 text-[10px] font-bold"
              >
                Password
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbLock className="w-3.5 h-3.5" />
                </span>
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <TbEyeOff className="w-4 h-4" />
                  ) : (
                    <TbEye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Sign In"}
            </Button>
          </form>
        ) : registerStep === 1 ? (
          /* Sign Up Step 1: Input Credentials */
          <form onSubmit={handleSendOtp} className="space-y-3.5">
            <div className="space-y-1">
              <Label
                htmlFor="register-name"
                className="text-slate-700 text-[10px] font-bold"
              >
                Full Name
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbUser className="w-3.5 h-3.5" />
                </span>
                <Input
                  id="register-name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="register-email"
                className="text-slate-700 text-[10px] font-bold"
              >
                Email Address
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbMail className="w-3.5 h-3.5" />
                </span>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="register-mobile"
                className="text-slate-700 text-[10px] font-bold"
              >
                Mobile Number (10 Digits)
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbPhone className="w-3.5 h-3.5" />
                </span>
                <Input
                  id="register-mobile"
                  name="mobile"
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:border-amber-500 focus:ring-amber-500 font-mono tracking-wider"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="register-password"
                className="text-slate-700 text-[10px] font-bold"
              >
                Password
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbLock className="w-3.5 h-3.5" />
                </span>
                <Input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-9 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <TbEyeOff className="w-4 h-4" />
                  ) : (
                    <TbEye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Sending Code..." : "Send Verification OTP"}
            </Button>
          </form>
        ) : (
          /* Sign Up Step 2: Input OTP */
          <form method="post" onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              type="hidden"
              name="username"
              value={email}
              autoComplete="username"
            />
            <input
              type="hidden"
              name="password"
              value={password}
              autoComplete="new-password"
            />
            <div className="text-center pb-1">
              <p className="text-[10px] text-slate-500">
                A verification code was sent to <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 text-[10px] font-bold block text-center">
                Verification Code
              </Label>
              <div className="flex justify-between gap-1.5 max-w-[260px] mx-auto">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-9 h-9 text-center font-black text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm transition-all"
                    required
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code & Register"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRegisterStep(1);
                setOtpDigits(Array(6).fill(""));
              }}
              className="w-full"
              disabled={loading}
            >
              Back to Form
            </Button>
          </form>
        )}

        {/* Universal Back to Home Screen Redirect Button */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <Link href="/">
            <Button variant="secondary" className="w-full text-xs">
              <TbArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Return to Home Screen</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
