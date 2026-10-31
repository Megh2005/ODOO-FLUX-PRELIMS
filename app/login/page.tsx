"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TbBuildingWarehouse,
  TbUsers,
  TbLock,
  TbMail,
  TbShieldCheck,
  TbUser,
  TbArrowLeft,
  TbPhone,
  TbEye,
  TbEyeOff,
  TbCheck,
  TbX,
  TbKey,
} from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

export default function AuthPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"BUSINESS" | "CUSTOMER">("BUSINESS");
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

  // Business registration step (1 = credentials form, 2 = OTP check)
  const [registerStep, setRegisterStep] = useState(1);

  // Forgot password dialog
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password criteria for customer registration
  const hasMinLength = password.length > 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isCustomerPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasSpecialChar;

  // Check if session exists on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.success) {
          if (data.user?.role === "CUSTOMER") {
            router.push("/portal");
          } else {
            router.push(data.company ? "/dashboard" : "/setup-company");
          }
        }
      })
      .catch(() => {});
  }, [router]);

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
          } catch (err) {}
        }

        // Customer goes directly to customer portal; business user goes to dashboard or company setup
        if (meData.user?.role === "CUSTOMER") {
          window.location.href = "/portal";
        } else {
          window.location.href = meData.company ? "/dashboard" : "/setup-company";
        }
      } else {
        toast.error("Signed in successfully, but failed to retrieve user profile.");
      }
    } catch (error: any) {
      toast.error("An error occurred during sign-in.");
    } finally {
      setLoading(false);
    }
  };

  // Business Registration: Send OTP
  const handleSendBusinessOtp = async (e: React.FormEvent) => {
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
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobileDigits,
          password,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Verification code sent to your email!");
        setRegistrationToken(data.registrationToken);
        setRegisterStep(2);
      } else {
        toast.error(data.error || "Failed to dispatch verification code");
      }
    } catch (error: any) {
      toast.error("An error occurred while sending verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Customer Registration
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Name, email, and password are required");
      return;
    }

    if (!isCustomerPasswordValid) {
      toast.error("Password does not meet the security policy requirements");
      return;
    }

    let mobileDigits = "";
    if (mobile) {
      mobileDigits = mobile.replace(/\D/g, "");
      if (mobileDigits.length !== 10) {
        toast.error("Mobile number must be strictly 10 digits");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: mobileDigits || undefined,
          password,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Account created successfully! Logging you in...");
        const loginRes = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });
        if (loginRes?.ok) {
          window.location.href = "/portal";
        } else {
          setActiveTab("login");
          toast.success("Registration complete. Please sign in.");
        }
      } else {
        toast.error(data.error || "Customer registration failed");
      }
    } catch (err: any) {
      toast.error("An error occurred during customer registration.");
    } finally {
      setLoading(false);
    }
  };

  // Business OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: enteredOtp,
          registrationToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Verification successful! Signing in...");
        const loginRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          toast.error("Auto sign-in failed. Please sign in manually.");
          setActiveTab("login");
          setRegisterStep(1);
          setOtpDigits(Array(6).fill(""));
        } else {
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

  // Forgot password request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please provide your registered email address");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password reset instructions dispatched to your email");
        setIsForgotModalOpen(false);
        setForgotEmail("");
      } else {
        toast.error(data.error || "Failed to submit reset request");
      }
    } catch (e: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setForgotLoading(false);
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
            <h1 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
              SUTRA
            </h1>
          </Link>
          <p className="text-[11px] font-medium text-slate-500">
            {selectedRole === "CUSTOMER"
              ? "Customer Portal: Subscriptions, Quotes & Invoices"
              : "Enterprise Suite: Operations, Inventory & Billing"}
          </p>
        </div>

        {/* Role Selector: Business Creator vs Customer Portal */}
        <div className="space-y-1">
          <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block text-center">
            Select Account Role
          </Label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("BUSINESS");
                setRegisterStep(1);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                selectedRole === "BUSINESS"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TbBuildingWarehouse className="w-4 h-4" />
              <span>Business</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole("CUSTOMER");
                setRegisterStep(1);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                selectedRole === "CUSTOMER"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TbUsers className="w-4 h-4" />
              <span>Customer</span>
            </button>
          </div>
        </div>

        {/* Sign In vs Register Tabs */}
        {!(activeTab === "register" && selectedRole === "BUSINESS" && registerStep === 2) && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
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
              type="button"
              onClick={() => {
                setActiveTab("register");
                setRegisterStep(1);
              }}
              className={`py-1.5 rounded transition-all ${
                activeTab === "register"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Sign In Form */}
        {activeTab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="login-email" className="text-slate-700 text-[10px] font-bold">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-slate-700 text-[10px] font-bold">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <TbEyeOff className="w-3.5 h-3.5" /> : <TbEye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold h-9 text-xs rounded-lg transition-all"
            >
              {loading
                ? "Verifying Credentials..."
                : selectedRole === "CUSTOMER"
                ? "Enter Customer Portal"
                : "Sign In to Business Console"}
            </Button>
          </form>
        ) : selectedRole === "BUSINESS" ? (
          /* Business Registration (OTP Based) */
          registerStep === 1 ? (
            <form onSubmit={handleSendBusinessOtp} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-slate-700 text-[10px] font-bold">Full Name</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <TbUser className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Business Owner Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 text-[10px] font-bold">Business Email</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <TbMail className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    type="email"
                    placeholder="owner@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 text-[10px] font-bold">10-Digit Mobile Number</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <TbPhone className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 text-[10px] font-bold">Password</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <TbLock className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold h-9 text-xs rounded-lg mt-2"
              >
                {loading ? "Generating OTP..." : "Send Verification Code"}
              </Button>
            </form>
          ) : (
            /* OTP Verification Screen */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-slate-800">Verification Code Sent</span>
                <p className="text-[11px] text-slate-500">
                  Enter the 6-digit code sent to <strong className="text-slate-800">{email}</strong>
                </p>
              </div>

              <div className="flex justify-between gap-1.5 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const next = [...otpDigits];
                      next[idx] = val;
                      setOtpDigits(next);
                      if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
                        otpRefs.current[idx - 1]?.focus();
                      }
                    }}
                    className="w-10 h-11 text-center font-black text-base border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-none bg-slate-50"
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold h-9 text-xs rounded-lg"
              >
                {loading ? "Verifying..." : "Verify & Proceed to Setup"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setRegisterStep(1)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                >
                  ← Edit registration details
                </button>
              </div>
            </form>
          )
        ) : (
          /* Customer Portal Registration */
          <form onSubmit={handleCustomerRegister} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-slate-700 text-[10px] font-bold">Full Name</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbUser className="w-3.5 h-3.5" />
                </span>
                <Input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 text-[10px] font-bold">Customer Email Address</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbMail className="w-3.5 h-3.5" />
                </span>
                <Input
                  type="email"
                  placeholder="client@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 text-[10px] font-bold">
                Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbPhone className="w-3.5 h-3.5" />
                </span>
                <Input
                  type="tel"
                  placeholder="10 numeric digits"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 text-[10px] font-bold">Account Password</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbLock className="w-3.5 h-3.5" />
                </span>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Customer Password Criteria Box */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[10px]">
              <span className="font-bold text-slate-700 uppercase tracking-wide block">
                Required Security Rules:
              </span>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center gap-1.5">
                  {hasMinLength ? (
                    <TbCheck className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TbX className="w-3 h-3 text-slate-400" />
                  )}
                  <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    More than 8 characters (min 9)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasUpperCase ? (
                    <TbCheck className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TbX className="w-3 h-3 text-slate-400" />
                  )}
                  <span className={hasUpperCase ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    At least one uppercase letter (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasLowerCase ? (
                    <TbCheck className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TbX className="w-3 h-3 text-slate-400" />
                  )}
                  <span className={hasLowerCase ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    At least one lowercase letter (a-z)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasSpecialChar ? (
                    <TbCheck className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TbX className="w-3 h-3 text-slate-400" />
                  )}
                  <span className={hasSpecialChar ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    At least one special character (!@#$%...)
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !isCustomerPasswordValid}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold h-9 text-xs rounded-lg mt-2"
            >
              {loading ? "Registering Account..." : "Create Customer Account"}
            </Button>
          </form>
        )}

        {/* Back Link */}
        <div className="text-center pt-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
          >
            <TbArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen}>
        <DialogContent className="max-w-sm bg-white rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TbKey className="w-4 h-4 text-amber-600" />
              <span>Password Recovery</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the email address registered with your account. We will send you a secure password reset link.
            </p>

            <div className="space-y-1">
              <Label className="text-slate-700 text-[10px] font-bold">Email Address</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <TbMail className="w-3.5 h-3.5" />
                </span>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={forgotLoading}
                className="bg-slate-950 text-white font-bold text-xs"
                size="sm"
              >
                {forgotLoading ? "Sending Link..." : "Send Reset Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
