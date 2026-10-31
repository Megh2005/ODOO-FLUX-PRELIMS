"use client";

import { useEffect, useState } from "react";
import {
  TbPlus,
  TbSearch,
  TbDownload,
  TbEdit,
  TbTrash,
  TbReceiptTax,
  TbBuildingWarehouse,
  TbPhone,
  TbMail,
} from "react-icons/tb";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportCustomersToExcel } from "@/lib/excelExporter";
import { getIndianStates, getCitiesOfIndianState } from "@/lib/indianLocations";
import { toast } from "sonner";
import Link from "next/link";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("ALL");

  // Dialog & Ledger States
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedCustomerLedger, setSelectedCustomerLedger] = useState<any>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Indian States & Cities Cascading Data
  const indianStates = getIndianStates();

  // Customer Form State (Structured Address Schema)
  const [formData, setFormData] = useState({
    customerType: "INDIVIDUAL",
    salutation: "Mr",
    customerName: "",
    companyName: "",
    contactPersonName: "",
    email: "",
    phone: "",
    gstin: "",
    gstTreatment: "BUSINESS_GST",
    placeOfSupply: "Maharashtra",
    street1: "",
    street2: "",
    state: "Maharashtra",
    city: "Mumbai",
    pincode: "",
    projectReferences: "",
    notes: "",
  });

  // Filtered Cities based on selected state
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [search, customerTypeFilter]);

  // Update cities whenever selected state changes
  useEffect(() => {
    if (formData.state) {
      const cities = getCitiesOfIndianState(formData.state);
      setAvailableCities(cities);
    } else {
      setAvailableCities([]);
    }
  }, [formData.state]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (customerTypeFilter !== "ALL") params.append("customerType", customerTypeFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load customer list");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setFormData({
      customerType: "INDIVIDUAL",
      salutation: "Mr",
      customerName: "",
      companyName: "",
      contactPersonName: "",
      email: "",
      phone: "",
      gstin: "",
      gstTreatment: "BUSINESS_GST",
      placeOfSupply: "Maharashtra",
      street1: "",
      street2: "",
      state: "Maharashtra",
      city: "Mumbai",
      pincode: "",
      projectReferences: "",
      notes: "",
    });
    setCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: any) => {
    setEditingCustomer(cust);
    const stateVal = cust.billingAddress?.state || cust.placeOfSupply || "Maharashtra";
    setFormData({
      customerType: cust.customerType || "INDIVIDUAL",
      salutation: cust.salutation || "Mr",
      customerName: cust.customerName,
      companyName: cust.companyName || "",
      contactPersonName: cust.contactPersonName || "",
      email: cust.email || "",
      phone: cust.phone || "",
      gstin: cust.gstin || "",
      gstTreatment: cust.gstTreatment || "BUSINESS_GST",
      placeOfSupply: cust.placeOfSupply || stateVal,
      street1: cust.billingAddress?.street1 || cust.billingAddress?.street || "",
      street2: cust.billingAddress?.street2 || "",
      state: stateVal,
      city: cust.billingAddress?.city || "Mumbai",
      pincode: cust.billingAddress?.pincode || "",
      projectReferences: (cust.projectReferences || []).join(", "),
      notes: cust.notes || "",
    });
    setCustomerModalOpen(true);
  };

  const handleStateChange = (selectedState: string) => {
    const cities = getCitiesOfIndianState(selectedState);
    setAvailableCities(cities);
    setFormData({
      ...formData,
      state: selectedState,
      placeOfSupply: selectedState,
      city: cities.length > 0 ? cities[0] : "",
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName) {
      toast.error("Customer / Business name is required");
      return;
    }
    if (!formData.phone || !/^\d{10}$/.test(formData.phone.trim())) {
      toast.error("Mobile number must be strictly 10 numeric digits without country code or special characters");
      return;
    }
    if (formData.customerType === "BUSINESS" && !formData.contactPersonName) {
      toast.error("Point of Contact name is required for Business customers");
      return;
    }
    if (!formData.street1) {
      toast.error("Street Address 1 is mandatory");
      return;
    }
    if (!formData.state) {
      toast.error("Please select a State");
      return;
    }
    if (!formData.city) {
      toast.error("Please select a City");
      return;
    }
    if (!formData.pincode) {
      toast.error("Pincode is mandatory");
      return;
    }

    try {
      setSavingCustomer(true);
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const payload = {
        customerType: formData.customerType,
        salutation: formData.salutation,
        customerName: formData.customerName,
        companyName: formData.customerType === "BUSINESS" ? formData.companyName || formData.customerName : undefined,
        contactPersonName: formData.contactPersonName,
        email: formData.email,
        phone: formData.phone,
        gstin: formData.gstin,
        gstTreatment: formData.gstTreatment,
        placeOfSupply: formData.state,
        billingAddress: {
          street: formData.street1,
          street1: formData.street1,
          street2: formData.street2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India",
        },
        shippingAddress: {
          street: formData.street1,
          street1: formData.street1,
          street2: formData.street2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India",
        },
        projectReferences: formData.projectReferences
          ? formData.projectReferences.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        notes: formData.notes,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(editingCustomer ? "Customer updated!" : "Customer created!");
        setCustomerModalOpen(false);
        fetchCustomers();
      } else {
        toast.error(result.error || "Failed to save customer");
      }
    } catch (e) {
      toast.error("Error saving customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (cust: any) => {
    if (!confirm(`Are you sure you want to permanently delete customer "${cust.customerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/customers/${cust._id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success(`Customer "${cust.customerName}" permanently deleted`);
        fetchCustomers();
      } else {
        toast.error(result.error || "Failed to delete customer");
      }
    } catch (e) {
      toast.error("Error deleting customer");
    }
  };

  const handleOpenLedger = async (cust: any) => {
    setSelectedCustomerLedger(cust);
    try {
      const res = await fetch(`/api/customers/${cust._id}`);
      const data = await res.json();
      if (data.success) {
        setCustomerInvoices(data.invoices || []);
        setLedgerModalOpen(true);
      }
    } catch (e) {
      toast.error("Failed to load customer ledger");
    }
  };

  const handleExportExcel = () => {
    if (customers.length === 0) {
      toast.error("No customers available to export");
      return;
    }
    exportCustomersToExcel(customers);
    toast.success("Customer Directory exported to Excel!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 md:px-6">
        {/* Top Header Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Customer Directory & Ledgers</h1>
            <p className="text-xs text-slate-500">
              Manage individual & business clients, POCs, GSTINs, structured addresses, and ledgers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold border-slate-300 text-slate-700"
            >
              <TbDownload className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
            <Button
              onClick={handleOpenAddCustomer}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
            >
              <TbPlus className="w-4 h-4" />
              <span>Add New Customer</span>
            </Button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <TbSearch className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search customer name, company, POC, phone, city, state, or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200"
            />
          </div>

          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
            className="w-full md:w-52 h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="ALL">All Customer Types</option>
            <option value="INDIVIDUAL">Individual Clients</option>
            <option value="BUSINESS">Business / Corporate</option>
          </select>
        </div>

        {/* Customer Directory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Contact Person (POC)</th>
                  <th className="py-3 px-3">Address & Location</th>
                  <th className="py-3 px-3">GSTIN</th>
                  <th className="py-3 px-3 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading customer directory...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No customers found. Click "+ Add New Customer" to register one.
                    </td>
                  </tr>
                ) : (
                  customers.map((cust) => (
                    <tr key={cust._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            {cust.customerType === "INDIVIDUAL" && cust.salutation ? `${cust.salutation}. ` : ""}
                            {cust.customerName}
                          </p>
                          {cust.companyName && cust.companyName !== cust.customerName && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <TbBuildingWarehouse className="w-3 h-3 text-slate-400" />
                              <span>{cust.companyName}</span>
                            </p>
                          )}
                          {cust.email && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <TbMail className="w-3 h-3 text-slate-400" />
                              <span>{cust.email}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.customerType === "BUSINESS"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {cust.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {cust.customerType === "BUSINESS" ? cust.contactPersonName || "-" : cust.customerName}
                        {cust.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <TbPhone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <p className="font-medium text-slate-900">
                          {cust.billingAddress?.city || cust.city || "Mumbai"}, {cust.billingAddress?.state || cust.placeOfSupply || "Maharashtra"}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {cust.billingAddress?.street1 || cust.billingAddress?.street || "-"}
                          {cust.billingAddress?.pincode ? ` - ${cust.billingAddress.pincode}` : ""}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 uppercase">
                        <span className="font-bold text-slate-800">{cust.gstin || "N/A"}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black ${
                            cust.outstandingBalance > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          ₹ {Number(cust.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            title="View Ledger & Invoices"
                            onClick={() => handleOpenLedger(cust)}
                            className="h-8 px-2 text-xs border-slate-300 text-slate-700 gap-1 font-semibold"
                          >
                            <TbReceiptTax className="w-4 h-4 text-slate-600" />
                            <span>Ledger</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit Customer"
                            onClick={() => handleOpenEditCustomer(cust)}
                            className="h-8 px-2 text-xs border-slate-300 text-slate-600"
                          >
                            <TbEdit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Customer Permanently"
                            onClick={() => handleDeleteCustomer(cust)}
                            className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <TbTrash className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Customer Dialog (Structured Address Schema with country-state-city) */}
        <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
          <DialogContent className="bg-white border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HiOutlineUserGroup className="w-5 h-5 text-amber-600" />
                <span>{editingCustomer ? "Edit Customer Profile" : "Register Customer with Address Schema"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Formal Customer creation with cascading Indian State & City selection, POC, and mandatory address schema.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveCustomer} className="space-y-4 pt-3">
              {/* Type Switcher Bar */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, customerType: "INDIVIDUAL" })}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    formData.customerType === "INDIVIDUAL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Individual Client
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, customerType: "BUSINESS" })}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    formData.customerType === "BUSINESS"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Business Entity
                </button>
              </div>

              {formData.customerType === "INDIVIDUAL" ? (
                /* Individual Customer Fields */
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Salutation</Label>
                      <select
                        value={formData.salutation}
                        onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                        className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      >
                        <option value="Mr">Mr.</option>
                        <option value="Mrs">Mrs.</option>
                        <option value="Ms">Ms.</option>
                        <option value="Dr">Dr.</option>
                        <option value="Er">Er.</option>
                        <option value="Prof">Prof.</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-bold text-slate-700">Individual Full Name *</Label>
                      <Input
                        required
                        placeholder="e.g. Ramesh Chandra"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        className="mt-1 h-9 text-xs border-slate-200 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Mobile Number * (10 Digits)</Label>
                      <Input
                        required
                        placeholder="9876543210"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        className="mt-1 h-9 text-xs border-slate-200 bg-white font-mono tracking-wider"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="ramesh@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 h-9 text-xs border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Business Customer Fields */
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-bold text-slate-700">Business / Company Name *</Label>
                      <Input
                        required
                        placeholder="e.g. Sharma Constructions Pvt Ltd"
                        value={formData.customerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerName: e.target.value,
                            companyName: e.target.value,
                          })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">GST Treatment</Label>
                      <select
                        value={formData.gstTreatment}
                        onChange={(e) => setFormData({ ...formData, gstTreatment: e.target.value })}
                        className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      >
                        <option value="BUSINESS_GST">Business GST Registered</option>
                        <option value="CONSUMER">Consumer / Retail</option>
                        <option value="UNREGISTERED">Unregistered Business</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">GSTIN Number</Label>
                      <Input
                        placeholder="27ABCDE1234F1Z5"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        className="mt-1 h-9 text-xs border-slate-200 bg-white uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <Label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                      Point of Contact (POC) Specification
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700">POC Person Name *</Label>
                        <Input
                          required
                          placeholder="e.g. Suresh Kumar (Site Manager)"
                          value={formData.contactPersonName}
                          onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                          className="mt-1 h-9 text-xs border-slate-200 bg-slate-50/50"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700">POC Contact Number * (10 Digits)</Label>
                        <Input
                          required
                          placeholder="9876543210"
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                          className="mt-1 h-9 text-xs border-slate-200 bg-slate-50/50 font-mono tracking-wider"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700">Business Email Address</Label>
                        <Input
                          type="email"
                          placeholder="billing@sharmaconst.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 h-9 text-xs border-slate-200 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Structured Address Schema Section (Strict 2 Streets, Cascading State -> City, Integer Pincode) */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <Label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-1">
                  Billing & Shipping Address Specification
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Street Address 1 * (Mandatory)</Label>
                    <Input
                      required
                      placeholder="e.g. Flat / Plot No, Building Name, Industrial Area"
                      value={formData.street1}
                      onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Street Address 2 (Optional)</Label>
                    <Input
                      placeholder="e.g. Landmark, Near Metro Station"
                      value={formData.street2}
                      onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">State * (Indian States)</Label>
                    <select
                      value={formData.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {indianStates.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">City * (Filtered by Selected State)</Label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={availableCities.length === 0}
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium disabled:opacity-50"
                    >
                      {availableCities.length === 0 ? (
                        <option value="">Select State first</option>
                      ) : (
                        availableCities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Pincode * (6-Digit Integer)</Label>
                    <Input
                      type="number"
                      required
                      placeholder="e.g. 400001"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Project References */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
                <Label className="text-[11px] font-bold text-slate-700 shrink-0">Project References:</Label>
                <Input
                  placeholder="e.g. Villa Project Site A, Highway Block B (Comma separated)"
                  value={formData.projectReferences}
                  onChange={(e) => setFormData({ ...formData, projectReferences: e.target.value })}
                  className="h-9 text-xs border-slate-200 bg-white"
                />
              </div>

              <DialogFooter className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(false)} className="h-9 px-4 text-xs font-semibold" disabled={savingCustomer}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-5 shadow-xs" disabled={savingCustomer}>
                  {savingCustomer ? "Saving..." : editingCustomer ? "Save Changes" : "Register Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Ledger History Dialog */}
        <Dialog open={ledgerModalOpen} onOpenChange={setLedgerModalOpen}>
          <DialogContent className="bg-white border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TbReceiptTax className="w-5 h-5 text-amber-600" />
                <span>Customer Ledger: {selectedCustomerLedger?.customerName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Complete billing transaction log and ledger statement for {selectedCustomerLedger?.customerName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs">
              <div className="grid grid-cols-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-500 text-[11px]">Registered Name</p>
                  <p className="font-bold text-slate-900">{selectedCustomerLedger?.customerName}</p>
                  <p className="text-slate-400 text-[10px]">{selectedCustomerLedger?.email || "No email"}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-[11px]">Outstanding Balance</p>
                  <p className="font-black text-amber-700 text-sm">
                    ₹ {Number(selectedCustomerLedger?.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Document #</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No invoices recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      customerInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">{new Date(inv.issueDate).toLocaleDateString("en-IN")}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600">
                            <Link href={`/invoices/${inv._id}`}>{inv.invoiceNumber}</Link>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            ₹ {Number(inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
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
          </DialogContent>
        </Dialog>
      </div>
  );
}
