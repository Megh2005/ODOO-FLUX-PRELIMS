"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TbBuilding,
  TbUserCheck,
  TbMapPin,
  TbMail,
  TbPhone,
  TbFileInvoice,
  TbTrash,
  TbPlus,
  TbChevronLeft,
  TbChevronRight,
  TbUpload,
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
import { getIndianStates, getCitiesOfIndianState } from "@/lib/indianLocations";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

interface Signatory {
  name: string;
  designation: string;
  signatureUrl?: string;
}

export default function SetupCompanyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
    country: "India",
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

  const [signatories, setSignatories] = useState<Signatory[]>([
    { name: "", designation: "" },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const statesList = getIndianStates();

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedForm = localStorage.getItem("sutra_setup_form") || localStorage.getItem("manageopedia_setup_form");
      if (savedForm) {
        const parsed = JSON.parse(savedForm);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }

      const savedSignatories = localStorage.getItem("sutra_setup_signatories") || localStorage.getItem("manageopedia_setup_signatories");
      if (savedSignatories) {
        setSignatories(JSON.parse(savedSignatories));
      }

      const savedStep = localStorage.getItem("sutra_setup_step") || localStorage.getItem("manageopedia_setup_step");
      if (savedStep) {
        const stepNum = Number(savedStep);
        if (stepNum >= 1 && stepNum <= 3) {
          setCurrentStep(stepNum);
        }
      }
    } catch (e) {}

    // Fetch user profile (email and mobile number) if not loaded
    async function loadUserProfile() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.user) {
          setFormData((prev) => {
            const fetchedPhone = data.user.mobile
              ? String(data.user.mobile).replace(/\D/g, "").slice(0, 10)
              : "";
            const next = {
              ...prev,
              email: data.user.email || prev.email,
              phone: prev.phone || fetchedPhone,
            };
            localStorage.setItem("sutra_setup_form", JSON.stringify(next));
            return next;
          });
        }
      } catch (err) {}
    }
    loadUserProfile();
  }, []);

  // Save to local storage on changes
  useEffect(() => {
    if (formData.name || formData.street1 || formData.city) {
      localStorage.setItem("sutra_setup_form", JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    if (
      signatories.length > 1 ||
      signatories[0].name ||
      signatories[0].designation
    ) {
      localStorage.setItem("sutra_setup_signatories", JSON.stringify(signatories));
    }
  }, [signatories]);

  useEffect(() => {
    localStorage.setItem("sutra_setup_step", String(currentStep));
  }, [currentStep]);

  // Load cities list based on selected state
  useEffect(() => {
    if (formData.state) {
      const matchedState = statesList.find((s) => s.name === formData.state);
      if (matchedState) {
        const cities = getCitiesOfIndianState(matchedState.code);
        setCitiesList(cities);
      }
    } else {
      setCitiesList([]);
    }
  }, [formData.state]);

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setFormData({ ...formData, phone: digits });
    if (errors.phone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCropComplete = async () => {
    if (!logoImageSrc || !croppedAreaPixels) return;
    try {
      setIsUploadingLogo(true);
      const croppedImageBlob = await getCroppedImg(
        logoImageSrc,
        croppedAreaPixels,
        rotation,
      );
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

  const handleStateChange = (stateCode: string) => {
    const stateObj = statesList.find((s) => s.code === stateCode);
    const stateName = stateObj ? stateObj.name : "";
    setFormData((prev) => ({ ...prev, state: stateName, city: "" }));

    if (errors.state) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.state;
        return next;
      });
    }
  };

  const handleSignatoryChange = (
    index: number,
    field: keyof Signatory,
    value: string,
  ) => {
    const updated = [...signatories];
    updated[index][field] = value;
    setSignatories(updated);

    const errKey = `sig-${field}-${index}`;
    if (errors[errKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  const addSignatory = () => {
    setSignatories([...signatories, { name: "", designation: "" }]);
  };

  const removeSignatory = (index: number) => {
    if (signatories.length === 1) {
      toast.error("At least one authorised signatory is required.");
      return;
    }
    setSignatories(signatories.filter((_, idx) => idx !== index));

    setErrors((prev) => {
      const next = { ...prev };
      delete next[`sig-name-${index}`];
      delete next[`sig-designation-${index}`];
      return next;
    });
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Company name is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (formData.phone.length !== 10) {
        newErrors.phone = "Phone number must be strictly 10 digits";
      }
    }

    if (step === 2) {
      if (!formData.street1.trim())
        newErrors.street1 = "Street address is required";
      if (!formData.state) newErrors.state = "State selection is required";
      if (!formData.city) newErrors.city = "City selection is required";
      if (!formData.pincode.trim())
        newErrors.pincode = "Postal pincode is required";
    }

    if (step === 3) {
      signatories.forEach((sig, idx) => {
        if (!sig.name.trim()) {
          newErrors[`sig-name-${idx}`] = "Signatory name is required";
        }
        if (!sig.designation.trim()) {
          newErrors[`sig-designation-${idx}`] =
            "Signatory designation is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    } else {
      toast.error(
        "Please resolve the inline validation errors before proceeding.",
      );
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStepJump = (target: number) => {
    // Only allow jump backward, or forward if steps in between are valid
    if (target < currentStep) {
      setCurrentStep(target);
      return;
    }

    // Jump forward validation checks
    if (target === 2 && validateStep(1)) {
      setCurrentStep(2);
    } else if (target === 3 && validateStep(1) && validateStep(2)) {
      setCurrentStep(3);
    } else {
      toast.error("Please fill required details correctly to proceed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error("Please fill in all required setup details.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          tagline: formData.tagline,
          email: formData.email,
          phone: formData.phone,
          gstin: formData.gstin,
          address: {
            street1: formData.street1,
            street2: formData.street2,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: formData.country,
          },
          signatories,
          logoUrl: formData.logoUrl,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Company profile created successfully!");

        // Clear local storage setup data upon complete registration
        localStorage.removeItem("sutra_setup_form");
        localStorage.removeItem("sutra_setup_signatories");
        localStorage.removeItem("sutra_setup_step");
        localStorage.removeItem("manageopedia_setup_form");
        localStorage.removeItem("manageopedia_setup_signatories");
        localStorage.removeItem("manageopedia_setup_step");

        router.refresh();
        router.push("/");
      } else {
        toast.error(data.error || "Failed to create company profile");
      }
    } catch (error: any) {
      toast.error("An error occurred during company setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="w-full md:w-[80vw] mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
        {/* Page Header */}
        <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black  text-slate-900">
              Setup Company Profile
            </h1>
          </div>
        </div>

        {/* Cascade Progress Bar */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 py-2">
          {[
            { step: 1, title: "1. Profile Details", icon: TbBuilding },
            { step: 2, title: "2. Address Schema", icon: TbMapPin },
            { step: 3, title: "3. Signatories", icon: TbUserCheck },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepJump(item.step)}
                className="flex items-center gap-1.5 focus:outline-none group text-left"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                    currentStep === item.step
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : currentStep > item.step
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  }`}
                >
                  {item.step}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-bold transition-colors hidden sm:inline ${
                    currentStep === item.step
                      ? "text-slate-900"
                      : currentStep > item.step
                        ? "text-slate-700"
                        : "text-slate-400 group-hover:text-slate-500"
                  }`}
                >
                  {item.title.substring(3)}
                </span>
              </button>
              {idx < 2 && (
                <div className="w-6 sm:w-16 h-[2px] bg-slate-200 mx-2 sm:mx-4" />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: General Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <TbBuilding className="w-4 h-4 text-amber-500" />
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  1. General Profile Details
                </h2>
              </div>

              <div className="space-y-4">
                {/* Logo Upload Section */}
                <div className="flex flex-col md:flex-row items-center justify-between p-4 mb-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                    <div className="relative shrink-0">
                      {formData.logoUrl ? (
                        <div className="w-20 h-20 rounded-full border border-slate-200 overflow-hidden bg-white shadow-sm flex items-center justify-center relative">
                          <img
                            src={formData.logoUrl}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                          <TbBuilding className="w-6 h-6 opacity-50 mb-0.5" />
                          <span className="text-[9px] font-bold">No Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-slate-900">
                        Company Logo
                      </Label>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Upload your business logo. It will be cropped into a
                        circle automatically.
                      </p>
                    </div>
                  </div>

                  <label className="mt-4 md:mt-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm">
                    <TbUpload className="w-4 h-4 text-slate-500" />
                    <span>
                      {formData.logoUrl ? "Update Logo" : "Upload Logo"}
                    </span>
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
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-name"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Company Name *
                    </Label>
                    <Input
                      id="comp-name"
                      placeholder="e.g. Apex Infrastructures"
                      value={formData.name}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value)
                      }
                      className={`h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400 ${errors.name ? "border-red-500 focus:border-red-500" : ""}`}
                    />
                    {errors.name && (
                      <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                        {errors.name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-tagline"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Tagline / Subtitle
                    </Label>
                    <Input
                      id="comp-tagline"
                      placeholder="e.g. Builders & Structural Developers"
                      value={formData.tagline}
                      onChange={(e) =>
                        handleFieldChange("tagline", e.target.value)
                      }
                      className="h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-email"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Official Email Address *
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <TbMail className="w-3.5 h-3.5" />
                      </span>
                      <Input
                        id="comp-email"
                        type="email"
                        placeholder="Loading profile email..."
                        value={formData.email}
                        readOnly
                        className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 text-slate-500 rounded-lg focus:ring-0 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-phone"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Contact Phone Number *
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <TbPhone className="w-3.5 h-3.5" />
                      </span>
                      <Input
                        id="comp-phone"
                        type="tel"
                        placeholder="Loading profile mobile..."
                        value={formData.phone}
                        readOnly
                        className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 text-slate-500 rounded-lg focus:ring-0 cursor-not-allowed font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-gstin"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      GSTIN Number (Optional)
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <TbFileInvoice className="w-3.5 h-3.5" />
                      </span>
                      <Input
                        id="comp-gstin"
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        value={formData.gstin}
                        onChange={(e) =>
                          handleFieldChange(
                            "gstin",
                            e.target.value.toUpperCase(),
                          )
                        }
                        className="pl-9 h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 uppercase placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <TbMapPin className="w-4 h-4 text-amber-500" />
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  2. Address Schema
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-street1"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Street Address Line 1 *
                    </Label>
                    <Input
                      id="comp-street1"
                      placeholder="Office unit, building name, block number"
                      value={formData.street1}
                      onChange={(e) =>
                        handleFieldChange("street1", e.target.value)
                      }
                      className={`h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400 ${errors.street1 ? "border-red-500 focus:border-red-500" : ""}`}
                    />
                    {errors.street1 && (
                      <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                        {errors.street1}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-street2"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Street Address Line 2
                    </Label>
                    <Input
                      id="comp-street2"
                      placeholder="Locality, sector, area landmark"
                      value={formData.street2}
                      onChange={(e) =>
                        handleFieldChange("street2", e.target.value)
                      }
                      className="h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-state"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      State / Region *
                    </Label>
                    <select
                      id="comp-state"
                      value={
                        statesList.find((s) => s.name === formData.state)
                          ?.code || ""
                      }
                      onChange={(e) => handleStateChange(e.target.value)}
                      className={`w-full h-9 px-3 text-xs bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${errors.state ? "border-red-500" : ""}`}
                    >
                      <option value="">Select State</option>
                      {statesList.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                        {errors.state}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-city"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      City / District *
                    </Label>
                    <select
                      id="comp-city"
                      value={formData.city}
                      onChange={(e) =>
                        handleFieldChange("city", e.target.value)
                      }
                      className={`w-full h-9 px-3 text-xs bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${errors.city ? "border-red-500" : ""}`}
                      disabled={!formData.state}
                    >
                      <option value="">Select City</option>
                      {citiesList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                        {errors.city}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="comp-pincode"
                      className="text-slate-700 text-[10px] font-bold"
                    >
                      Postal Pincode *
                    </Label>
                    <Input
                      id="comp-pincode"
                      placeholder="e.g. 400001"
                      value={formData.pincode}
                      onChange={(e) =>
                        handleFieldChange("pincode", e.target.value)
                      }
                      className={`h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400 ${errors.pincode ? "border-red-500 focus:border-red-500" : ""}`}
                    />
                    {errors.pincode && (
                      <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                        {errors.pincode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Signatory details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <TbUserCheck className="w-4 h-4 text-amber-500" />
                  <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                    3. Authorised Signatories
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addSignatory}
                  className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <TbPlus className="w-3 h-3" />
                  Add Signatory
                </button>
              </div>

              <div className="space-y-4">
                {signatories.map((sig, idx) => (
                  <div
                    key={idx}
                    className="relative p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4"
                  >
                    {signatories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSignatory(idx)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove Signatory"
                      >
                        <TbTrash className="w-4 h-4" />
                      </button>
                    )}

                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Signatory #{idx + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`sig-name-${idx}`}
                          className="text-slate-700 text-[10px] font-bold"
                        >
                          Signatory Full Name *
                        </Label>
                        <Input
                          id={`sig-name-${idx}`}
                          placeholder="e.g. Rajesh Kumar"
                          value={sig.name}
                          onChange={(e) =>
                            handleSignatoryChange(idx, "name", e.target.value)
                          }
                          className={`h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400 ${errors[`sig-name-${idx}`] ? "border-red-500 focus:border-red-500" : ""}`}
                        />
                        {errors[`sig-name-${idx}`] && (
                          <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                            {errors[`sig-name-${idx}`]}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor={`sig-desg-${idx}`}
                          className="text-slate-700 text-[10px] font-bold"
                        >
                          Signatory Designation *
                        </Label>
                        <Input
                          id={`sig-desg-${idx}`}
                          placeholder="e.g. Managing Director / Partner"
                          value={sig.designation}
                          onChange={(e) =>
                            handleSignatoryChange(
                              idx,
                              "designation",
                              e.target.value,
                            )
                          }
                          className={`h-9 text-xs bg-white border-slate-200 text-slate-900 rounded-lg focus:ring-amber-500 placeholder-slate-400 ${errors[`sig-designation-${idx}`] ? "border-red-500 focus:border-red-500" : ""}`}
                        />
                        {errors[`sig-designation-${idx}`] && (
                          <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                            {errors[`sig-designation-${idx}`]}
                          </span>
                        )}
                      </div>

                      {/* Signature Upload & Background Removal Section */}
                      <div className="col-span-full pt-2 border-t border-slate-200/60 mt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] font-bold text-slate-700">
                              Digital Signature Image
                            </Label>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                              💡{" "}
                              <strong className="text-slate-700">
                                Instruction:
                              </strong>{" "}
                              Upload signature written in{" "}
                              <strong className="text-slate-800">
                                black ink on a plain white paper
                              </strong>
                              . Background will be automatically removed into a
                              transparent landscape signature.
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
                                    updated[idx] = {
                                      ...updated[idx],
                                      signatureUrl: "",
                                    };
                                    setSignatories(updated);
                                    localStorage.setItem(
                                      "manageopedia_setup_signatories",
                                      JSON.stringify(updated),
                                    );
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
                                      toast.loading(
                                        `Processing & removing background for ${sig.name || "Signatory"}...`,
                                        { id: `sig-setup-${idx}` },
                                      );
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
                                        updated[idx] = {
                                          ...updated[idx],
                                          signatureUrl: data.url,
                                        };
                                        setSignatories(updated);
                                        localStorage.setItem(
                                          "manageopedia_setup_signatories",
                                          JSON.stringify(updated),
                                        );
                                        toast.success(
                                          "Signature background removed & uploaded successfully!",
                                          { id: `sig-setup-${idx}` },
                                        );
                                      } else {
                                        toast.error(
                                          data.error ||
                                            "Failed to upload signature",
                                          { id: `sig-setup-${idx}` },
                                        );
                                      }
                                    } catch (err) {
                                      toast.error(
                                        "Error processing signature image",
                                        { id: `sig-setup-${idx}` },
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step Navigation Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="h-9 px-4 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
                disabled={loading}
              >
                <TbChevronLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div /> // spacer
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="h-9 px-4 text-xs font-bold bg-slate-950 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5"
              >
                Next
                <TbChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="h-9 px-6 text-xs font-bold bg-slate-950 hover:bg-slate-800 text-white rounded-lg"
                disabled={loading}
              >
                {loading
                  ? "Registering Workspace..."
                  : "Complete Setup & Launch Dashboard"}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Crop Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">
              Crop Company Logo
            </DialogTitle>
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
              <Label className="text-xs font-bold text-slate-700">
                Rotation
              </Label>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCropModalOpen(false)}
              className="text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropComplete}
              disabled={isUploadingLogo}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold h-9 px-6"
            >
              {isUploadingLogo ? "Uploading..." : "Apply & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
