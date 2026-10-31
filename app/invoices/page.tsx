"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  FileDown,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { exportInvoicesToExcel } from "@/lib/excelExporter";
import { toast } from "sonner";
import Link from "next/link";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  useEffect(() => {
    fetchInvoices();
  }, [search, documentType, status]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (documentType !== "ALL") params.append("documentType", documentType);
      if (status !== "ALL") params.append("status", status);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (inv: any) => {
    window.open(`/api/invoices/${inv._id}/pdf`, "_blank");
  };


  const handleDeleteInvoice = async (inv: any) => {
    if (!confirm(`Are you sure you want to permanently delete document "${inv.invoiceNumber}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${inv._id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Invoice deleted permanently");
        fetchInvoices();
      } else {
        toast.error(result.error || "Failed to delete invoice");
      }
    } catch (e) {
      toast.error("Error deleting invoice");
    }
  };

  const handleExportExcel = () => {
    if (invoices.length === 0) {
      toast.error("No invoices available to export");
      return;
    }
    const buffer = exportInvoicesToExcel(invoices);
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Billing_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    toast.success("Billing history exported to Excel!");
  };

  return (
    <div className="space-y-6 w-[90%] mx-auto py-6 px-4 md:px-6">
        {/* Header Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Invoicing & Billing History</h1>
            <p className="text-xs text-slate-500">
              Zoho Invoice inspired billing engine for Tax Invoices, Quotations, Estimates, Challans & Credit Notes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold border-slate-300 text-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Billing (Excel)</span>
            </Button>
            <Link href="/invoices/new">
              <Button size="sm" className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs">
                <Plus className="w-4 h-4" />
                <span>Create New Invoice</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search invoice number, customer name, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200"
            />
          </div>

          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full md:w-48 h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="ALL">All Document Types</option>
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-36 h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Customer Name</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-right">Paid Amount</th>
                  <th className="py-3 px-3 text-right">Due Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading invoice documents...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No invoices found. Click "+ Create New Invoice" to generate one.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const gTotal = Number(inv.grandTotal || 0);
                    const paidAmt = inv.status === "PAID" ? gTotal : Number(inv.paidAmount || 0);
                    const dueAmt = Math.max(0, gTotal - paidAmt);

                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {inv.documentType.replace("_", " ")}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <Link href={`/invoices/${inv._id}`} className="hover:underline text-blue-600">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {inv.customerSnapshot?.customerName || "Walk-in Customer"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="block text-slate-800 font-semibold">{new Date(inv.issueDate).toLocaleDateString("en-IN")}</span>
                          <span className="block text-[10px] text-slate-400 font-bold">
                            {inv.status === "PAID" || inv.paymentTerms === "Already Paid"
                              ? "Due: N/A (Paid)"
                              : inv.dueDate
                              ? `Due: ${new Date(inv.dueDate).toLocaleDateString("en-IN")}`
                              : "Due: N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹ {gTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          ₹ {paidAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-700">
                          ₹ {dueAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "ISSUED"
                                ? "bg-blue-100 text-blue-800"
                                : inv.status === "CANCELLED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link href={`/invoices/${inv._id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="View Details"
                              className="h-8 px-2 text-xs border-slate-300 text-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Download PDF"
                            onClick={() => handleDownloadPDF(inv)}
                            className="h-8 px-2 text-xs border-slate-300 text-blue-600 hover:bg-blue-50"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </Button>
                          <Link href={`/invoices/new?editId=${inv._id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Edit Invoice"
                              className="h-8 px-2 text-xs border-slate-300 text-amber-700 hover:bg-amber-50"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Document Permanently"
                            onClick={() => handleDeleteInvoice(inv)}
                            className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
