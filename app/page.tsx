"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TbArrowRight,
  TbShieldCheck,
  TbBox,
  TbReceiptTax,
  TbUsers,
} from "react-icons/tb";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>("BUSINESS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.success) {
          setIsAuthenticated(true);
          setUserRole(data.user?.role || "BUSINESS");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Background Radial Glow Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(245,158,11,0.08),rgba(255,255,255,0))]" />

      <div className="max-w-6xl w-full mx-auto px-6 py-8 relative z-10 space-y-16 flex-grow flex flex-col justify-center">
        {/* Minimal Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto py-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold shadow-2xs">
            <span>Smart All-in-One Business Operating Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black  text-slate-950 leading-[1.12]">
            Unified Stock, <br />
            <span className="text-amber-600">Client Ledgers</span> & Billing
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Effortlessly track warehouse inventory in real time, issue
            GST-compliant invoices with automated 3D revenue charts, AI
            descriptions, and digital signatures
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap justify-center gap-4 items-center">
            {loading ? (
              <Button size="lg" variant="secondary" disabled>
                Loading...
              </Button>
            ) : isAuthenticated ? (
              <Link href={userRole === "CUSTOMER" ? "/portal" : "/dashboard"}>
                <Button size="lg" variant="default">
                  <span>{userRole === "CUSTOMER" ? "Open Customer Portal" : "Open Business Console"}</span>
                  <TbArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" variant="default">
                    <span>Business Console</span>
                    <TbArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary">
                    Customer Portal
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 4 Core Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all space-y-3 group">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <TbBox className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-950">
              Stock Control
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Real-time stock monitoring, automated low-stock threshold alerts,
              and valuation metrics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all space-y-3 group">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <TbReceiptTax className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-950">
              Compliance Invoicing
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tax Invoices, Quotations, Delivery Challans, and POs with
              downloadable PDF exports.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all space-y-3 group">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <TbUsers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-950">
              Client Directory
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Track customer balances, payment histories, and individual ledger
              accounts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all space-y-3 group">
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <TbShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-950">
              Gemini AI Engine
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              AI assistant that writes product specifications and catalog
              descriptions instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="py-6 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
        <p>
          © {new Date().getFullYear()} SUTRA Operating Suite. All
          rights reserved.
        </p>
      </footer>
    </div>
  );
}
