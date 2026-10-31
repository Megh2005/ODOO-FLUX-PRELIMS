"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TbBuildingWarehouse,
  TbLayoutDashboard,
  TbBox,
  TbReceiptTax,
  TbTemplate,
  TbPlus,
  TbSettings,
} from "react-icons/tb";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: TbLayoutDashboard },
  { name: "Inventory Stock", href: "/inventory", icon: TbBox },
  { name: "Customer Directory", href: "/customers", icon: HiOutlineUserGroup },
  { name: "Invoices & Billing", href: "/invoices", icon: TbReceiptTax },
  { name: "Terms & Templates", href: "/terms", icon: TbTemplate },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const isExcludedPage =
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/setup-company" ||
      pathname.startsWith("/portal") ||
      pathname.startsWith("/reset-password");
    if (isExcludedPage) return;

    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
        } else if (res.status === 403) {
          router.push("/setup-company");
        } else {
          return res.json();
        }
      })
      .then((data) => {
        if (data && data.success) {
          // If customer user enters business admin area, redirect to customer portal
          if (data.user?.role === "CUSTOMER") {
            router.push("/portal");
            return;
          }

          setCompanyName(data.company ? data.company.name : "Setup Company");
          setUserEmail(data.user.email);
          if (!data.company) {
            router.push("/setup-company");
          }
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
      toast.success("Successfully logged out");
    } catch (e) {
      toast.error("Logout failed");
    }
  };

  const isExcludedPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/setup-company" ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/reset-password");
  if (isExcludedPage) return null;

  return (
    <header className="w-full bg-slate-950/95 backdrop-blur-md text-white sticky top-0 z-40 border-b border-slate-800/80 shadow-lg">
      <div className="w-full px-3 md:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Brand Identity */}
        <Link href={userEmail ? "/dashboard" : "/"} className="flex items-center gap-3 shrink-0 group">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform duration-200">
            <TbBuildingWarehouse className="w-6 h-6 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-sm tracking-wider uppercase text-white leading-tight flex items-center gap-1.5">
              <span>{companyName}</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
              {userEmail || "Inventory & Billing Suite"}
            </span>
          </div>
        </Link>

        {/* Center Main Top Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-slate-950" : "text-slate-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions & Notifications */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Create Invoice Button */}
          <Link href="/invoices/new">
            <Button
              size="sm"
              className="gap-1.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 h-9 shadow-md px-4 rounded-xl border border-amber-500/30 hover:shadow-amber-500/10 transition-all duration-200"
            >
              <TbPlus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Create Invoice</span>
            </Button>
          </Link>

          {/* Settings Link */}
          <Link href="/settings">
            <Button
              size="sm"
              className="text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 h-9 w-9 px-0 rounded-xl transition-all duration-200"
              title="Organisation Settings"
            >
              <TbSettings className="w-4 h-4" />
            </Button>
          </Link>

          {/* Logout Button */}
          <Button
            size="sm"
            onClick={handleLogout}
            className="text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 h-9 px-3 rounded-xl transition-all duration-200"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Top Navigation Sub-Bar */}
      <div className="lg:hidden flex items-center overflow-x-auto px-3 py-2 bg-slate-950 border-t border-slate-800/80 gap-1.5 no-scrollbar">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all duration-150",
                isActive
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-300 hover:bg-slate-900"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
