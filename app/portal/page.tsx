"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TbReceiptTax,
  TbFileText,
  TbClock,
  TbUser,
  TbDownload,
  TbEye,
  TbCircleCheck,
  TbBuildingWarehouse,
  TbShieldCheck,
  TbSearch,
  TbArrowLeft,
  TbMapPin,
  TbPhone,
  TbMail,
  TbBox,
  TbEdit,
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
import { signOut } from "next-auth/react";
import { getIndianStates, getCitiesOfIndianState } from "@/lib/indianLocations";

export default function CustomerPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "subscriptions" | "quotations" | "invoices" | "payments" | "account"
  >("overview");

  // Portal data state
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalDue: 0,
    totalInvoicesCount: 0,
    totalQuotationsCount: 0,
    activeSubscriptionsCount: 0,
  });
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Document preview modal
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Edit profile dialog
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStreet1, setEditStreet1] = useState("");
  const [editStreet2, setEditStreet2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const statesList = getIndianStates();
  const [citiesList, setCitiesList] = useState<string[]>([]);

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/dashboard");
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAccountInfo(data.accountInfo);
        setMetrics(data.metrics);
        setQuotations(data.quotations || []);
        setInvoices(data.invoices || []);
        setPaymentRecords(data.paymentRecords || []);
        setSubscriptions(data.subscriptions || []);

        if (data.accountInfo) {
          setEditName(data.accountInfo.name || "");
          setEditPhone(data.accountInfo.phone || "");
          setEditStreet1(data.accountInfo.billingAddress?.street1 || "");
          setEditStreet2(data.accountInfo.billingAddress?.street2 || "");
          setEditCity(data.accountInfo.billingAddress?.city || "");
          setEditState(data.accountInfo.billingAddress?.state || "");
          setEditPincode(data.accountInfo.billingAddress?.pincode || "");
        }
      } else {
        toast.error(data.error || "Failed to load customer portal");
      }
    } catch (e) {
      toast.error("Network error while loading portal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editState) {
      const matched = statesList.find((s) => s.name === editState);
      if (matched) {
        setCitiesList(getCitiesOfIndianState(matched.code));
      }
    } else {
      setCitiesList([]);
    }
  }, [editState]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
      toast.success("Successfully logged out");
    } catch (e) {
      toast.error("Logout failed");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Full name is required");
      return;
    }

    const cleanPhone = editPhone.replace(/\D/g, "").slice(0, 10);
    if (editPhone && cleanPhone.length !== 10) {
      toast.error("Phone number must be strictly 10 digits");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/portal/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: cleanPhone || undefined,
          billingAddress: {
            street1: editStreet1,
            street2: editStreet2,
            city: editCity,
            state: editState,
            pincode: editPincode,
            country: "India",
          },
          shippingAddress: {
            street1: editStreet1,
            street2: editStreet2,
            city: editCity,
            state: editState,
            pincode: editPincode,
            country: "India",
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Account profile updated successfully");
        setIsEditProfileOpen(false);
        fetchPortalData();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (e) {
      toast.error("An error occurred while saving profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuotations = quotations.filter(
    (q) =>
      q.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter(
    (sub) =>
      sub.contractNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.planName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading customer portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Customer Portal Dedicated Header */}
      <header className="w-full bg-slate-950 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
              <TbReceiptTax className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider uppercase text-white">SUTRA</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Customer Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {accountInfo?.name || accountInfo?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditProfileOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
            >
              <TbEdit className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Customer Welcome & Quick Overview Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Client Operating Center
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 mt-0.5">
              Welcome, {accountInfo?.name || "Client"}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Access and manage your contracts, formal quotations, tax invoices, and payment receipts.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Registered Email</span>
              <span className="text-xs font-mono font-semibold text-slate-900">{accountInfo?.email}</span>
            </div>
            {accountInfo?.phone && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Contact Phone</span>
                <span className="text-xs font-mono font-semibold text-slate-900">{accountInfo?.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Primary Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Invoiced
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <TbReceiptTax className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-950 font-mono">
              ₹{metrics.totalInvoiced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {metrics.totalInvoicesCount} tax invoices issued
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Settled Payments
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TbCircleCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              ₹{metrics.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Payment confirmed against records
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Outstanding Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <TbClock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">
              ₹{metrics.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-amber-700 font-medium">
              Pending billing settlement
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Active Subscriptions
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TbBox className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-600 font-mono">
              {metrics.activeSubscriptionsCount}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {metrics.totalQuotationsCount} pending quotations
            </span>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: "overview", label: "Overview", icon: TbBuildingWarehouse },
              { id: "subscriptions", label: `Subscriptions (${subscriptions.length})`, icon: TbBox },
              { id: "quotations", label: `Quotations (${quotations.length})`, icon: TbFileText },
              { id: "invoices", label: `Invoices (${invoices.length})`, icon: TbReceiptTax },
              { id: "payments", label: `Payments (${paymentRecords.length})`, icon: TbCircleCheck },
              { id: "account", label: "Account Profile", icon: TbUser },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-slate-950 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {(activeTab === "quotations" || activeTab === "invoices" || activeTab === "subscriptions") && (
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <TbSearch className="w-3.5 h-3.5" />
              </span>
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TbReceiptTax className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">Recent Tax Invoices</h3>
                </div>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold"
                >
                  View All ({invoices.length})
                </button>
              </div>

              {invoices.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No invoices issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 4).map((inv) => (
                    <div
                      key={inv._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-all"
                    >
                      <div>
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(inv.issueDate).toLocaleDateString("en-IN")} • Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            ₹{inv.grandTotal?.toFixed(2)}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "PARTIALLY_PAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <a
                          href={`/api/invoices/${inv._id}/pdf`}
                          download
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                          title="Download PDF"
                        >
                          <TbDownload className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Subscriptions Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TbBox className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900">Active Subscriptions</h3>
                </div>
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className="text-xs text-purple-600 hover:text-purple-700 font-bold"
                >
                  View Details ({subscriptions.length})
                </button>
              </div>

              {subscriptions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active subscription packages found.</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.slice(0, 4).map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{sub.planName}</span>
                        <span className="text-[10px] text-slate-500">
                          {sub.interval} • Contract #{sub.contractNumber}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          ₹{sub.amount?.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTIONS */}
        {activeTab === "subscriptions" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Subscription Contracts & Plans</h3>
                <p className="text-xs text-slate-500">Recurring plans and scheduled billing commitments</p>
              </div>
            </div>

            {filteredSubscriptions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No subscription contracts match your criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSubscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{sub.planName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Contract: <span className="font-mono font-semibold text-slate-700">{sub.contractNumber}</span> • Cadence: <span className="font-semibold text-slate-700">{sub.interval}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Effective: {new Date(sub.startDate).toLocaleDateString("en-IN")} • Renewal: {new Date(sub.renewalDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Recurring Amount</span>
                        <span className="font-mono font-black text-base text-slate-950">
                          ₹{sub.amount?.toFixed(2)}
                        </span>
                      </div>
                      <a
                        href={`/api/invoices/${sub.id}/pdf`}
                        download
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <TbDownload className="w-3.5 h-3.5" />
                        <span>Contract PDF</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUOTATIONS */}
        {activeTab === "quotations" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Quotations & Formal Estimates</h3>
                <p className="text-xs text-slate-500">Formal commercial estimates issued to your account</p>
              </div>
            </div>

            {filteredQuotations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No quotation documents available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Quote Number</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Valid Until</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredQuotations.map((q) => (
                      <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(q.issueDate).toLocaleDateString("en-IN")}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(q.dueDate).toLocaleDateString("en-IN")}</td>
                        <td className="py-3 px-4 text-slate-600">{q.lineItems?.length || 0} line items</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          ₹{q.grandTotal?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedDocument(q);
                              setIsDocModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center"
                            title="Inspect Quote"
                          >
                            <TbEye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/api/invoices/${q._id}/pdf`}
                            download
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white inline-flex items-center"
                            title="Download PDF"
                          >
                            <TbDownload className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INVOICES */}
        {activeTab === "invoices" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tax Invoices & Billing Records</h3>
                <p className="text-xs text-slate-500">Official GST-compliant tax invoices and fiscal bills</p>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No billing invoices found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(inv.issueDate).toLocaleDateString("en-IN")}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(inv.dueDate).toLocaleDateString("en-IN")}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "PARTIALLY_PAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                          ₹{(inv.paidAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          ₹{inv.grandTotal?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedDocument(inv);
                              setIsDocModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center"
                            title="Inspect Invoice"
                          >
                            <TbEye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/api/invoices/${inv._id}/pdf`}
                            download
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white inline-flex items-center"
                            title="Download PDF"
                          >
                            <TbDownload className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PAYMENT RECORDS */}
        {activeTab === "payments" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Payment Reconciliation Records</h3>
                <p className="text-xs text-slate-500">History of payments cleared against issued invoices</p>
              </div>
            </div>

            {paymentRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paymentRecords.map((p, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TbCircleCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-slate-900">
                          Payment Recorded against {p.invoiceNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Date: {new Date(p.issueDate).toLocaleDateString("en-IN")} • Terms: {p.paymentTerms}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Cleared Amount</span>
                      <span className="font-mono font-black text-sm text-emerald-600">
                        ₹{p.paidAmount?.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Invoice Total: ₹{p.grandTotal?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ACCOUNT PROFILE */}
        {activeTab === "account" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TbUser className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">Account Credentials & Contact</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="text-xs"
                >
                  <TbEdit className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Full Name</span>
                  <span className="font-bold text-slate-900">{accountInfo?.name || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Registered Email</span>
                  <span className="font-mono text-slate-800">{accountInfo?.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Phone Number</span>
                  <span className="font-mono text-slate-800">{accountInfo?.phone || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Organization Entity</span>
                  <span className="text-slate-800">{accountInfo?.companyName || "Individual Client"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">GSTIN</span>
                  <span className="font-mono text-slate-800">{accountInfo?.gstin || "Unregistered / Consumer"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TbMapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Billing & Shipping Addresses</h3>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Billing Address</span>
                  <p className="text-slate-700 leading-relaxed font-medium mt-1">
                    {accountInfo?.billingAddress?.street1 || "Street not configured"}
                    {accountInfo?.billingAddress?.street2 && `, ${accountInfo.billingAddress.street2}`}
                    <br />
                    {accountInfo?.billingAddress?.city && `${accountInfo.billingAddress.city}, `}
                    {accountInfo?.billingAddress?.state} - {accountInfo?.billingAddress?.pincode}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Shipping Address</span>
                  <p className="text-slate-700 leading-relaxed font-medium mt-1">
                    {accountInfo?.shippingAddress?.street1 || "Same as billing address"}
                    {accountInfo?.shippingAddress?.street2 && `, ${accountInfo.shippingAddress.street2}`}
                    <br />
                    {accountInfo?.shippingAddress?.city && `${accountInfo.shippingAddress.city}, `}
                    {accountInfo?.shippingAddress?.state} - {accountInfo?.shippingAddress?.pincode}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Document Detail Preview Modal */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-900 flex items-center justify-between">
              <span>{selectedDocument?.documentType} - {selectedDocument?.invoiceNumber}</span>
              <span className="text-xs font-mono font-black text-slate-950">
                ₹{selectedDocument?.grandTotal?.toFixed(2)}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Issue Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedDocument.issueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Due / Validity Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedDocument.dueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">Line Items Breakdown</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDocument.lineItems?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2 font-semibold text-slate-900">{item.productName}</td>
                          <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                          <td className="p-2 text-right font-mono">₹{item.unitPrice?.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-bold">₹{item.totalAmount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDocModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <a
                  href={`/api/invoices/${selectedDocument._id}/pdf`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-white font-bold text-xs"
                >
                  <TbDownload className="w-3.5 h-3.5" />
                  <span>Download Official PDF</span>
                </a>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile & Address Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TbEdit className="w-4 h-4 text-amber-600" />
              <span>Update Account & Address</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-700">Full Name</Label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-700">Phone (10 numeric digits)</Label>
              <Input
                type="tel"
                maxLength={10}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-700">Street Address</Label>
              <Input
                type="text"
                placeholder="Street address line 1"
                value={editStreet1}
                onChange={(e) => setEditStreet1(e.target.value)}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-700">State</Label>
                <select
                  value={editState}
                  onChange={(e) => {
                    setEditState(e.target.value);
                    setEditCity("");
                  }}
                  className="w-full h-8 text-xs bg-white border border-slate-200 rounded-lg px-2 text-slate-800"
                >
                  <option value="">Select State</option>
                  {statesList.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-700">City</Label>
                <select
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  disabled={!editState}
                  className="w-full h-8 text-xs bg-white border border-slate-200 rounded-lg px-2 text-slate-800"
                >
                  <option value="">Select City</option>
                  {citiesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-700">Pincode</Label>
              <Input
                type="text"
                placeholder="6-digit pincode"
                maxLength={6}
                value={editPincode}
                onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 rounded-lg font-mono"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-slate-950 text-white font-bold text-xs"
                size="sm"
              >
                {savingProfile ? "Saving..." : "Save Details"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
