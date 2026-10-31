"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  FileDown,
  ArrowLeft,
  History,
  Building2,
  Phone,
  Mail,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_COMPANY = {
  name: "Your Company",
  tagline: "Corporate Profile Setup Required",
  gstin: "N/A",
  phone: "N/A",
  email: "N/A",
  signatoryName: "Authorized Signatory",
  signatoryDesignation: "Signatory",
};
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${params.id}`);
      const data = await res.json();
      if (data.success && data.invoice) {
        setInvoice(data.invoice);
        setStatus(data.invoice.status);
        setPaidAmount(String(data.invoice.paidAmount || 0));
      } else {
        toast.error("Invoice not found");
      }

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.success && meData.company) {
        setCompany(meData.company);
      }
    } catch (e) {
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    const parsedPaid = Number(paidAmount);
    if (invoice && parsedPaid > invoice.grandTotal) {
      toast.error(`Paid amount cannot exceed the grand total (₹${invoice.grandTotal})`);
      return;
    }
    try {
      setUpdating(true);
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paidAmount: Number(paidAmount),
          revisionChangeNote: `Updated status to ${status} (Paid: ₹${paidAmount})`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invoice status updated!");
        fetchInvoice();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("Error updating invoice");
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/invoices/${params.id}/pdf`, "_blank");
  };





  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500 text-xs">
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs mt-8">
        <h2 className="text-base font-bold text-slate-900">Invoice Not Found</h2>
        <p className="text-xs text-slate-500">The invoice record could not be found or may have been deleted.</p>
        <Link href="/invoices">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
            Return to Invoices List
          </Button>
        </Link>
      </div>
    );
  }

  const grandTotal = Number(invoice.grandTotal || 0);
  const currentPaid = Number(paidAmount || 0);

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case "PAID":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "PARTIALLY_PAID":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "ISSUED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const billingAddr = [
    invoice.customerSnapshot?.billingAddress?.street || invoice.customerSnapshot?.billingAddress?.street1,
    invoice.customerSnapshot?.billingAddress?.city,
    invoice.customerSnapshot?.billingAddress?.state,
    invoice.customerSnapshot?.billingAddress?.pincode,
  ]
    .filter(Boolean)
    .join(", ");



  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/invoices">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-300 text-slate-700">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">{invoice.invoiceNumber}</h1>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadgeStyle(invoice.status)}`}>
                  {invoice.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {invoice.documentType.replace("_", " ")} • Created {new Date(invoice.issueDate).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link href={`/invoices/new?editId=${invoice._id}`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold border-slate-300 text-slate-700"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
            </Link>
            <Button
              onClick={handleDownloadPDF}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* Minimal Payment Status Update Bar */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-bold">Payment Status:</span>
            <span className="text-slate-600">
              Paid ₹{currentPaid.toLocaleString("en-IN")} of ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8 px-2 text-xs border border-slate-300 bg-white text-slate-900 font-medium rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ISSUED">Issued</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Paid (₹):</span>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-24 h-8 text-xs bg-white border-slate-300 text-slate-900 text-right font-semibold"
              />
            </div>

            <Button
              size="sm"
              disabled={updating}
              onClick={handleUpdateStatus}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 text-xs px-3"
            >
              {updating ? "Saving..." : "Update"}
            </Button>
          </div>
        </div>

        {/* Serious Corporate Document View */}
        {(() => {
          const cp = company || DEFAULT_COMPANY;
          return (
            <div className="bg-white p-8 sm:p-10 rounded-lg border border-slate-300 shadow-sm space-y-6 text-xs text-slate-900">
              {/* Header Banner */}
              <div className="bg-slate-900 text-white p-6 rounded-md flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-wide uppercase">{cp.name}</h2>
                  <p className="text-xs text-slate-300">{cp.tagline}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    GSTIN: {cp.gstin} | Ph: {cp.phone} | {cp.email}
                  </p>
                </div>
            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 w-full sm:w-auto">
              <span className="text-base font-bold uppercase tracking-wider text-amber-400 block">
                {invoice.documentType.replace("_", " ")}
              </span>
              <span className="text-xs font-mono text-slate-200 block">{invoice.invoiceNumber}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {invoice.documentType === "QUOTATION" || invoice.documentType === "ESTIMATE" ? "Estimate Date" : "Invoice Date"}: {new Date(invoice.issueDate).toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>

          {/* Customer & Invoice Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-md border border-slate-200">
            {/* Customer Details */}
            <div className="space-y-1.5">
              <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">BILLED TO / CUSTOMER</p>
              <p className="font-bold text-slate-900 text-sm">
                {invoice.customerSnapshot?.customerName || "Walk-in Customer"}
              </p>
              {invoice.customerSnapshot?.companyName && (
                <p className="text-slate-700 font-medium">Company: {invoice.customerSnapshot.companyName}</p>
              )}
              {invoice.customerSnapshot?.phone && (
                <p className="text-slate-600">Phone: {invoice.customerSnapshot.phone}</p>
              )}
              {invoice.customerSnapshot?.email && (
                <p className="text-slate-600">Email: {invoice.customerSnapshot.email}</p>
              )}
              {invoice.customerSnapshot?.gstin && (
                <p className="font-mono text-slate-700 font-medium">GSTIN: {invoice.customerSnapshot.gstin}</p>
              )}
              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                <p className="text-slate-700">
                  <strong className="text-slate-900">Billing Address:</strong> {billingAddr || "N/A"}
                </p>
              </div>
            </div>

            {/* Document Details */}
            <div className="space-y-1 text-slate-700 text-right md:border-l md:border-slate-200 md:pl-6">
              <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left md:text-right">
                DOCUMENT SPECIFICATIONS
              </p>
              <p className="pt-1">
                <strong className="text-slate-900">Valid Upto:</strong>{" "}
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : (invoice.paymentTerms || "30 Days")}
              </p>
              <p>
                <strong className="text-slate-900">Status:</strong> {invoice.status}
              </p>
            </div>
          </div>

          {/* Subject Block */}
          {invoice.subject && (
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Subject:</span>
              <p className="text-slate-900 font-bold">{invoice.subject}</p>
            </div>
          )}

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Disc (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.lineItems.map((item: any, idx: number) => {
                  const isAlt = idx % 2 === 1;
                  return (
                    <tr key={idx} className={isAlt ? "bg-slate-50" : "bg-white"}>
                      <td className="py-2.5 px-3 text-slate-500 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || "Pcs"}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        {Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                        {Number(item.discountAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        {Number(item.totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
 
          {/* Bill of Materials (BOM) Grid */}
          {invoice.bomItems && invoice.bomItems.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Bill of Materials (BOM)</h3>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2 px-3 w-12 text-center">#</th>
                      <th className="py-2 px-3">Component Name</th>
                      <th className="py-2 px-3">Specification</th>
                      <th className="py-2 px-3 text-right w-24">Qty</th>
                      <th className="py-2 px-3 w-24">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.bomItems.map((bom: any, idx: number) => {
                      const isAlt = idx % 2 === 1;
                      return (
                        <tr key={idx} className={isAlt ? "bg-slate-50" : "bg-white"}>
                          <td className="py-2 px-3 text-slate-500 text-center">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{bom.itemName}</td>
                          <td className="py-2 px-3 text-slate-600">{bom.specification || "N/A"}</td>
                          <td className="py-2 px-3 text-right text-slate-800 font-mono font-bold">{bom.quantity}</td>
                          <td className="py-2 px-3 text-slate-600">{bom.unit || "Pcs"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes & Financial Ledger Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="w-full sm:w-1/2 space-y-3">
              {invoice.notes && (
                <div>
                  <p className="font-bold text-slate-900 text-[11px]">Customer Notes:</p>
                  <p className="text-slate-600 text-xs mt-0.5">{invoice.notes}</p>
                </div>
              )}
              {invoice.termsAndConditions && (
                <div>
                  <p className="font-bold text-slate-900 text-[11px] mb-1">Terms & Conditions:</p>
                  <ul className="list-disc pl-4 text-slate-600 text-xs space-y-1">
                    {invoice.termsAndConditions.split("\n").filter((line: string) => line.trim() !== "").map((line: string, idx: number) => (
                      <li key={idx}>
                        {line.replace(/^\d+[\.\)]\s*/, "").trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900 font-mono">₹ {Number(invoice.subTotal || 0).toFixed(2)}</span>
              </div>

              {Number(invoice.totalDiscount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Total Discount:</span>
                  <span className="font-bold font-mono">- ₹ {Number(invoice.totalDiscount || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{invoice.gstCalculationMode === "OVERALL" ? `Overall Bill GST (${invoice.overallGstRate || 18}%):` : "Total GST Amount:"}</span>
                <span className="font-bold text-slate-900 font-mono">₹ {Number(invoice.gstAmount || 0).toFixed(2)}</span>
              </div>

              {Number(invoice.freightCharges) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Freight / Transport:</span>
                  <span className="font-bold text-slate-900 font-mono">₹ {Number(invoice.freightCharges || 0).toFixed(2)}</span>
                </div>
              )}

              {invoice.adjustmentAmount && Number(invoice.adjustmentAmount) !== 0 && (
                <div className={`flex justify-between ${Number(invoice.adjustmentAmount) < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  <span>Adjustment {invoice.adjustmentDescription ? `(${invoice.adjustmentDescription})` : ""}:</span>
                  <span className="font-bold font-mono">
                    {Number(invoice.adjustmentAmount) > 0 ? "+" : ""} ₹ {Number(invoice.adjustmentAmount).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300 mt-2">
                <span>Grand Total:</span>
                <span className="text-amber-700 font-mono text-base">
                  ₹ {Number(invoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 pt-2 border-t border-dashed border-slate-200">
                <span>Amount Received:</span>
                <span className="font-bold text-slate-900 font-mono">₹ {Number(invoice.paidAmount || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-700 font-bold">
                <span>Balance Amount:</span>
                <span className="text-amber-800 font-mono font-bold">
                  ₹ {Math.max(0, Number(invoice.grandTotal || 0) - Number(invoice.paidAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Authorised Signatory Footer */}
          <div className="pt-10 flex justify-between items-end border-t border-slate-200 text-slate-500">
            <p className="text-[10px]">Computer Generated Document • {cp.name}</p>
            <div className="text-center flex flex-col items-center">
              {invoice.signatorySignatureUrl ? (
                <img
                  src={invoice.signatorySignatureUrl}
                  alt={`${invoice.signatoryName || cp.signatoryName} Signature`}
                  className="h-12 max-w-[160px] object-contain mb-1"
                />
              ) : (
                <div className="h-8" />
              )}
              <p className="text-xs font-bold text-slate-900">{invoice.signatoryName || cp.signatoryName}</p>
              <div className="w-44 border-b border-slate-400 my-1" />
              <p className="text-xs font-bold text-slate-800">{invoice.signatoryDesignation || cp.signatoryDesignation}</p>
            </div>
          </div>
        </div>
      );
    })()}

        {/* Audit History Log */}
        {invoice.revisionHistory && invoice.revisionHistory.length > 0 && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              <span>Audit & Revision Log</span>
            </h3>
            <div className="space-y-2 pl-2">
              {invoice.revisionHistory.map((rev: any, idx: number) => (
                <div key={idx} className="text-xs border-l-2 border-slate-400 pl-3 py-0.5">
                  <p className="font-medium text-slate-800">{rev.changes}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(rev.revisedAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}
