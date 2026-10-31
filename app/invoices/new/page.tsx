"use client";

import { useEffect, useState, Suspense } from "react";
import {
  FileText,
  Plus,
  Save,
  Send,
  ArrowLeft,
  UserPlus,
  PackagePlus,
  Building,
  UserCheck,
  Trash2,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SpellCheckTextarea } from "@/components/ui/spellcheck-textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DOCUMENT_TYPES,
  PAYMENT_TERMS_OPTIONS,
  GST_PERCENTAGE_OPTIONS,
  LINE_ITEM_GST_OPTIONS,
  CONSTRUCTION_UNITS,
  CONSTRUCTION_CATEGORIES,
} from "@/lib/constants";
import { getIndianStates, getCitiesOfIndianState } from "@/lib/indianLocations";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500 font-medium">Loading form context...</p>
      </div>
    }>
      <CreateInvoiceContent />
    </Suspense>
  );
}

function CreateInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingInlineCustomer, setSavingInlineCustomer] = useState(false);
  const [savingInlineProduct, setSavingInlineProduct] = useState(false);

  // Indian States & Cities
  const indianStates = getIndianStates();
  const [inlineCities, setInlineCities] = useState<string[]>([]);

  // Form State
  const [documentType, setDocumentType] = useState("TAX_INVOICE");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSnapshot, setCustomerSnapshot] = useState<any>({
    customerName: "",
    companyName: "",
    phone: "",
    email: "",
    gstin: "",
  });
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [customPaymentTerm, setCustomPaymentTerm] = useState("");
  const [roundOffMode, setRoundOffMode] = useState<"CEIL" | "FLOOR" | "NEAREST" | "NONE">("CEIL");

  const calculateDueDate = (terms: string, baseIssueDate: string) => {
    if (terms === "Already Paid") {
      return "";
    }
    const base = baseIssueDate ? new Date(baseIssueDate) : new Date();
    let days = 0;
    if (terms.includes("7")) days = 7;
    else if (terms.includes("15")) days = 15;
    else if (terms.includes("30")) days = 30;
    else if (terms.includes("45")) days = 45;
    else if (terms.includes("60")) days = 60;
    else if (terms.includes("Receipt")) days = 0;
    else days = 7;

    const targetDate = new Date(base.getTime() + days * 86400000);
    return targetDate.toISOString().slice(0, 10);
  };

  const handlePaymentTermsChange = (newTerm: string) => {
    setPaymentTerms(newTerm);
    if (newTerm !== "Custom") {
      setDueDate(calculateDueDate(newTerm, issueDate));
    }
  };

  const handleIssueDateChange = (newIssueDate: string) => {
    setIssueDate(newIssueDate);
    if (paymentTerms !== "Custom" && paymentTerms !== "Already Paid") {
      setDueDate(calculateDueDate(paymentTerms, newIssueDate));
    }
  };

  const [lineItems, setLineItems] = useState<any[]>([
    {
      productId: "",
      productName: "",
      productDescription: "",
      sku: "",
      unit: "Piece",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      gstRate: 18,
      totalAmount: 0,
    },
  ]);

  const [freightCharges, setFreightCharges] = useState("0");
  const [totalDiscount, setTotalDiscount] = useState("0");
  const [adjustmentAmount, setAdjustmentAmount] = useState("0");
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const [gstCalculationMode, setGstCalculationMode] = useState<"ITEMIZED" | "OVERALL">("ITEMIZED");
  const [overallGstRate, setOverallGstRate] = useState<number>(18);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [notes, setNotes] = useState("Thank you for choosing us!");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. Payment is due as per terms.\n2. Goods once sold will not be taken back."
  );
  const [paidAmount, setPaidAmount] = useState(0);
  const [attachSignatureImage, setAttachSignatureImage] = useState(true);
  const [subject, setSubject] = useState("");
  const [signatories, setSignatories] = useState<any[]>([]);
  const [selectedSignatory, setSelectedSignatory] = useState({ name: "", designation: "", signatureUrl: "" });
  const [companyName, setCompanyName] = useState("");

  // Inline Creation Modals State
  const [inlineCustomerModalOpen, setInlineCustomerModalOpen] = useState(false);
  const [inlineProductModalOpen, setInlineProductModalOpen] = useState(false);

  // Inline Customer Form State (Structured Address Schema)
  const [inlineCustomerData, setInlineCustomerData] = useState({
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
  });

  useEffect(() => {
    if (inlineCustomerData.state) {
      const cities = getCitiesOfIndianState(inlineCustomerData.state);
      setInlineCities(cities);
    } else {
      setInlineCities([]);
    }
  }, [inlineCustomerData.state]);

  // BOM State
  const [bomItems, setBomItems] = useState<any[]>([]);

  const handleAddBOMItem = () => {
    setBomItems([...bomItems, { itemName: "", specification: "", quantity: 0, unit: "Pcs" }]);
  };

  const handleBOMItemUpdate = (index: number, field: string, value: any) => {
    const updated = [...bomItems];
    updated[index] = { ...updated[index], [field]: value };
    setBomItems(updated);
  };

  const handleRemoveBOMItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  // Inline Product Form State
  const [inlineProductData, setInlineProductData] = useState({
    productName: "",
    productDescription: "",
    category: CONSTRUCTION_CATEGORIES[0],
    unit: CONSTRUCTION_UNITS[0],
    itemType: "GOODS",
    hsnCode: "",
    purchasePrice: "",
    sellingPrice: "",
    gstRate: "18",
    minimumStockQuantity: "10",
    currentStock: "50",
  });

  const [generatingAI, setGeneratingAI] = useState(false);

  const generateAIDescription = async () => {
    if (!inlineProductData.productName.trim()) {
      toast.error("Please enter a product name first to generate a description.");
      return;
    }

    try {
      setGeneratingAI(true);
      const res = await fetch("/api/products/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: inlineProductData.productName,
          category: inlineProductData.category,
          itemType: inlineProductData.itemType,
        }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setInlineProductData((prev) => ({ ...prev, productDescription: data.description }));
        toast.success("AI Description generated!");
      } else {
        toast.error(data.error || "Failed to generate AI description");
      }
    } catch (err) {
      toast.error("Error connecting to AI description service");
    } finally {
      setGeneratingAI(false);
    }
  };

  useEffect(() => {
    loadInitialData(editId);
    if (!editId) {
      updateAutoInvoiceNumber();
    }
    const savedNotes = localStorage.getItem("default_customer_notes");
    if (savedNotes !== null) {
      setNotes(savedNotes);
    }
  }, [editId]);

  const formatAutoInvoiceNumber = (cName?: string, dStr?: string) => {
    let prefix = "MOP";
    const targetComp = cName || companyName;
    if (targetComp && targetComp.trim()) {
      const words = targetComp.trim().split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const initials = words
          .map((w) => {
            const clean = w.replace(/[^a-zA-Z0-9]/g, "");
            return clean ? clean[0] : "";
          })
          .join("");
        if (initials) prefix = initials.toUpperCase();
      } else {
        const cleaned = targetComp.trim().replace(/[^a-zA-Z0-9-]/g, "");
        if (cleaned) prefix = cleaned.toUpperCase();
      }
    }
    const d = dStr ? new Date(dStr) : (issueDate ? new Date(issueDate) : new Date());
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const year = String(validDate.getFullYear());
    return `${prefix}-${month}-${year}-001`;
  };

  const updateAutoInvoiceNumber = (cName?: string, dStr?: string) => {
    setInvoiceNumber(formatAutoInvoiceNumber(cName, dStr));
  };

  const handleDocumentTypeChange = (newType: string) => {
    setDocumentType(newType);
    if (!editId) {
      updateAutoInvoiceNumber(companyName, issueDate);
    }
  };

  const loadInitialData = async (eId: string | null) => {
    try {
      const [custRes, prodRes, termRes, userRes] = await Promise.all([
        fetch("/api/customers?limit=200"),
        fetch("/api/products?limit=300"),
        fetch("/api/terms"),
        fetch("/api/auth/me"),
      ]);

      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const termData = await termRes.json();
      const userData = await userRes.json();

      if (custData.success) setCustomers(custData.customers || []);
      if (prodData.success) setProducts(prodData.products || []);
      if (termData.success) {
        setTermsTemplates(termData.terms || []);
        const defaultTerm = termData.terms?.find((t: any) => t.isDefault);
        if (defaultTerm) setTermsAndConditions(defaultTerm.content);
      }

      let loadedSignatories: any[] = [];
      let cName = "";
      if (userData.success && userData.company) {
        cName = userData.company.name || "";
        setCompanyName(cName);
        loadedSignatories = userData.company.signatories || [];
        setSignatories(loadedSignatories);
        if (!eId) {
          setInvoiceNumber(formatAutoInvoiceNumber(cName, issueDate));
        }
      }

      if (eId) {
        const invRes = await fetch(`/api/invoices/${eId}`);
        const invData = await invRes.json();
        if (invData.success && invData.invoice) {
          const inv = invData.invoice;
          setDocumentType(inv.documentType);
          setInvoiceNumber(inv.invoiceNumber);
          setSelectedCustomerId(inv.customerId || "");
          setCustomerSnapshot(inv.customerSnapshot);
          setIssueDate(new Date(inv.issueDate).toISOString().slice(0, 10));
          setDueDate(new Date(inv.dueDate).toISOString().slice(0, 10));
          setPaymentTerms(inv.paymentTerms);
          setLineItems(inv.lineItems.map((item: any) => ({
            productId: item.productId || "",
            productName: item.productName || "",
            productDescription: item.productDescription || item.description || "",
            sku: item.sku || "",
            unit: item.unit || "Piece",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discountAmount: item.discountAmount || 0,
            gstRate: item.gstRate !== undefined ? item.gstRate : 18,
            totalAmount: item.totalAmount || 0,
          })));
          setFreightCharges(String(inv.freightCharges || 0));
          setTotalDiscount(String(inv.totalDiscount || 0));
          setAdjustmentAmount(String(inv.adjustmentAmount || 0));
          setAdjustmentDescription(inv.adjustmentDescription || "");
          setGstCalculationMode(inv.gstCalculationMode || "ITEMIZED");
          setOverallGstRate(inv.overallGstRate !== undefined ? inv.overallGstRate : 18);
          setNotes(inv.notes || "");
          setSubject(inv.subject || "");
          setTermsAndConditions(inv.termsAndConditions || "");
          setPaidAmount(inv.paidAmount || 0);
          setBomItems(inv.bomItems || []);
          if (inv.signatoryName) {
            const matchedSig = loadedSignatories.find(
              (s: any) => s.name === inv.signatoryName || s.designation === inv.signatoryDesignation
            );
            setSelectedSignatory({
              name: inv.signatoryName,
              designation: inv.signatoryDesignation || matchedSig?.designation || "",
              signatureUrl: matchedSig?.signatureUrl || inv.signatorySignatureUrl || "",
            });
            if (inv.signatorySignatureUrl === null || inv.signatorySignatureUrl === undefined || inv.signatorySignatureUrl === "") {
              setAttachSignatureImage(false);
            }
          }
        }
      } else if (loadedSignatories.length > 0) {
        setSelectedSignatory({
          name: loadedSignatories[0].name,
          designation: loadedSignatories[0].designation,
          signatureUrl: loadedSignatories[0].signatureUrl || "",
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load initial form data");
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find((c) => c._id === customerId);
    if (cust) {
      const bAddr = cust.billingAddress || {};
      const bStreet = bAddr.street || bAddr.street1 || "";
 
      setCustomerSnapshot({
        customerName: cust.customerName,
        companyName: cust.companyName || "",
        phone: cust.phone || "",
        email: cust.email || "",
        gstin: cust.gstin || "",
        billingAddress: {
          ...bAddr,
          street: bStreet,
          street1: bStreet,
        },
      });
    }
  };

  const handleLineProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p._id === productId);
    if (!prod) return;

    const updated = [...lineItems];
    const qty = Number(updated[index].quantity) || 1;
    const price = Number(prod.sellingPrice) || 0;
    const discount = Number(updated[index].discountAmount) || 0;

    updated[index] = {
      ...updated[index],
      productId: prod._id,
      productName: prod.productName,
      productDescription: prod.productDescription || "",
      sku: prod.sku || "",
      unit: prod.unit || "Piece",
      unitPrice: price,
      gstRate: prod.gstRate !== undefined ? Number(prod.gstRate) : 18,
      totalAmount: Math.max(0, qty * price),
    };
    setLineItems(updated);
  };

  const handleLineItemUpdate = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index][field] = field === "gstRate" ? Number(value) : value;

    const qty = Number(updated[index].quantity) || 0;
    const price = Number(updated[index].unitPrice) || 0;
    const discount = Number(updated[index].discountAmount) || 0;

    updated[index].totalAmount = Math.max(0, qty * price);
    setLineItems(updated);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: "",
        productName: "",
        productDescription: "",
        sku: "",
        unit: "Piece",
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error("At least one line item is required");
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLoadDummyData = () => {
    const dummyItems = [
      {
        productId: "",
        productName: "TMT Rebar 12mm Fe-550D High Ductility",
        productDescription: "IS 1786 Grade Fe-550D thermo-mechanically treated steel bars for structural reinforcement",
        sku: "STEEL-TMT-12",
        unit: "Metric Ton",
        quantity: 12.5,
        unitPrice: 58500,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 12.5 * 58500,
      },
      {
        productId: "",
        productName: "OPC 53 Grade Cement Bags (50kg)",
        productDescription: "High early strength Ordinary Portland Cement compliant with IS 12269 specification",
        sku: "CEM-OPC-53",
        unit: "Bag",
        quantity: 250,
        unitPrice: 385,
        discountAmount: 0,
        gstRate: 28,
        totalAmount: 250 * 385,
      },
      {
        productId: "",
        productName: "Coarse Aggregate 20mm (Crushed Metal)",
        productDescription: "Angular hard blue metal stone aggregate for RCC beam and slab casting",
        sku: "AGG-20MM",
        unit: "Cubic Feet (CFT)",
        quantity: 800,
        unitPrice: 42,
        discountAmount: 0,
        gstRate: 5,
        totalAmount: 800 * 42,
      },
      {
        productId: "",
        productName: "M-Sand (Manufactured Zone-II Sand)",
        productDescription: "Washed cubical concrete manufactured sand passing 4.75mm sieve for high strength plaster",
        sku: "SAND-MSAND",
        unit: "Cubic Feet (CFT)",
        quantity: 650,
        unitPrice: 48,
        discountAmount: 0,
        gstRate: 5,
        totalAmount: 650 * 48,
      },
      {
        productId: "",
        productName: "Red Clay Modular Bricks (First Class)",
        productDescription: "Kiln-burnt solid clay bricks with minimum 10.5 N/mm2 compressive strength",
        sku: "BRK-RED-MOD",
        unit: "Thousand",
        quantity: 15,
        unitPrice: 7200,
        discountAmount: 0,
        gstRate: 12,
        totalAmount: 15 * 7200,
      },
      {
        productId: "",
        productName: "Structural MS Square Hollow Section 50x50x3mm",
        productDescription: "Cold formed welded structural hollow section steel pipes for heavy trusses",
        sku: "STL-SHS-50",
        unit: "Meter",
        quantity: 120,
        unitPrice: 340,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 120 * 340,
      },
      {
        productId: "",
        productName: "AAC Lightweight Concrete Blocks 600x200x150mm",
        productDescription: "Autoclaved Aerated Concrete thermal insulation wall masonry blocks",
        sku: "AAC-BLK-150",
        unit: "Piece",
        quantity: 450,
        unitPrice: 62,
        discountAmount: 0,
        gstRate: 12,
        totalAmount: 450 * 62,
      },
      {
        productId: "",
        productName: "Waterproof Polymer Modified Tile Adhesive (20kg)",
        productDescription: "C2TE grade cementitious tile adhesive for large format vitrified tiles",
        sku: "ADH-TILE-20",
        unit: "Bag",
        quantity: 35,
        unitPrice: 580,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 35 * 580,
      },
      {
        productId: "",
        productName: "PPC Fly Ash Cement (50kg Bag)",
        productDescription: "Portland Pozzolana Cement offering superior resistance to sulphate attack",
        sku: "CEM-PPC-50",
        unit: "Bag",
        quantity: 180,
        unitPrice: 360,
        discountAmount: 0,
        gstRate: 28,
        totalAmount: 180 * 360,
      },
      {
        productId: "",
        productName: "Vitrified Floor Tiles 800x800mm Double Charged",
        productDescription: "Stain resistant glossy finish porcelain floor tiles (Box of 3 pcs / 20.66 sq.ft)",
        sku: "TLE-VIT-800",
        unit: "Box",
        quantity: 60,
        unitPrice: 1250,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 60 * 1250,
      },
      {
        productId: "",
        productName: "GI Binding Wire 18 Gauge (Soft Annealed)",
        productDescription: "Galvanized iron binding wire for rebar tying and reinforcement cage fixing",
        sku: "WIRE-GI-18",
        unit: "Kg",
        quantity: 45,
        unitPrice: 85,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 45 * 85,
      },
      {
        productId: "",
        productName: "CPVC Plumbing Pipe 1 inch SDR-11 (3m)",
        productDescription: "Chlorinated Polyvinyl Chloride hot & cold water distribution pressure pipes",
        sku: "PIPE-CPVC-1IN",
        unit: "Piece",
        quantity: 80,
        unitPrice: 310,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 80 * 310,
      },
      {
        productId: "",
        productName: "Exterior Emulsion Weather Shield Paint (20L)",
        productDescription: "100% acrylic exterior wall paint with anti-algal and dust pick-up resistance",
        sku: "PNT-EXT-20L",
        unit: "Bucket",
        quantity: 12,
        unitPrice: 4800,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 12 * 4800,
      },
      {
        productId: "",
        productName: "Shuttering Plywood 12mm BWP Grade (8x4 ft)",
        productDescription: "Phenolic film faced boiling water proof plywood sheet for formwork shuttering",
        sku: "PLY-SHUT-12",
        unit: "Sheet",
        quantity: 25,
        unitPrice: 1650,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 25 * 1650,
      },
      {
        productId: "",
        productName: "Granite Slab 18mm Black Galaxy Polished",
        productDescription: "Premium natural stone granite slab for kitchen countertops and stair treads",
        sku: "STN-GRN-BLK",
        unit: "Square Feet (SQFT)",
        quantity: 220,
        unitPrice: 195,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 220 * 195,
      },
      {
        productId: "",
        productName: "Concrete Admixture Water Reducer (20L Drum)",
        productDescription: "High range superplasticizer and slump retaining admixture for M30 concrete",
        sku: "ADM-SUP-20L",
        unit: "Drum",
        quantity: 6,
        unitPrice: 2400,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 6 * 2400,
      },
      {
        productId: "",
        productName: "Stainless Steel SS-304 Balustrade Pipe 2 inch",
        productDescription: "Schedule 10 mirror polish SS 304 seamless pipe for staircase handrails",
        sku: "PIPE-SS304-2IN",
        unit: "Meter",
        quantity: 40,
        unitPrice: 780,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 40 * 780,
      },
      {
        productId: "",
        productName: "Expandable Joint Sealant Polyurethane Gun (600ml)",
        productDescription: "Elastomeric joint sealant sausage for structural expansion joints & glass curtain walls",
        sku: "SLT-PU-600",
        unit: "Piece",
        quantity: 30,
        unitPrice: 460,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 30 * 460,
      },
      {
        productId: "",
        productName: "PVC Electrical Conduit Pipe 25mm Heavy Duty",
        productDescription: "Rigid FRLS flame retardant low smoke unplasticized PVC conduit 3 meter length",
        sku: "PIPE-ELE-25",
        unit: "Piece",
        quantity: 150,
        unitPrice: 75,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 150 * 75,
      },
      {
        productId: "",
        productName: "Bituminous Waterproofing Membrane 3mm (10 sqm)",
        productDescription: "APP modified polyester reinforced torch-on waterproofing membrane roll for roof slabs",
        sku: "MEM-BIT-3MM",
        unit: "Roll",
        quantity: 18,
        unitPrice: 2150,
        discountAmount: 0,
        gstRate: 18,
        totalAmount: 18 * 2150,
      },
    ];

    setLineItems(dummyItems);
    toast.success("20 dummy line items loaded into invoice!");
  };

  // Save Inline Customer
  const handleSaveInlineCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineCustomerData.customerName) {
      toast.error("Customer Name / Business Name is required");
      return;
    }
    if (!inlineCustomerData.phone || !/^\d{10}$/.test(inlineCustomerData.phone.trim())) {
      toast.error("Mobile number must be strictly 10 numeric digits without country code or special characters");
      return;
    }
    if (inlineCustomerData.customerType === "BUSINESS" && !inlineCustomerData.contactPersonName) {
      toast.error("Point of Contact name is required for Business customers");
      return;
    }
    if (!inlineCustomerData.street1) {
      toast.error("Street Address 1 is mandatory");
      return;
    }
    if (!inlineCustomerData.state) {
      toast.error("Please select a State");
      return;
    }
    if (!inlineCustomerData.city) {
      toast.error("Please select a City");
      return;
    }
    if (!inlineCustomerData.pincode) {
      toast.error("Pincode is mandatory");
      return;
    }

    try {
      setSavingInlineCustomer(true);
      const payload = {
        customerType: inlineCustomerData.customerType,
        salutation: inlineCustomerData.salutation,
        customerName: inlineCustomerData.customerName,
        companyName:
          inlineCustomerData.customerType === "BUSINESS"
            ? inlineCustomerData.companyName || inlineCustomerData.customerName
            : undefined,
        contactPersonName: inlineCustomerData.contactPersonName,
        phone: inlineCustomerData.phone,
        email: inlineCustomerData.email,
        gstin: inlineCustomerData.gstin,
        gstTreatment: inlineCustomerData.gstTreatment,
        placeOfSupply: inlineCustomerData.state,
        billingAddress: {
          street: inlineCustomerData.street1,
          street1: inlineCustomerData.street1,
          street2: inlineCustomerData.street2,
          city: inlineCustomerData.city,
          state: inlineCustomerData.state,
          pincode: inlineCustomerData.pincode,
          country: "India",
        },
        shippingAddress: {
          street: inlineCustomerData.street1,
          street1: inlineCustomerData.street1,
          street2: inlineCustomerData.street2,
          city: inlineCustomerData.city,
          state: inlineCustomerData.state,
          pincode: inlineCustomerData.pincode,
          country: "India",
        },
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success && result.customer) {
        toast.success(`Customer ${result.customer.customerName} created inline!`);
        setCustomers((prev) => [result.customer, ...prev]);
        handleSelectCustomer(result.customer._id);
        setInlineCustomerModalOpen(false);
      } else {
        toast.error(result.error || "Failed to create inline customer");
      }
    } catch (err) {
      toast.error("Error creating inline customer");
    } finally {
      setSavingInlineCustomer(false);
    }
  };

  // Save Inline Product
  const handleSaveInlineProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineProductData.productName || !inlineProductData.purchasePrice || !inlineProductData.sellingPrice) {
      toast.error("Please fill all required product fields");
      return;
    }

    try {
      setSavingInlineProduct(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inlineProductData),
      });
      const result = await res.json();

      if (result.success && result.product) {
        const newProd = result.product;
        toast.success(`Product ${newProd.productName} created inline!`);
        setProducts((prev) => [newProd, ...prev]);

        // Auto add or set into current line item
        const updated = [...lineItems];
        const lastIdx = updated.length - 1;
        if (!updated[lastIdx].productId && !updated[lastIdx].productName) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            productId: newProd._id,
            productName: newProd.productName,
            productDescription: newProd.productDescription || "",
            sku: newProd.sku || "",
            unit: newProd.unit || "Piece",
            unitPrice: Number(newProd.sellingPrice),
            gstRate: newProd.gstRate !== undefined ? Number(newProd.gstRate) : 18,
            totalAmount: Number(newProd.sellingPrice),
          };
        } else {
          updated.push({
            productId: newProd._id,
            productName: newProd.productName,
            productDescription: newProd.productDescription || "",
            sku: newProd.sku || "",
            unit: newProd.unit || "Piece",
            quantity: 1,
            unitPrice: Number(newProd.sellingPrice),
            discountAmount: 0,
            gstRate: newProd.gstRate !== undefined ? Number(newProd.gstRate) : 18,
            totalAmount: Number(newProd.sellingPrice),
          });
        }
        setLineItems(updated);
        setInlineProductModalOpen(false);
      } else {
        toast.error(result.error || "Failed to create inline product");
      }
    } catch (err) {
      toast.error("Error creating inline product");
    } finally {
      setSavingInlineProduct(false);
    }
  };

  // Calculations
  const subTotal = lineItems.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalDiscountNum = Number(totalDiscount) || 0;
  const netTotal = subTotal - totalDiscountNum;
  const freight = Number(freightCharges) || 0;
  const userAdjustment = Number(adjustmentAmount) || 0;
  
  const gstAmount = gstCalculationMode === "OVERALL"
    ? (Math.max(0, netTotal) * (Number(overallGstRate) || 0)) / 100
    : lineItems.reduce((sum, item) => {
        const itemTotal = Number(item.totalAmount) || 0;
        const rate = Number(item.gstRate !== undefined ? item.gstRate : 18);
        if (rate <= 0) return sum; // 0% or Out of Scope (-1) adds 0 tax
        const ratio = subTotal > 0 ? itemTotal / subTotal : 0;
        const discountedItemTotal = itemTotal - totalDiscountNum * ratio;
        return sum + (discountedItemTotal * rate) / 100;
      }, 0);

  // Raw unrounded total before auto-roundoff
  const rawTotalBeforeRoundOff = netTotal + gstAmount + freight + userAdjustment;

  let roundOffDiff = 0;
  let calculatedGrandTotal = rawTotalBeforeRoundOff;

  if (roundOffMode === "CEIL") {
    // Default Incremental Roundup: Math.ceil (e.g. 105.20 -> 106.00)
    calculatedGrandTotal = Math.ceil(rawTotalBeforeRoundOff);
    roundOffDiff = Math.round((calculatedGrandTotal - rawTotalBeforeRoundOff) * 100) / 100;
  } else if (roundOffMode === "FLOOR") {
    // Floor: Math.floor (e.g. 105.80 -> 105.00)
    calculatedGrandTotal = Math.floor(rawTotalBeforeRoundOff);
    roundOffDiff = Math.round((calculatedGrandTotal - rawTotalBeforeRoundOff) * 100) / 100;
  } else if (roundOffMode === "NEAREST") {
    // Nearest whole integer
    calculatedGrandTotal = Math.round(rawTotalBeforeRoundOff);
    roundOffDiff = Math.round((calculatedGrandTotal - rawTotalBeforeRoundOff) * 100) / 100;
  } else {
    // Exact decimals (NONE)
    calculatedGrandTotal = Math.round(rawTotalBeforeRoundOff * 100) / 100;
    roundOffDiff = 0;
  }

  const grandTotal = calculatedGrandTotal;
  const totalAdjustmentAmount = Math.round((userAdjustment + roundOffDiff) * 100) / 100;

  const handleSubmitInvoice = async () => {
    if (!customerSnapshot.customerName) {
      toast.error("Please select or create a customer");
      return;
    }
    if (!customerSnapshot.phone) {
      toast.error("Mobile number is strictly required for all customers, invoices, and quotations");
      return;
    }
    if (!lineItems[0].productName) {
      toast.error("Please add at least one valid product line item");
      return;
    }

    if (paidAmount > grandTotal) {
      toast.error(`Paid amount (₹${paidAmount}) cannot exceed the grand total (₹${grandTotal})`);
      return;
    }

    try {
      setSubmitting(true);
      const finalPaymentTerm = paymentTerms === "Custom" ? customPaymentTerm : paymentTerms;
      const isAlreadyPaid = paymentTerms === "Already Paid";

      const finalAdjDescription = adjustmentDescription.trim() || (roundOffDiff !== 0 ? `Round-off (${roundOffMode})` : "");

      const payload = {
        documentType,
        invoiceNumber: invoiceNumber || undefined,
        customerId: selectedCustomerId || undefined,
        customerSnapshot,
        issueDate,
        dueDate: isAlreadyPaid ? undefined : dueDate,
        paymentTerms: finalPaymentTerm,
        lineItems,
        bomItems,
        freightCharges: freight,
        totalDiscount: totalDiscountNum,
        adjustmentAmount: totalAdjustmentAmount,
        adjustmentDescription: finalAdjDescription,
        gstCalculationMode,
        overallGstRate,
        gstAmount,
        status: isAlreadyPaid ? "PAID" : "ISSUED",
        paidAmount: isAlreadyPaid ? grandTotal : paidAmount,
        notes,
        subject,
        termsAndConditions,
        signatoryName: selectedSignatory.name || undefined,
        signatoryDesignation: selectedSignatory.designation || undefined,
        signatorySignatureUrl: attachSignatureImage ? (selectedSignatory.signatureUrl || "") : "",
      };

      const endpoint = editId ? `/api/invoices/${editId}` : "/api/invoices";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(editId ? `Invoice ${result.invoice.invoiceNumber} updated!` : `Invoice ${result.invoice.invoiceNumber} created!`);
        router.push(`/invoices/${result.invoice._id}`);
      } else {
        const rawErr = result.error || "";
        if (rawErr.includes("E11000") || rawErr.includes("duplicate key") || rawErr.includes("already exists")) {
          toast.error("Please change the Invoice Number.");
        } else {
          toast.error(rawErr || "Failed to save invoice");
        }
      }
    } catch (e) {
      toast.error("Error submitting invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {editId ? "Edit Invoice Details" : "Zoho Inspired Invoice Generator"}
              </h1>
              <p className="text-xs text-slate-500">
                {editId ? "Modify and update details for this billing document" : "Create tax invoices, estimates, quotations & challans"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmitInvoice()}
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Submitting..." : editId ? "Save & Update Invoice" : "Issue & Generate Invoice"}</span>
            </Button>
          </div>
        </div>

        {/* Invoice Form Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
          {/* Top Document Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
            <div>
              <Label className="text-xs font-bold text-slate-700">Document Type *</Label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Invoice Number (Auto-generated if empty)</Label>
              <Input
                placeholder="e.g. INV-2026-0001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1 h-9 text-xs border-slate-200 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Payment Terms</Label>
              <select
                value={paymentTerms}
                onChange={(e) => handlePaymentTermsChange(e.target.value)}
                className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {PAYMENT_TERMS_OPTIONS.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
                <option value="Custom">Custom Payment Term...</option>
              </select>
            </div>
          </div>

          {paymentTerms === "Custom" && (
            <div>
              <Label className="text-xs font-bold text-slate-700">Custom Payment Term Description</Label>
              <Input
                placeholder="e.g. 50% Advance, 50% on Site Delivery"
                value={customPaymentTerm}
                onChange={(e) => setCustomPaymentTerm(e.target.value)}
                className="mt-1 h-9 text-xs border-slate-200"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-bold text-slate-750">Subject / Purpose of Billing Document</Label>
            <Textarea
              rows={1}
              placeholder="e.g. Material supply for Delhi block A construction project..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 min-h-[36px] py-1.5 px-3 text-xs border-slate-200 bg-white resize-y transition-all focus:min-h-[60px] field-sizing-content font-medium"
            />
          </div>

          {/* Customer Selection & Details */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800">Select Customer or Walk-in</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInlineCustomerModalOpen(true)}
                className="gap-1.5 text-xs h-7 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 font-bold"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Inline Customer Creation</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Select Customer from Directory</Label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    if (e.target.value) handleSelectCustomer(e.target.value);
                  }}
                  className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">Choose customer from directory...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.customerType === "INDIVIDUAL" && c.salutation ? `${c.salutation}. ` : ""}
                      {c.customerName} {c.companyName && c.companyName !== c.customerName ? `(${c.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Customer Name *</Label>
                <Input
                  required
                  placeholder="Walk-in Customer / Client Name *"
                  value={customerSnapshot.customerName}
                  onChange={(e) =>
                    setCustomerSnapshot({ ...customerSnapshot, customerName: e.target.value })
                  }
                  className="mt-1 h-9 text-xs border-slate-200 bg-white font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Customer Mobile Number * (Strictly Required)</Label>
                <Input
                  required
                  placeholder="+91 98765 43210 *"
                  value={customerSnapshot.phone || ""}
                  onChange={(e) =>
                    setCustomerSnapshot({ ...customerSnapshot, phone: e.target.value })
                  }
                  className="mt-1 h-9 text-xs border-slate-200 bg-white font-medium font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">GSTIN Number</Label>
                <Input
                  placeholder="27AAAAA0000A1Z5"
                  value={customerSnapshot.gstin}
                  onChange={(e) =>
                    setCustomerSnapshot({ ...customerSnapshot, gstin: e.target.value.toUpperCase() })
                  }
                  className="mt-1 h-9 text-xs border-slate-200 bg-white uppercase font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Issue Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="mt-1 h-9 text-xs border-slate-200 bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Due Date</span>
                  {paymentTerms === "Already Paid" && (
                    <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Blocked (Paid)</span>
                  )}
                </Label>
                <Input
                  type="date"
                  disabled={paymentTerms === "Already Paid"}
                  value={paymentTerms === "Already Paid" ? "" : dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`mt-1 h-9 text-xs border-slate-200 ${
                    paymentTerms === "Already Paid"
                      ? "bg-slate-100 cursor-not-allowed text-slate-400 font-semibold opacity-70"
                      : "bg-white"
                  }`}
                />
              </div>
            </div>

            {/* Address Display Section */}
            {customerSnapshot.customerName && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                {/* Billing Address Card */}
                <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Billing Address
                  </span>
                  {customerSnapshot.billingAddress?.street || customerSnapshot.billingAddress?.street1 ? (
                    <div className="text-xs text-slate-700 space-y-0.5 font-medium">
                      <p className="font-semibold text-slate-900">
                        {customerSnapshot.billingAddress.street || customerSnapshot.billingAddress.street1}
                      </p>
                      {customerSnapshot.billingAddress.street2 && (
                        <p>{customerSnapshot.billingAddress.street2}</p>
                      )}
                      <p>
                        {customerSnapshot.billingAddress.city}, {customerSnapshot.billingAddress.state} - {customerSnapshot.billingAddress.pincode}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{customerSnapshot.billingAddress.country || "India"}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-medium">No billing address specified for this customer.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table Header */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Itemized Material Line Items</h3>
                <p className="text-[10px] text-slate-500 font-medium">Select per-product GST or apply an overall bill GST rate</p>
              </div>

              <div className="flex items-center flex-wrap gap-2.5">
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGstCalculationMode("ITEMIZED")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      gstCalculationMode === "ITEMIZED"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Per-Product GST
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstCalculationMode("OVERALL")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      gstCalculationMode === "OVERALL"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Overall Bill GST
                  </button>
                </div>

                {gstCalculationMode === "OVERALL" && (
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-950">Overall GST:</span>
                    <select
                      value={overallGstRate}
                      onChange={(e) => setOverallGstRate(Number(e.target.value))}
                      className="h-7 text-xs bg-white border border-amber-300 rounded px-1.5 font-bold text-amber-950 focus:outline-none"
                    >
                      {LINE_ITEM_GST_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value < 0 ? 0 : g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInlineProductModalOpen(true)}
                  className="gap-1.5 text-xs h-8 text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 font-bold"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>+ Inline Product</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadDummyData}
                  className="gap-1.5 text-xs h-8 text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100 font-bold shadow-xs"
                >
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  <span>Load Dummy Data</span>
                </Button>
              </div>
            </div>

            <div className="max-h-[460px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-20 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] shadow-xs">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center text-slate-500 font-bold bg-slate-100">#</th>
                    <th className="py-3 px-3 text-slate-700 font-bold bg-slate-100">Product / Material</th>
                    <th className="py-3 px-3 w-28 text-slate-700 font-bold bg-slate-100">Unit</th>
                    <th className="py-3 px-3 text-right w-24 text-slate-900 font-black bg-slate-100">Qty</th>
                    <th className="py-3 px-3 text-right w-28 text-slate-700 font-bold bg-slate-100">Unit Price (₹)</th>
                    <th className="py-3 px-3 text-center w-36 text-slate-700 font-bold bg-slate-100">GST %</th>
                    <th className="py-3 px-3 text-right w-32 text-slate-900 font-black bg-slate-100">Total (₹)</th>
                    <th className="py-3 px-2 text-center w-10 bg-slate-100"></th>
                  </tr>
                </thead>
                <tbody 
                  className="divide-y divide-slate-100 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = Array.from(document.querySelectorAll("input, select, textarea"));
                      const index = formElements.indexOf(e.target as any);
                      if (index > -1 && index < formElements.length - 1) {
                        (formElements[index + 1] as HTMLElement).focus();
                      }
                    }
                  }}
                >
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                      <td className="p-2 relative space-y-1">
                        <Input
                          list={`product-list-${index}`}
                          placeholder="Material Name / Select from list..."
                          value={item.productName}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleLineItemUpdate(index, "productName", val);
                            
                            // Check if typed value matches an existing product
                            const matchedProd = products.find(p => 
                              p.productName === val || 
                              (p.productDescription && `${p.productName} (${p.productDescription})` === val) ||
                              (p.productDescription && `${p.productName} - ${p.productDescription}` === val)
                            );
                            
                            if (matchedProd) {
                              if (item.productId !== matchedProd._id) {
                                handleLineProductChange(index, matchedProd._id);
                              }
                            } else {
                              if (item.productId !== "") {
                                handleLineItemUpdate(index, "productId", "");
                              }
                            }
                          }}
                          className="w-full h-8 text-[11px] font-semibold border-slate-200"
                          autoComplete="off"
                        />
                        <Textarea
                          rows={1}
                          placeholder="Product Description / Specs (optional)..."
                          value={item.productDescription || ""}
                          onChange={(e) => handleLineItemUpdate(index, "productDescription", e.target.value)}
                          className="w-full min-h-[30px] py-1 px-2 text-[10px] font-normal border-slate-200 bg-slate-50/50 resize-y transition-all focus:min-h-[52px] field-sizing-content"
                        />
                        <datalist id={`product-list-${index}`}>
                          {products.map((p) => (
                            <option key={p._id} value={p.productName}>
                              {p.productDescription ? `[${p.productDescription}] ` : ""}{p.unit} - ₹{p.sellingPrice}
                            </option>
                          ))}
                        </datalist>
                      </td>

                      <td className="p-2 w-28">
                        <select
                          value={item.unit}
                          onChange={(e) => handleLineItemUpdate(index, "unit", e.target.value)}
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        >
                          {CONSTRUCTION_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => handleLineItemUpdate(index, "quantity", e.target.value)}
                          className="h-8 text-xs text-right border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemUpdate(index, "unitPrice", e.target.value)}
                          className="h-8 text-xs text-right border-slate-200 bg-white font-medium text-slate-800"
                        />
                      </td>

                      <td className="p-2">
                        {gstCalculationMode === "OVERALL" ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded block text-center border border-slate-200">
                            Bill GST ({overallGstRate}%)
                          </span>
                        ) : (
                          <select
                            value={item.gstRate !== undefined ? item.gstRate : 18}
                            onChange={(e) => handleLineItemUpdate(index, "gstRate", e.target.value)}
                            className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                          >
                            {LINE_ITEM_GST_OPTIONS.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="p-2 text-right font-black text-slate-900 text-xs font-mono">
                        ₹ {Number(item.totalAmount || 0).toFixed(2)}
                      </td>

                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLineItem(index)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="gap-1.5 text-xs font-semibold border-slate-300 text-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Item</span>
              </Button>

              
            </div>
          </div>

          {/* Bill of Materials (BOM) Editor */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Bill of Materials (BOM)</span>
                <span className="text-[10px] text-slate-400">List raw materials, fabrication specifications, or components used</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBOMItem}
                className="gap-1 text-[10px] h-7 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>Add BOM Component</span>
              </Button>
            </div>

            {bomItems.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-20 border-b border-slate-200 text-slate-700 font-semibold text-[10px]">
                    <tr>
                      <th className="p-2 w-12 text-center font-bold bg-slate-100">#</th>
                      <th className="p-2 font-bold bg-slate-100">Component Name *</th>
                      <th className="p-2 font-bold bg-slate-100">Specification</th>
                      <th className="p-2 w-28 text-right font-bold bg-slate-100">Qty</th>
                      <th className="p-2 w-28 font-bold bg-slate-100">Unit</th>
                      <th className="p-2 w-16 text-center font-bold bg-slate-100">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bomItems.map((bom, index) => (
                      <tr key={index} className="hover:bg-slate-50/40">
                        <td className="p-2 text-center text-slate-400 font-bold">{index + 1}</td>
                        <td className="p-2">
                          <Input
                            required
                            placeholder="e.g. MS Steel Angle, Copper Wire"
                            value={bom.itemName}
                            onChange={(e) => handleBOMItemUpdate(index, "itemName", e.target.value)}
                            className="h-8 text-xs border-slate-250 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <Textarea
                            rows={1}
                            placeholder="e.g. 50x50x5mm, IS 2062 Gr A"
                            value={bom.specification}
                            onChange={(e) => handleBOMItemUpdate(index, "specification", e.target.value)}
                            className="w-full min-h-[32px] py-1 px-2 text-xs border-slate-200 bg-white resize-y transition-all focus:min-h-[52px] field-sizing-content"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={bom.quantity}
                            onChange={(e) => handleBOMItemUpdate(index, "quantity", e.target.value)}
                            className="h-8 text-xs text-right border-slate-250 bg-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={bom.unit}
                            onChange={(e) => handleBOMItemUpdate(index, "unit", e.target.value)}
                            className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                          >
                            {CONSTRUCTION_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBOMItem(index)}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-white">
                <p className="text-xs text-slate-400 font-medium">No Bill of Materials (BOM) components added yet.</p>
              </div>
            )}
          </div>

          {/* Calculations & GST Selector Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Customer Notes</Label>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("default_customer_notes", notes);
                      toast.success("Saved this note as default for all future bills");
                    }}
                    className="text-[10px] text-amber-700 font-bold hover:underline hover:text-amber-800 transition-colors"
                  >
                    Save as Default
                  </button>
                </div>
                <SpellCheckTextarea
                  value={notes}
                  onValueChange={setNotes}
                  className="mt-1 text-xs border-slate-200 min-h-[64px]"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-800">Authorised Signatory *</Label>
                <select
                  value={selectedSignatory.name ? `${selectedSignatory.name}|${selectedSignatory.designation}` : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const [name, designation] = val.split("|");
                      const matched = signatories.find(
                        (s) => s.name === name || (s.name === name && s.designation === designation)
                      );
                      setSelectedSignatory({
                        name,
                        designation: designation || matched?.designation || "",
                        signatureUrl: matched?.signatureUrl || "",
                      });
                    } else {
                      setSelectedSignatory({ name: "", designation: "", signatureUrl: "" });
                    }
                  }}
                  className="mt-1 w-full h-8 px-2 text-xs bg-white border border-slate-200 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  <option value="">Select Signatory...</option>
                  {signatories.map((sig, idx) => (
                    <option key={idx} value={`${sig.name}|${sig.designation}`}>
                      {sig.name} ({sig.designation}){sig.signatureUrl ? " [Signature Uploaded]" : ""}
                    </option>
                  ))}
                  {selectedSignatory.name &&
                    !signatories.some((s) => s.name === selectedSignatory.name) && (
                      <option
                        value={`${selectedSignatory.name}|${selectedSignatory.designation}`}
                      >
                        {selectedSignatory.name} ({selectedSignatory.designation})
                        {selectedSignatory.signatureUrl ? " [Signature Uploaded]" : ""}
                      </option>
                    )}
                </select>

                {selectedSignatory.signatureUrl && (
                  <div className="flex items-center gap-2 mt-2 pt-1">
                    <input
                      type="checkbox"
                      id="attachSig"
                      checked={attachSignatureImage}
                      onChange={(e) => setAttachSignatureImage(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <Label htmlFor="attachSig" className="text-[11px] font-semibold text-slate-600 cursor-pointer">
                      Attach digital signature image to document
                    </Label>
                  </div>
                )}

                {selectedSignatory.signatureUrl && attachSignatureImage && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold">Attached Transparent Signature:</span>
                    <img
                      src={selectedSignatory.signatureUrl}
                      alt="Signatory Signature Preview"
                      className="h-8 max-w-[140px] object-contain bg-white rounded px-2 py-0.5 border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Summary Box (Right) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Sum of Items):</span>
                <span className="font-bold text-slate-900">₹ {subTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-bold">Total Discount (₹):</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(e.target.value)}
                  className="w-28 h-8 text-xs text-right border-slate-300 bg-white font-bold text-rose-600"
                />
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-bold">Freight / Transport Charges:</span>
                <Input
                  type="number"
                  step="0.01"
                  value={freightCharges}
                  onChange={(e) => setFreightCharges(e.target.value)}
                  className="w-28 h-8 text-xs text-right border-slate-300 bg-white font-bold"
                />
              </div>

              {/* Adjustment Section (Positive & Negative) */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-slate-700">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">Adjustments (+ / -):</span>
                    <span className="text-[10px] text-slate-400 font-normal">(e.g. +100 or -50)</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className={`w-28 h-8 text-xs text-right border-slate-300 bg-white font-bold ${
                      Number(adjustmentAmount) < 0
                        ? "text-rose-600 font-black"
                        : Number(adjustmentAmount) > 0
                        ? "text-emerald-600 font-black"
                        : "text-slate-900"
                    }`}
                  />
                </div>
                <Input
                  placeholder="Adjustment Description / Reason (e.g. Round off, Special Discount)"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  className="h-7 text-[11px] border-slate-200 bg-white"
                />
              </div>

              <div className="hidden">
                {/* GST percentage dropdown removed */}
              </div>

              <div className="flex justify-between text-slate-700">
                <span>Calculated GST Amount:</span>
                <span className="font-bold text-slate-900">₹ {gstAmount.toFixed(2)}</span>
              </div>

              {/* Round-Off Strategy & Diff */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-slate-700">
                  <div>
                    <span className="font-bold block text-xs">Round-off Method:</span>
                    <span className="text-[10px] text-amber-700 font-semibold">Incremental (+ Ceil) by default</span>
                  </div>
                  <select
                    value={roundOffMode}
                    onChange={(e) => setRoundOffMode(e.target.value as any)}
                    className="w-44 h-8 px-2 text-xs border border-amber-300 bg-amber-50/50 font-bold text-amber-900 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                  >
                    <option value="CEIL">Round Up (+ Incremental)</option>
                    <option value="FLOOR">Round Down (- Floor)</option>
                    <option value="NEAREST">Nearest Whole Integer</option>
                    <option value="NONE">Exact Decimals (No Round-off)</option>
                  </select>
                </div>
                {roundOffDiff !== 0 && (
                  <div className="flex justify-between text-[11px] font-bold px-1 py-0.5 bg-slate-100 rounded border border-slate-200">
                    <span className="text-slate-600">Auto Round-off Diff:</span>
                    <span className={roundOffDiff > 0 ? "text-emerald-700" : "text-rose-700"}>
                      {roundOffDiff > 0 ? "+" : ""}{roundOffDiff.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-3 border-t-2 border-slate-300">
                <span>Grand Total Amount:</span>
                <span className="text-base text-amber-700">
                  ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: roundOffMode === "NONE" ? 2 : 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700 pt-2 border-t border-dashed border-slate-200">
                <span className="font-bold">Amount Received:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount || ""}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setPaidAmount(val);
                  }}
                  className="w-28 h-8 text-xs text-right border-slate-300 bg-white font-bold"
                />
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-700">
                <span>Balance Amount:</span>
                <span className="text-slate-900">
                  ₹ {Math.max(0, grandTotal - paidAmount).toLocaleString("en-IN", { minimumFractionDigits: roundOffMode === "NONE" ? 2 : 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal 1: Inline Customer Creation */}
        <Dialog open={inlineCustomerModalOpen} onOpenChange={(open) => setInlineCustomerModalOpen(open)}>
          <DialogContent className="bg-white border border-slate-200">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Quick Inline Customer Registration
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Register a customer on-the-fly to attach directly to this active invoice.
                </DialogDescription>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveInlineCustomer} className="space-y-4 pt-1 text-xs">
              {/* Type Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInlineCustomerData({ ...inlineCustomerData, customerType: "INDIVIDUAL" })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    inlineCustomerData.customerType === "INDIVIDUAL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Individual Customer
                </button>
                <button
                  type="button"
                  onClick={() => setInlineCustomerData({ ...inlineCustomerData, customerType: "BUSINESS" })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    inlineCustomerData.customerType === "BUSINESS"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Business Entity
                </button>
              </div>

              {inlineCustomerData.customerType === "INDIVIDUAL" ? (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Salutation</Label>
                      <select
                        value={inlineCustomerData.salutation}
                        onChange={(e) =>
                          setInlineCustomerData({ ...inlineCustomerData, salutation: e.target.value })
                        }
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
                        placeholder="e.g. Anand Sharma"
                        value={inlineCustomerData.customerName}
                        onChange={(e) =>
                          setInlineCustomerData({ ...inlineCustomerData, customerName: e.target.value })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Mobile Number * (10 Digits)</Label>
                      <Input
                        required
                        placeholder="9876543210"
                        maxLength={10}
                        value={inlineCustomerData.phone}
                        onChange={(e) =>
                          setInlineCustomerData({ ...inlineCustomerData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white font-mono tracking-wider"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="anand@gmail.com"
                        value={inlineCustomerData.email}
                        onChange={(e) =>
                          setInlineCustomerData({ ...inlineCustomerData, email: e.target.value })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-bold text-slate-700">Business / Company Name *</Label>
                      <Input
                        required
                        placeholder="e.g. Apex Builders Pvt Ltd"
                        value={inlineCustomerData.customerName}
                        onChange={(e) =>
                          setInlineCustomerData({
                            ...inlineCustomerData,
                            customerName: e.target.value,
                            companyName: e.target.value,
                          })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">GSTIN Number</Label>
                      <Input
                        placeholder="27AAAAA0000A1Z5"
                        value={inlineCustomerData.gstin}
                        onChange={(e) =>
                          setInlineCustomerData({ ...inlineCustomerData, gstin: e.target.value.toUpperCase() })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white uppercase font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Business Email Address</Label>
                      <Input
                        type="email"
                        placeholder="contact@apexbuilders.com"
                        value={inlineCustomerData.email}
                        onChange={(e) =>
                          setInlineCustomerData({ ...inlineCustomerData, email: e.target.value })
                        }
                        className="mt-1 h-9 text-xs border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <Label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                      Point of Contact (POC) Specification
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700">POC Person Name *</Label>
                        <Input
                          required
                          placeholder="e.g. Vijay Kumar (Site Engg)"
                          value={inlineCustomerData.contactPersonName}
                          onChange={(e) =>
                            setInlineCustomerData({ ...inlineCustomerData, contactPersonName: e.target.value })
                          }
                          className="mt-1 h-9 text-xs border-slate-200 bg-slate-50/50"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-slate-700">POC Contact Number * (10 Digits)</Label>
                        <Input
                          required
                          placeholder="9876543210"
                          maxLength={10}
                          value={inlineCustomerData.phone}
                          onChange={(e) =>
                            setInlineCustomerData({ ...inlineCustomerData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                          }
                          className="mt-1 h-9 text-xs border-slate-200 bg-slate-50/50 font-mono tracking-wider"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Structured Address Schema Section (2 Streets, Cascading State -> City, Integer Pincode) */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <Label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-1">
                  Billing Address Specification
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Street Address 1 * (Mandatory)</Label>
                    <Input
                      required
                      placeholder="e.g. Flat / Plot No, Building Name, Industrial Area"
                      value={inlineCustomerData.street1}
                      onChange={(e) => setInlineCustomerData({ ...inlineCustomerData, street1: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Street Address 2 (Optional)</Label>
                    <Input
                      placeholder="e.g. Landmark, Near Metro Station"
                      value={inlineCustomerData.street2}
                      onChange={(e) => setInlineCustomerData({ ...inlineCustomerData, street2: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">State * (Indian States)</Label>
                    <select
                      value={inlineCustomerData.state}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cities = getCitiesOfIndianState(val || "Maharashtra");
                        setInlineCities(cities);
                        setInlineCustomerData({
                          ...inlineCustomerData,
                          state: val || "Maharashtra",
                          placeOfSupply: val || "Maharashtra",
                          city: cities.length > 0 ? cities[0] : "",
                        });
                      }}
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
                    <Label className="text-[11px] font-bold text-slate-700">City * (Filtered by State)</Label>
                    <select
                      value={inlineCustomerData.city}
                      onChange={(e) => setInlineCustomerData({ ...inlineCustomerData, city: e.target.value })}
                      disabled={inlineCities.length === 0}
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium disabled:opacity-50"
                    >
                      {inlineCities.length === 0 ? (
                        <option value="">Select State first</option>
                      ) : (
                        inlineCities.map((c) => (
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
                      value={inlineCustomerData.pincode}
                      onChange={(e) => setInlineCustomerData({ ...inlineCustomerData, pincode: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setInlineCustomerModalOpen(false)} className="h-9 px-4 text-xs font-semibold" disabled={savingInlineCustomer}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-5 shadow-xs" disabled={savingInlineCustomer}>
                  {savingInlineCustomer ? "Saving..." : "Save & Attach Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal 2: Inline Product Creation */}
        <Dialog open={inlineProductModalOpen} onOpenChange={(open) => setInlineProductModalOpen(open)}>
          <DialogContent className="bg-white border border-slate-200">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Quick Inline Material Product Creation
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Create a new material product on-the-fly to insert directly into active invoice line items.
                </DialogDescription>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveInlineProduct} className="space-y-4 pt-1 text-xs">
              {/* Material Info (Wide 4-Column Layout) */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700">Product Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Tata Tiscon 12mm Rebar"
                      value={inlineProductData.productName}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, productName: e.target.value })
                      }
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-medium"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Category *</Label>
                    <select
                      value={inlineProductData.category}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, category: e.target.value })
                      }
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {CONSTRUCTION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Construction Unit *</Label>
                    <select
                      value={inlineProductData.unit}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, unit: e.target.value })
                      }
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium max-h-60"
                    >
                      {CONSTRUCTION_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Description / Technical Specifications</Label>
                    <div className="flex gap-2">
                      <Textarea
                        rows={1}
                        placeholder="Enter grade, manufacturer details, or site notes..."
                        value={inlineProductData.productDescription || ""}
                        onChange={(e) =>
                          setInlineProductData({ ...inlineProductData, productDescription: e.target.value })
                        }
                        className="min-h-[36px] text-xs border-slate-200 bg-white font-medium flex-1 py-1.5 px-3 resize-y transition-all focus:min-h-[60px] field-sizing-content"
                      />
                      <Button
                        type="button"
                        onClick={generateAIDescription}
                        disabled={generatingAI || !inlineProductData.productName}
                        className="h-9 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md shrink-0 transition-colors"
                      >
                        {generatingAI ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock (Wide 4-Column Layout) */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Purchase Price (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="450"
                      value={inlineProductData.purchasePrice}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, purchasePrice: e.target.value })
                      }
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Selling Price (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="520"
                      value={inlineProductData.sellingPrice}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, sellingPrice: e.target.value })
                      }
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-bold text-amber-800"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Current Stock *</Label>
                    <Input
                      type="number"
                      required
                      placeholder="100"
                      value={inlineProductData.currentStock}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, currentStock: e.target.value })
                      }
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">GST Tax Rate *</Label>
                    <select
                      value={inlineProductData.gstRate}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, gstRate: e.target.value })
                      }
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                    >
                      {GST_PERCENTAGE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}% GST
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Min Alert Limit *</Label>
                    <Input
                      type="number"
                      required
                      placeholder="10"
                      value={inlineProductData.minimumStockQuantity}
                      onChange={(e) =>
                        setInlineProductData({ ...inlineProductData, minimumStockQuantity: e.target.value })
                      }
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setInlineProductModalOpen(false)} className="h-9 px-4 text-xs font-semibold" disabled={savingInlineProduct}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-5 shadow-xs" disabled={savingInlineProduct}>
                  {savingInlineProduct ? "Saving..." : "Save & Add to Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}

