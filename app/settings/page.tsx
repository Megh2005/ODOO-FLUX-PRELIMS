"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TbBuilding,
  TbUserCheck,
  TbMapPin,
  TbTrash,
  TbPlus,
  TbDeviceFloppy,
  TbArrowLeft,
  TbBuildingBank,
  TbUpload,
} from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getIndianStates, getCitiesOfIndianState } from "@/lib/indianLocations";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

interface Signatory {
  name: string;
  designation: string;
  signatureUrl?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    email: "",
    phone: "",
    gstin: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    pincode: "",
    logoUrl: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoImageSrc, setLogoImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [signatories, setSignatories] = useState<Signatory[]>([{ name: "", designation: "" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const statesList = getIndianStates();

  // Load existing company data
  useEffect(() => {
    async function loadCompanyData() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.success) {
          router.push("/login");
          return;
        }
        if (!data.company) {
          router.push("/setup-company");
          return;
        }
        const c = data.company;
        setFormData({
          name: c.name || "",
          tagline: c.tagline || "",
          email: c.email || "",
          phone: c.phone || "",
          gstin: c.gstin || "",
          street1: c.address?.street1 || "",
          street2: c.address?.street2 || "",
          city: c.address?.city || "",
          state: c.address?.state || "",
          pincode: c.address?.pincode || "",
          logoUrl: c.logoUrl || "",
        });
        if (c.address?.state) {
          setCitiesList(getCitiesOfIndianState(c.address.state));
        }
        if (c.signatories && c.signatories.length > 0) {
          setSignatories(c.signatories);
        } else if (c.signatoryName) {
          setSignatories([{ name: c.signatoryName, designation: c.signatoryDesignation || "" }]);
        }
      } catch (e) {
        toast.error("Failed to load company details");
      } finally {
        setLoading(false);
      }
    }
    loadCompanyData();
  }, [router]);

  const handleStateChange = (state: string) => {
    const cities = getCitiesOfIndianState(state);
    setCitiesList(cities);
    setFormData((prev) => ({ ...prev, state, city: cities[0] || "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "Company name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    if (!formData.phone.trim()) e.phone = "Phone is required";
    else if (!/^\d{10}$/.test(formData.phone.trim())) e.phone = "Phone must be exactly 10 digits";
    if (!formData.street1.trim()) e.street1 = "Street address is required";
    if (!formData.state) e.state = "State is required";
    if (!formData.city) e.city = "City is required";
    if (!formData.pincode.trim()) e.pincode = "Pincode is required";
    signatories.forEach((s, i) => {
      if (!s.name.trim()) e[`sig_name_${i}`] = "Signatory name is required";
      if (!s.designation.trim()) e[`sig_des_${i}`] = "Designation is required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCropComplete = async () => {
    if (!logoImageSrc || !croppedAreaPixels) return;
    try {
      setIsUploadingLogo(true);
      const croppedImageBlob = await getCroppedImg(logoImageSrc, croppedAreaPixels, rotation);
      if (!croppedImageBlob) throw new Error("Failed to crop image");

      const fd = new FormData();
      fd.append("file", croppedImageBlob, "logo.jpg");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, logoUrl: data.url }));
        toast.success("Logo uploaded successfully!");
        setIsCropModalOpen(false);
      } else {
        toast.error(data.error || "Failed to upload logo");
      }
    } catch (e) {
      toast.error("Error cropping or uploading logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the validation errors before saving.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gstin: formData.gstin.trim(),
        address: {
          street1: formData.street1.trim(),
          street2: formData.street2.trim(),
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode.trim(),
          country: "India",
        },
        signatories,
        logoUrl: formData.logoUrl,
      };
      const res = await fetch("/api/auth/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Organisation details updated successfully!");
      } else {
        toast.error(result.error || "Failed to update organisation details");
      }
    } catch (err) {
      toast.error("Error saving organisation details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading organisation details...</p>
        </div>
      </div>
    );
  }

  const sectionCard = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5";
  const inputCls = "h-9 text-xs border-slate-200 bg-white font-medium";
  const labelCls = "text-[11px] font-bold text-slate-700";
  const errorCls = "text-[10px] text-red-500 font-semibold mt-0.5";
  const sectionTitle = (Icon: any, label: string) => (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-amber-600" />
      </div>
      <span className="text-sm font-bold text-slate-900">{label}</span>
    </div>
  );

  return (
    <div className="py-6 px-4 md:px-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-7">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <TbArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Organisation Settings</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Edit your company profile, address, and authorised signatories.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Company Profile ── */}
        <div className={sectionCard}>
          {sectionTitle(TbBuilding, "Company Profile")}

          {/* Logo Upload Section */}
          <div className="flex flex-col md:flex-row items-center justify-between p-4 mb-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="relative shrink-0">
                {formData.logoUrl ? (
                  <div className="w-20 h-20 rounded-full border border-slate-200 overflow-hidden bg-white shadow-sm flex items-center justify-center relative">
                    <img src={formData.logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                    <TbBuilding className="w-6 h-6 opacity-50 mb-0.5" />
                    <span className="text-[9px] font-bold">No Logo</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-bold text-slate-900">Organisation Logo</Label>
                <p className="text-[11px] text-slate-500 max-w-xs">Upload your business logo. It will be cropped into a circle automatically.</p>
              </div>
            </div>
            
            <label className="mt-4 md:mt-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm">
              <TbUpload className="w-4 h-4 text-slate-500" />
              <span>{formData.logoUrl ? "Update Logo" : "Upload Logo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoFile(file);
                  const reader = new FileReader();
                  reader.onload = () => {
                    setLogoImageSrc(reader.result as string);
                    setIsCropModalOpen(true);
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={labelCls}>Company Name *</Label>
              <Input
                className={`${inputCls} mt-1 ${errors.name ? "border-red-400" : ""}`}
                placeholder="e.g. Apex Builders Pvt Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className={errorCls}>{errors.name}</p>}
            </div>
            <div>
              <Label className={labelCls}>Tagline / Slogan</Label>
              <Input
                className={`${inputCls} mt-1`}
                placeholder="e.g. Building India's Future"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className={labelCls}>Email Address *</Label>
              <Input
                type="email"
                className={`${inputCls} mt-1 bg-slate-50 cursor-not-allowed`}
                value={formData.email}
                readOnly
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Email is linked to your login account</p>
            </div>
            <div>
              <Label className={labelCls}>Phone Number * (10 digits)</Label>
              <Input
                className={`${inputCls} mt-1 ${errors.phone ? "border-red-400" : ""}`}
                placeholder="9876543210"
                value={formData.phone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFormData({ ...formData, phone: val });
                }}
              />
              {errors.phone && <p className={errorCls}>{errors.phone}</p>}
            </div>
            <div>
              <Label className={labelCls}>GSTIN (Optional)</Label>
              <Input
                className={`${inputCls} mt-1 uppercase font-mono`}
                placeholder="22AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Registered Address ── */}
        <div className={sectionCard}>
          {sectionTitle(TbMapPin, "Registered Address")}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={labelCls}>Street Address Line 1 *</Label>
              <Input
                className={`${inputCls} mt-1 ${errors.street1 ? "border-red-400" : ""}`}
                placeholder="Plot / Building / Area"
                value={formData.street1}
                onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
              />
              {errors.street1 && <p className={errorCls}>{errors.street1}</p>}
            </div>
            <div>
              <Label className={labelCls}>Street Address Line 2 (Optional)</Label>
              <Input
                className={`${inputCls} mt-1`}
                placeholder="Landmark / Near..."
                value={formData.street2}
                onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className={labelCls}>State *</Label>
              <select
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className={`mt-1 w-full h-9 px-3 text-xs bg-white border rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  errors.state ? "border-red-400" : "border-slate-200"
                }`}
              >
                <option value="">Select State...</option>
                {statesList.map((s) => (
                  <option key={s.code} value={s.name}>{s.name}</option>
                ))}
              </select>
              {errors.state && <p className={errorCls}>{errors.state}</p>}
            </div>

            <div>
              <Label className={labelCls}>City *</Label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={citiesList.length === 0}
                className={`mt-1 w-full h-9 px-3 text-xs bg-white border rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 ${
                  errors.city ? "border-red-400" : "border-slate-200"
                }`}
              >
                <option value="">Select City...</option>
                {citiesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.city && <p className={errorCls}>{errors.city}</p>}
            </div>

            <div>
              <Label className={labelCls}>Pincode *</Label>
              <Input
                className={`${inputCls} mt-1 font-mono ${errors.pincode ? "border-red-400" : ""}`}
                placeholder="400001"
                value={formData.pincode}
                maxLength={6}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setFormData({ ...formData, pincode: val });
                }}
              />
              {errors.pincode && <p className={errorCls}>{errors.pincode}</p>}
            </div>
          </div>

          <div>
            <Label className={labelCls}>Country</Label>
            <Input
              className={`${inputCls} mt-1 bg-slate-50 cursor-not-allowed`}
              value="India"
              readOnly
            />
          </div>
        </div>

        {/* ── Section 3: Authorised Signatories ── */}
        <div className={sectionCard}>
          {sectionTitle(TbUserCheck, "Authorised Signatories")}
          <p className="text-[11px] text-slate-500 -mt-2">
            The first signatory is used as the primary/default on all invoices.
          </p>

          <div className="space-y-3">
            {signatories.map((sig, i) => (
              <div key={i} className="flex gap-3 items-start bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>
                      Signatory Name *{i === 0 && <span className="text-amber-600 ml-1">(Primary)</span>}
                    </Label>
                    <Input
                      className={`${inputCls} mt-1 ${errors[`sig_name_${i}`] ? "border-red-400" : ""}`}
                      placeholder="e.g. Rajesh Kumar"
                      value={sig.name}
                      onChange={(e) => {
                        const updated = [...signatories];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setSignatories(updated);
                      }}
                    />
                    {errors[`sig_name_${i}`] && <p className={errorCls}>{errors[`sig_name_${i}`]}</p>}
                  </div>
                  <div>
                    <Label className={labelCls}>Designation *</Label>
                    <Input
                      className={`${inputCls} mt-1 ${errors[`sig_des_${i}`] ? "border-red-400" : ""}`}
                      placeholder="e.g. Managing Director"
                      value={sig.designation}
                      onChange={(e) => {
                        const updated = [...signatories];
                        updated[i] = { ...updated[i], designation: e.target.value };
                        setSignatories(updated);
                      }}
                    />
                    {errors[`sig_des_${i}`] && <p className={errorCls}>{errors[`sig_des_${i}`]}</p>}
                  </div>

                  {/* Signature Upload & Background Removal Section */}
                  <div className="col-span-full pt-2 border-t border-slate-200/60 mt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-bold text-slate-700">Digital Signature Image</Label>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          💡 <strong className="text-slate-700">Instruction:</strong> Upload your signature written in <strong className="text-slate-800">black ink on a plain white paper</strong>. The white background will be automatically removed into a transparent landscape signature.
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {sig.signatureUrl ? (
                          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
                            <img
                              src={sig.signatureUrl}
                              alt={`${sig.name || "Signatory"} signature`}
                              className="h-8 w-24 object-contain bg-slate-100/60 rounded border border-slate-200/60"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...signatories];
                                updated[i] = { ...updated[i], signatureUrl: "" };
                                setSignatories(updated);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors text-xs"
                              title="Remove Signature"
                            >
                              <TbTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 text-xs font-bold transition-all">
                            <TbUpload className="w-3.5 h-3.5 text-amber-600" />
                            <span>Upload Signature</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  toast.loading(`Processing & removing background for ${sig.name || "Signatory"}...`, { id: `sig-upload-${i}` });
                                  const fd = new FormData();
                                  fd.append("file", file);
                                  fd.append("isSignature", "true");
                                  const res = await fetch("/api/upload", {
                                    method: "POST",
                                    body: fd,
                                  });
                                  const data = await res.json();
                                  if (data.success && data.url) {
                                    const updated = [...signatories];
                                    updated[i] = { ...updated[i], signatureUrl: data.url };
                                    setSignatories(updated);
                                    toast.success("Signature background removed & uploaded successfully!", { id: `sig-upload-${i}` });
                                  } else {
                                    toast.error(data.error || "Failed to upload signature", { id: `sig-upload-${i}` });
                                  }
                                } catch (err) {
                                  toast.error("Error processing signature image", { id: `sig-upload-${i}` });
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {signatories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSignatories(signatories.filter((_, idx) => idx !== i))}
                    className="mt-5 h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                  >
                    <TbTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSignatories([...signatories, { name: "", designation: "" }])}
            className="flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
          >
            <TbPlus className="w-4 h-4" />
            Add Another Signatory
          </button>
        </div>

        {/* ── Footer Save Button ── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-400">Changes take effect immediately across all invoices and PDFs.</p>
          <Button
            type="submit"
            disabled={saving}
            className="h-10 px-8 text-sm font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl gap-2 shadow-md transition-all duration-200"
          >
            <TbDeviceFloppy className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Crop Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">Crop Company Logo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-72 bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
            {logoImageSrc && (
              <Cropper
                image={logoImageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onRotationChange={setRotation}
                onCropComplete={(croppedArea, croppedAreaPixels) => {
                  setCroppedAreaPixels(croppedAreaPixels as any);
                }}
                onZoomChange={setZoom}
              />
            )}
          </div>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Zoom</Label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Rotation</Label>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                aria-labelledby="Rotation"
                onChange={(e) => {
                  setRotation(Number(e.target.value));
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center gap-2 sm:justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCropModalOpen(false)} className="text-xs font-bold h-9">
              Cancel
            </Button>
            <Button type="button" onClick={handleCropComplete} disabled={isUploadingLogo} className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold h-9 px-6">
              {isUploadingLogo ? "Uploading..." : "Apply & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
