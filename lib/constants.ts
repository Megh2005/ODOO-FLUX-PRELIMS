export const INVENTORY_UNITS = [
  "Piece",
  "Box",
  "Pack / Packet",
  "Set",
  "Pair",
  "Dozen",
  "Kilogram (kg)",
  "Litre",
  "Meter (m)",
  "Square Feet (sq ft)",
  "Square Meter (sq m)",
  "Bundle",
  "Bag",
  "Sheet",
  "Container",
  "Truckload",
  "Metric Ton",
  "Cubic Feet (CFT)",
  "Nos.",
  "Lumpsum",
];

export const INVENTORY_CATEGORIES = [
  "Apparel & Fashion",
  "Automotive & Spare Parts",
  "Bakery & Confectionery",
  "Beverages & Drinks",
  "Books & Stationery",
  "Chemicals & Solvents",
  "Cleaning & Janitorial",
  "Dairy & Poultry",
  "Electronics & Electricals",
  "Farm Produce & Agriculture",
  "Fast Food & Snacks",
  "Frozen Foods",
  "Fruits & Vegetables",
  "Furniture & Decor",
  "General Merchandise",
  "Grains, Pulses & Cereals",
  "Groceries & FMCG",
  "Hardware & Tools",
  "Healthcare & Pharmaceuticals",
  "Home Appliances",
  "Industrial Supplies",
  "Meat, Fish & Seafood",
  "Medical Supplies",
  "Miscellaneous",
  "Office Supplies",
  "Packaging & Containers",
  "Paints & Finishes",
  "Personal Care & Cosmetics",
  "Plumbing & Sanitary",
  "Raw Materials",
  "Safety Equipment",
  "Services & Consulting",
  "Spices & Condiments",
  "Sports & Fitness",
];

// Aliases for backward compatibility
export const CONSTRUCTION_UNITS = INVENTORY_UNITS;
export const CONSTRUCTION_CATEGORIES = INVENTORY_CATEGORIES;

export const DOCUMENT_TYPES = [
  { value: "TAX_INVOICE", label: "Tax Invoice", prefix: "INV" },
  { value: "QUOTATION", label: "Quotation", prefix: "QTN" },
  { value: "ESTIMATE", label: "Estimate", prefix: "EST" },
  { value: "DELIVERY_CHALLAN", label: "Delivery Challan", prefix: "DC" },
  { value: "PURCHASE_ORDER", label: "Purchase Order", prefix: "PO" },
  { value: "SALES_ORDER", label: "Sales Order", prefix: "SO" },
  { value: "CREDIT_NOTE", label: "Credit Note", prefix: "CN" },
  { value: "DEBIT_NOTE", label: "Debit Note", prefix: "DN" },
];

export const PAYMENT_TERMS_OPTIONS = [
  "Already Paid",
  "Due on Receipt",
  "Due within 7 Days",
  "Due within 15 Days",
  "Due within 30 Days",
  "Due within 45 Days",
  "Due within 60 Days",
];

export const GST_PERCENTAGE_OPTIONS = [0, 5, 12, 18, 28];

export const LINE_ITEM_GST_OPTIONS = [
  { value: 18, label: "18% GST" },
  { value: 12, label: "12% GST" },
  { value: 5, label: "5% GST" },
  { value: 28, label: "28% GST" },
  { value: 0, label: "0% GST (Exempt)" },
  { value: -1, label: "Out of Scope (0%)" },
];
