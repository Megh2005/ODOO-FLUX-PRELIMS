"use client";

import { useEffect, useState } from "react";
import {
  TbBox,
  TbCurrencyRupee,
  TbTrendingUp,
  TbPlus,
  TbSparkles,
  TbArrowUpRight,
  TbCircleCheck,
  TbClock,
  TbChartPie,
} from "react-icons/tb";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

const COLORS = ["#10b981", "#f59e0b"]; // Paid (Emerald Green), Due (Amber/Orange)
const EMPTY_COLOR = "#cbd5e1"; // Slate 300 for empty state

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  const totalSales = Number(data?.stats?.totalSales || 0);
  const totalPaid = Number(data?.stats?.totalPaid || 0);
  const totalDue = Number(data?.stats?.totalDue || 0);
  const totalPurchaseValuation = Number(
    data?.stats?.totalPurchaseValuation || 0,
  );

  const hasSalesData = totalSales > 0;

  const pieChartData = hasSalesData
    ? [
        { name: "Paid Amount", value: totalPaid },
        { name: "Due Amount", value: totalDue },
      ]
    : [{ name: "No Sales Recorded", value: 1 }];

  const paidPercentage = hasSalesData
    ? Math.round((totalPaid / totalSales) * 100)
    : 0;
  const duePercentage = hasSalesData ? 100 - paidPercentage : 0;

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (!hasSalesData || percent === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-black"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const itemData = payload[0];
      if (!hasSalesData) {
        return (
          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-md font-medium">
            No sales recorded yet
          </div>
        );
      }
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-lg border border-slate-700 space-y-1">
          <p
            className="font-bold flex items-center gap-1.5"
            style={{ color: itemData.color }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: itemData.color }}
            />
            {itemData.name}
          </p>
          <p className="font-mono font-bold text-sm">
            ₹{" "}
            {Number(itemData.value).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[10px] text-slate-400">
            {((Number(itemData.value) / totalSales) * 100).toFixed(1)}% of total
            sales revenue
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 md:px-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-slate-950 text-white p-7 rounded-2xl border border-slate-800 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <TbSparkles className="w-3.5 h-3.5" />
              <span>Sutra Management Console</span>
            </div>
            <h1 className="text-2xl font-black  text-white">
              Enterprise Inventory & Billing Overview
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time inventory valuation and billing management.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/invoices/new">
              <Button
                size="sm"
                className="gap-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md h-9 px-4"
              >
                <TbPlus className="w-4 h-4" />
                <span>Create Invoice</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Purchase Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Purchase Stock Value
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <TbCurrencyRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 ">
              {loading
                ? "..."
                : `₹ ${totalPurchaseValuation.toLocaleString("en-IN")}`}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-[11px] text-slate-500">
                Cost value of current inventory
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Total Paid Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Collected Sales (Paid)
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TbCircleCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 ">
              {loading ? "..." : `₹ ${totalPaid.toLocaleString("en-IN")}`}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[11px] text-slate-500">
                {hasSalesData
                  ? `${paidPercentage}% of total sales collected`
                  : "Total received payment"}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Total Due Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Sales (Due)
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <TbClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700 ">
              {loading ? "..." : `₹ ${totalDue.toLocaleString("en-IN")}`}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-[11px] text-slate-500">
                {hasSalesData
                  ? `${duePercentage}% pending collection`
                  : "Total pending dues"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Revenue Breakdown Pie Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <TbChartPie className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Sales Revenue Breakdown (Paid vs. Due)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual distribution of settled payments versus outstanding
              receivables
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Sales Revenue
              </span>
              <span className="text-base font-black text-slate-900">
                ₹{" "}
                {loading
                  ? "..."
                  : totalSales.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-4">
          {/* Pie Chart Graphical Container */}
          <div className="lg:col-span-7 h-72 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <defs>
                  {/* Paid Slice 3D Gradient */}
                  <linearGradient
                    id="paid3DGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>

                  {/* Due Slice 3D Gradient */}
                  <linearGradient
                    id="due3DGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>

                  {/* 3D Soft Drop Shadow Filter */}
                  <filter
                    id="pie3dShadow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feDropShadow
                      dx="2"
                      dy="5"
                      stdDeviation="4"
                      floodColor="#0f172a"
                      floodOpacity="0.16"
                    />
                  </filter>
                </defs>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={105}
                  innerRadius={58}
                  paddingAngle={hasSalesData ? 5 : 0}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => {
                    const fill = hasSalesData
                      ? index === 0
                        ? "url(#paid3DGradient)"
                        : "url(#due3DGradient)"
                      : EMPTY_COLOR;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fill}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        style={{ filter: "url(#pie3dShadow)" }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-xs font-bold text-slate-700 mx-2">
                      {value}
                    </span>
                  )}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Side Summary Breakdown Cards */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Paid Card */}
            <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">
                    Paid Sales Revenue
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 pl-5">
                  Successfully collected payments
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-emerald-800 font-mono">
                  ₹{" "}
                  {totalPaid.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[10px] font-bold text-emerald-600">
                  {paidPercentage}% of Total
                </div>
              </div>
            </div>

            {/* Due Card */}
            <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-amber-950">
                    Outstanding Due Sales
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 pl-5">
                  Pending customer collection
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-amber-800 font-mono">
                  ₹{" "}
                  {totalDue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[10px] font-bold text-amber-600">
                  {duePercentage}% of Total
                </div>
              </div>
            </div>

            {/* Total Balance Info Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Overall Revenue Recovery Rate</span>
              <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {hasSalesData ? `${paidPercentage}% Settled` : "No Sales Yet"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Recent Generated Invoices
            </h3>
            <p className="text-xs text-slate-500">
              Latest issued billing documents
            </p>
          </div>
          <Link href="/invoices">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-slate-600 hover:text-slate-900 font-bold"
            >
              <span>View All Invoices</span>
              <TbArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-3">Invoice Number</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Issue Date</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : !data?.recentInvoices || data.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No recent invoices recorded.
                  </td>
                </tr>
              ) : (
                data.recentInvoices.map((inv: any) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {inv.documentType.replace("_", " ")}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <Link
                        href={`/invoices/${inv._id}`}
                        className="hover:underline text-blue-600"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {inv.customerSnapshot?.customerName || "Walk-in Customer"}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(inv.issueDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      ₹{" "}
                      {Number(inv.grandTotal).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
