import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { getGstStateDetails } from "./indianLocations";

// Helper function to convert numbers to Indian Rupee Words
function numberToWordsINR(amount: number): string {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return "Indian Rupee Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const numStr = ("000000000" + num).slice(-9);
  const match = numStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!match) return "Indian Rupee " + num + " Only";

  let str = "";
  const crore = Number(match[1]);
  const lakh = Number(match[2]);
  const thousand = Number(match[3]);
  const hundred = Number(match[4]);
  const remaining = Number(match[5]);

  str += crore !== 0 ? (a[crore] || b[Math.floor(crore / 10)] + " " + a[crore % 10]) + "Crore " : "";
  str += lakh !== 0 ? (a[lakh] || b[Math.floor(lakh / 10)] + " " + a[lakh % 10]) + "Lakh " : "";
  str += thousand !== 0 ? (a[thousand] || b[Math.floor(thousand / 10)] + " " + a[thousand % 10]) + "Thousand " : "";
  str += hundred !== 0 ? (a[hundred] || b[Math.floor(hundred / 10)] + " " + a[hundred % 10]) + "Hundred " : "";
  str += remaining !== 0 ? (str !== "" ? "and " : "") + (a[remaining] || b[Math.floor(remaining / 10)] + " " + a[remaining % 10]) : "";

  return "Indian Rupee " + str.trim() + " Only";
}

// Zoho Invoice Inspired PDF Stylesheet
const styles = (StyleSheet as any).create({
  page: {
    fontFamily: "Courier",
    fontSize: 9,
    paddingTop: 24,
    paddingBottom: 72,
    paddingHorizontal: 24,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  docFrame: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 12,
    flex: 1,
  },

  // Company & Invoice Title Header (Logo Top Left, Company Center, Title Top Right)
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  headerLogoCol: {
    width: "25%",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerLogoImage: {
    width: 50,
    height: 50,
    objectFit: "contain",
  },
  headerCenterCol: {
    width: "50%",
    alignItems: "center",
    textAlign: "center",
  },
  headerRightCol: {
    width: "25%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Courier-Bold",
    color: "#000000",
    marginBottom: 2,
    textAlign: "center",
  },
  companyText: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.25,
    textAlign: "center",
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Courier-Bold",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "right",
  },

  // Metadata & Customer Combined Grid (2 Columns)
  metaGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
  },
  metaLeftCol: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#000000",
  },
  metaRightCol: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  metaLabelRed: {
    fontSize: 9.5,
    color: "#000000",
    width: 110,
  },
  metaVal: {
    fontSize: 9.5,
    fontFamily: "Courier-Bold",
    color: "#000000",
  },

  // Customer Address Styling
  addressNameBold: {
    fontSize: 10,
    fontFamily: "Courier-Bold",
    color: "#000000",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 9.5,
    color: "#333333",
    lineHeight: 1.25,
  },

  // Subject Block (Single Line Layout)
  subjectBlock: {
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  subjectLabelRed: {
    fontSize: 9.5,
    color: "#000000",
    marginRight: 4,
  },
  subjectText: {
    fontSize: 9.5,
    color: "#000000",
  },

  // Line Items Table
  table: {
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
  },
  trHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    alignItems: "stretch",
  },
  th: {
    fontSize: 9.5,
    fontFamily: "Courier-Bold",
    color: "#000000",
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    alignItems: "stretch",
  },
  trLast: {
    borderBottomWidth: 0,
  },

  colIndex: { width: "5%", borderRightWidth: 1, borderRightColor: "#000000", paddingVertical: 4, paddingHorizontal: 4, justifyContent: "center" },
  colDesc: { width: "49%", borderRightWidth: 1, borderRightColor: "#000000", paddingVertical: 4, paddingHorizontal: 5, justifyContent: "center" },
  colUnit: { width: "10%", borderRightWidth: 1, borderRightColor: "#000000", paddingVertical: 4, paddingHorizontal: 4, justifyContent: "center" },
  colQty: { width: "11%", borderRightWidth: 1, borderRightColor: "#000000", paddingVertical: 4, paddingHorizontal: 4, justifyContent: "center" },
  colRate: { width: "11%", borderRightWidth: 1, borderRightColor: "#000000", paddingVertical: 4, paddingHorizontal: 4, justifyContent: "center" },
  colAmount: { width: "14%", paddingVertical: 4, paddingHorizontal: 4, justifyContent: "center" },

  td: {
    fontSize: 9.5,
    color: "#000000",
  },

  // Bottom Summary Section (Words & Calculations + Signatory)
  bottomGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 16,
    alignItems: "stretch",
  },
  wordsCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    padding: 10,
    justifyContent: "space-between",
  },
  summaryCol: {
    width: 220,
    padding: 0,
  },
  wordsHeading: {
    fontSize: 9.5,
    color: "#555555",
    marginBottom: 2,
  },
  wordsVal: {
    fontSize: 9.5,
    fontFamily: "Courier-BoldOblique",
    color: "#000000",
    marginBottom: 10,
  },
  disclaimerText: {
    fontSize: 9,
    color: "#444444",
    lineHeight: 1.3,
  },

  calcRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    alignItems: "stretch",
  },
  calcRowLast: {
    borderBottomWidth: 0,
  },
  calcLabelCell: {
    width: "60%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  calcValCell: {
    width: "40%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  calcLabel: {
    fontSize: 9.5,
    color: "#333333",
  },
  calcVal: {
    fontSize: 9.5,
    color: "#000000",
  },
  calcValBold: {
    fontSize: 10,
    fontFamily: "Courier-Bold",
    color: "#000000",
  },

  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  signatureLeftCol: {
    width: "48%",
  },
  signatureRightCol: {
    width: "48%",
    alignItems: "center",
  },
  signatoryHeader: {
    fontSize: 9,
    fontFamily: "Courier-Bold",
    color: "#334155",
    marginBottom: 2,
    textAlign: "center",
  },
  signatureImage: {
    width: 130,
    height: 40,
    objectFit: "contain",
    marginVertical: 2,
  },
  signatureSpace: {
    height: 35,
  },
  signatoryNameText: {
    fontSize: 9.5,
    fontFamily: "Courier-Bold",
    color: "#0f172a",
    textAlign: "center",
  },
  signatoryLine: {
    width: 140,
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    marginVertical: 2,
  },
  signatoryDesignationText: {
    fontSize: 9,
    fontFamily: "Courier-Bold",
    color: "#475569",
    textAlign: "center",
  },

  // Footer branding
  // Footer branding
  footerText: {
    fontSize: 8.5,
    color: "#777777",
    textAlign: "center",
    marginTop: "auto",
  },
  termsSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  termsHeading: {
    fontSize: 9.5,
    fontFamily: "Courier-Bold",
    color: "#000000",
    marginBottom: 4,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  bulletSymbol: {
    width: 10,
    fontSize: 9.5,
    fontFamily: "Courier-Bold",
    color: "#000000",
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.25,
  },
});

const DEFAULT_COMPANY = {
  name: "Your Company",
  tagline: "Corporate Profile Setup Required",
  gstin: "N/A",
  phone: "N/A",
  email: "N/A",
  signatoryName: "Authorized Signatory",
  signatoryDesignation: "Signatory",
};

const GST_STATE_CODES: Record<string, string> = {
  "West Bengal": "19",
  "Maharashtra": "27",
  "Delhi": "07",
  "Karnataka": "29",
  "Tamil Nadu": "33",
  "Uttar Pradesh": "09",
  "Gujarat": "24",
  "Haryana": "06",
  "Rajasthan": "08",
  "Telangana": "36",
  "Andhra Pradesh": "37",
  "Kerala": "32",
  "Bihar": "10",
  "Punjab": "03",
  "Madhya Pradesh": "23",
  "Assam": "18",
  "Odisha": "21",
  "Jharkhand": "20",
  "Chhattisgarh": "22",
  "Uttarakhand": "05",
  "Goa": "30",
  "Himachal Pradesh": "02",
  "Jammu and Kashmir": "01",
  "Chandigarh": "04",
};

interface InvoicePDFProps {
  invoice: any;
  company?: any;
}

export const InvoicePDFDocument: React.FC<InvoicePDFProps> = ({ invoice, company }) => {
  const cp = company || DEFAULT_COMPANY;
  const customer = invoice.customerSnapshot || {};
  const lineItems = invoice.lineItems || [];
  const docTypeLabel = String(invoice.documentType || "TAX_INVOICE").replace(/_/g, " ");

  const grandTotal = Number(invoice.grandTotal || 0);
  const paidAmt = Number(invoice.paidAmount || 0);
  const balanceDue = Math.max(0, grandTotal - paidAmt);
  const amountInWords = numberToWordsINR(grandTotal);

  const sigName = invoice.signatoryName || cp.signatoryName || "Authorized Signatory";
  const sigDesignation = invoice.signatoryDesignation || cp.signatoryDesignation || "Designated Signatory";

  let sigUrl = invoice.signatorySignatureUrl;
  if (sigUrl === undefined && cp.signatories && Array.isArray(cp.signatories)) {
    const matched = cp.signatories.find(
      (s: any) =>
        (s.name && s.name.toLowerCase().trim() === sigName.toLowerCase().trim()) ||
        (s.designation && s.designation.toLowerCase().trim() === sigDesignation.toLowerCase().trim())
    );
    if (matched?.signatureUrl) {
      sigUrl = matched.signatureUrl;
    }
  }
  if (sigUrl === undefined && cp.signatureUrl && !invoice.signatoryName) {
    sigUrl = cp.signatureUrl;
  }
  if (!sigUrl) {
    sigUrl = "";
  }

  const billingStreet = customer.billingAddress?.street || customer.billingAddress?.street1 || "";
  const billingCity = customer.billingAddress?.city || "";
  const billingState = customer.billingAddress?.state || "";
  const billingPincode = customer.billingAddress?.pincode || "";

  const isQuotationOrEstimate =
    invoice.documentType === "QUOTATION" || invoice.documentType === "ESTIMATE";
  const dateLabel = isQuotationOrEstimate ? "Estimate Date" : "Invoice Date";

  const formattedIssueDate = invoice.issueDate
    ? new Date(invoice.issueDate).toLocaleDateString("en-GB")
    : "N/A";
  const formattedDueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-GB")
    : (invoice.paymentTerms || "30 Days");

  const posDetails = getGstStateDetails(
    customer.billingAddress?.state || cp.address?.state,
    customer.gstin
  );
  const placeOfSupplyText = posDetails.formatted;

  return (
    <Document title={`${invoice.invoiceNumber || "Invoice"}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.docFrame}>
          {/* Top Header Section (Logo Top-Left, Company Details Center, Title Top-Right) */}
          <View style={styles.topHeader} fixed>
            <View style={styles.headerLogoCol}>
              {cp.logoUrl ? (
                <Image src={cp.logoUrl} style={styles.headerLogoImage} />
              ) : null}
            </View>

            <View style={styles.headerCenterCol}>
              <Text style={styles.companyName}>{cp.name}</Text>
              <Text style={styles.companyText}>{cp.address?.street1}</Text>
              <Text style={styles.companyText}>
                {cp.address?.street2
                  ? `${cp.address.street2}, ${cp.address.city}`
                  : `${cp.address?.city}, ${cp.address?.state}`}
              </Text>
              <Text style={styles.companyText}>
                {`${cp.address?.state} ${cp.address?.pincode}, ${cp.address?.country}`}
              </Text>
              <Text style={styles.companyText}>{cp.email}</Text>
              <Text style={styles.companyText}>GSTIN: {cp.gstin}</Text>
            </View>

            <View style={styles.headerRightCol}>
              <Text style={styles.docTitle}>{docTypeLabel}</Text>
            </View>
          </View>

          {/* Metadata & Billed To Combined Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaLeftCol}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabelRed}>Reference No.</Text>
                <Text style={styles.metaVal}>: {invoice.invoiceNumber || "N/A"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabelRed}>{dateLabel}</Text>
                <Text style={styles.metaVal}>: {formattedIssueDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabelRed}>Valid Upto</Text>
                <Text style={styles.metaVal}>: {formattedDueDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabelRed}>Place Of Supply</Text>
                <Text style={styles.metaVal}>: {placeOfSupplyText}</Text>
              </View>
            </View>

            <View style={styles.metaRightCol}>
              <Text style={styles.addressNameBold}>
                BILLED TO: {customer.customerName || "Walk-in Customer"}
              </Text>
              {customer.companyName ? (
                <Text style={styles.addressText}>{customer.companyName}</Text>
              ) : null}
              {billingStreet ? <Text style={styles.addressText}>{billingStreet}</Text> : null}
              <Text style={styles.addressText}>
                {[billingCity, billingState, billingPincode].filter(Boolean).join(", ")}
              </Text>
              {customer.gstin ? (
                <Text style={[styles.addressText, { fontFamily: "Courier-Bold", color: "#000000", marginTop: 1 }]}>
                  GSTIN: {customer.gstin}
                </Text>
              ) : null}
              {customer.phone ? (
                <Text style={styles.addressText}>Ph: {customer.phone}</Text>
              ) : null}
            </View>
          </View>

          {/* Subject Line Block (Single Line) */}
          {invoice.subject ? (
            <View style={styles.subjectBlock}>
              <Text style={[styles.subjectLabelRed, { fontFamily: "Courier-Bold" }]}>Subject :</Text>
              <Text style={[styles.subjectText, { fontFamily: "Courier-Bold" }]}>{invoice.subject}</Text>
            </View>
          ) : null}

          {/* Line Items Table */}
          <View style={styles.table}>
            <View style={styles.trHeader} fixed>
              <View style={styles.colIndex}>
                <Text style={styles.th}>#</Text>
              </View>
              <View style={styles.colDesc}>
                <Text style={styles.th}>Item Name</Text>
              </View>
              <View style={styles.colUnit}>
                <Text style={styles.th}>Unit</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={[styles.th, { textAlign: "right" }]}>Qty</Text>
              </View>
              <View style={styles.colRate}>
                <Text style={[styles.th, { textAlign: "right" }]}>Rate</Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={[styles.th, { textAlign: "right" }]}>Amount</Text>
              </View>
            </View>
 
            {lineItems.map((item: any, index: number) => {
              const hasFreight = Number(invoice.freightCharges) > 0;
              const isLast = !hasFreight && index === lineItems.length - 1;
              return (
                <View key={index} style={[styles.tr, isLast ? styles.trLast : {}]} wrap={false}>
                  <View style={styles.colIndex}>
                    <Text style={styles.td}>{index + 1}</Text>
                  </View>
                  <View style={styles.colDesc}>
                    <Text style={[styles.td, { fontFamily: "Courier-Bold", fontSize: 10 }]}>{item.productName || ""}</Text>
                    {item.productDescription ? (
                      <Text style={[styles.td, { fontSize: 8.5, color: "#222222", marginTop: 2 }]}>
                        {item.productDescription}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.colUnit}>
                    <Text style={styles.td}>{item.unit || "Pcs"}</Text>
                  </View>
                  <View style={styles.colQty}>
                    <Text style={[styles.td, { textAlign: "right" }]}>
                      {Number(item.quantity || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.colRate}>
                    <Text style={[styles.td, { textAlign: "right" }]}>
                      {Number(item.unitPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.colAmount}>
                    <Text style={[styles.td, { textAlign: "right" }]}>
                      {Number(item.totalAmount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
 
            {Number(invoice.freightCharges) > 0 ? (
              <View style={[styles.tr, styles.trLast]} wrap={false}>
                <View style={styles.colIndex}>
                  <Text style={styles.td}>{lineItems.length + 1}</Text>
                </View>
                <View style={styles.colDesc}>
                  <Text style={styles.td}>Freight Charge</Text>
                </View>
                <View style={styles.colUnit}>
                  <Text style={styles.td}>L.S.</Text>
                </View>
                <View style={styles.colQty}>
                  <Text style={[styles.td, { textAlign: "right" }]}>1.00</Text>
                </View>
                <View style={styles.colRate}>
                  <Text style={[styles.td, { textAlign: "right" }]}>
                    {Number(invoice.freightCharges).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={[styles.td, { textAlign: "right" }]}>
                    {Number(invoice.freightCharges).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Bill of Materials (BOM) Grid */}
          {invoice.bomItems && invoice.bomItems.length > 0 ? (
            <View style={{ marginTop: 8, marginBottom: 12 }} wrap={false}>
              <Text style={[styles.wordsHeading, { fontFamily: "Courier-Bold", color: "#000000", marginBottom: 6 }]}>
                Bill of Materials (BOM)
              </Text>
              <View style={styles.table}>
                <View style={styles.trHeader} fixed>
                  <View style={[styles.colIndex, { width: "5%" }]}>
                    <Text style={styles.th}>#</Text>
                  </View>
                  <View style={[styles.colDesc, { width: "45%" }]}>
                    <Text style={styles.th}>Component Name</Text>
                  </View>
                  <View style={{ width: "25%", borderRightWidth: 1, borderRightColor: "#000000", padding: 5, justifyContent: "center" }}>
                    <Text style={styles.th}>Specification</Text>
                  </View>
                  <View style={[styles.colQty, { width: "12%" }]}>
                    <Text style={[styles.th, { textAlign: "right" }]}>Qty</Text>
                  </View>
                  <View style={{ width: "13%", padding: 5, justifyContent: "center" }}>
                    <Text style={styles.th}>Unit</Text>
                  </View>
                </View>

                {invoice.bomItems.map((bom: any, bIdx: number) => {
                  const isLastBom = bIdx === invoice.bomItems.length - 1;
                  return (
                    <View key={bIdx} style={[styles.tr, isLastBom ? styles.trLast : {}]} wrap={false}>
                      <View style={[styles.colIndex, { width: "5%" }]}>
                        <Text style={styles.td}>{bIdx + 1}</Text>
                      </View>
                      <View style={[styles.colDesc, { width: "45%" }]}>
                        <Text style={styles.td}>{bom.itemName || ""}</Text>
                      </View>
                      <View style={{ width: "25%", borderRightWidth: 1, borderRightColor: "#000000", padding: 5, justifyContent: "center" }}>
                        <Text style={styles.td}>{bom.specification || "N/A"}</Text>
                      </View>
                      <View style={[styles.colQty, { width: "12%" }]}>
                        <Text style={[styles.td, { textAlign: "right" }]}>
                          {Number(bom.quantity || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ width: "13%", padding: 5, justifyContent: "center" }}>
                        <Text style={styles.td}>{bom.unit || "Pcs"}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Bottom Grid: Words & Calculations + Signatory */}
          <View style={styles.bottomGrid} wrap={false}>
            <View style={styles.wordsCol}>
              <View>
                <Text style={styles.wordsHeading}>Total In Words</Text>
                <Text style={styles.wordsVal}>{amountInWords}</Text>
                {invoice.notes ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.wordsHeading, { fontFamily: "Courier-Bold", color: "#000000" }]}>
                      Customer Notes
                    </Text>
                    <Text style={[styles.disclaimerText, { fontFamily: "Courier-Bold", color: "#000000", marginTop: 2 }]}>
                      {invoice.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.summaryCol}>
              <View style={styles.calcRow}>
                <View style={styles.calcLabelCell}>
                  <Text style={styles.calcLabel}>Sub Total</Text>
                </View>
                <View style={styles.calcValCell}>
                  <Text style={styles.calcVal}>
                    {Number(invoice.subTotal || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>

              {Number(invoice.totalDiscount || 0) > 0 && (
                <View style={styles.calcRow}>
                  <View style={styles.calcLabelCell}>
                    <Text style={styles.calcLabel}>Discount</Text>
                  </View>
                  <View style={styles.calcValCell}>
                    <Text style={styles.calcVal}>
                      - {Number(invoice.totalDiscount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {Number(invoice.gstAmount || 0) > 0 && (
                invoice.gstCalculationMode === "OVERALL" ? (
                  <View style={styles.calcRow}>
                    <View style={styles.calcLabelCell}>
                      <Text style={styles.calcLabel}>GST @ {invoice.overallGstRate || 18}%</Text>
                    </View>
                    <View style={styles.calcValCell}>
                      <Text style={styles.calcVal}>
                        {Number(invoice.gstAmount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                ) : (
                  (() => {
                    const gstGroups = (invoice.lineItems || []).reduce((acc: any, item: any) => {
                      const rate = item.gstRate !== undefined ? item.gstRate : (invoice.gstPercentage || 18);
                      if (rate <= 0) return acc;
                      if (!acc[rate]) acc[rate] = 0;
                      
                      const itemTotal = Number(item.totalAmount) || 0;
                      const subT = Number(invoice.subTotal) || 1;
                      const ratio = subT > 0 ? (itemTotal / subT) : 0;
                      const discountAmount = Number(invoice.totalDiscount || 0) * ratio;
                      const taxableAmount = itemTotal - discountAmount;
                      
                      acc[rate] += taxableAmount * rate / 100;
                      return acc;
                    }, {});

                    return Object.keys(gstGroups).map((rateStr) => {
                      const rate = Number(rateStr);
                      const amt = gstGroups[rate];
                      if (amt <= 0) return null;
                      return (
                        <View style={styles.calcRow} key={rateStr}>
                          <View style={styles.calcLabelCell}>
                            <Text style={styles.calcLabel}>GST @ {rate}%</Text>
                          </View>
                          <View style={styles.calcValCell}>
                            <Text style={styles.calcVal}>
                              {Number(amt).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </Text>
                          </View>
                        </View>
                      );
                    });
                  })()
                )
              )}

              {Number(invoice.freightCharges || 0) > 0 && (
                <View style={styles.calcRow}>
                  <View style={styles.calcLabelCell}>
                    <Text style={styles.calcLabel}>Freight Charge</Text>
                  </View>
                  <View style={styles.calcValCell}>
                    <Text style={styles.calcVal}>
                      {Number(invoice.freightCharges).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {Number(invoice.adjustmentAmount || 0) !== 0 && (
                <View style={styles.calcRow}>
                  <View style={styles.calcLabelCell}>
                    <Text style={styles.calcLabel}>
                      {invoice.adjustmentDescription || "Adjustment"}
                    </Text>
                  </View>
                  <View style={styles.calcValCell}>
                    <Text style={styles.calcVal}>
                      {Number(invoice.adjustmentAmount) > 0 ? "+" : ""}
                      {Number(invoice.adjustmentAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.calcRow}>
                <View style={[styles.calcLabelCell, { backgroundColor: "#f8fafc" }]}>
                  <Text style={[styles.calcLabel, { fontFamily: "Courier-Bold" }]}>Total</Text>
                </View>
                <View style={[styles.calcValCell, { backgroundColor: "#f8fafc" }]}>
                  <Text style={styles.calcValBold}>
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={styles.calcRow}>
                <View style={styles.calcLabelCell}>
                  <Text style={styles.calcLabel}>Amount Received</Text>
                </View>
                <View style={styles.calcValCell}>
                  <Text style={styles.calcVal}>
                    ₹{paidAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={[styles.calcRow, styles.calcRowLast]}>
                <View style={[styles.calcLabelCell, { backgroundColor: "#f8fafc" }]}>
                  <Text style={[styles.calcLabel, { fontFamily: "Courier-Bold" }]}>Balance Amount</Text>
                </View>
                <View style={[styles.calcValCell, { backgroundColor: "#f8fafc" }]}>
                  <Text style={styles.calcValBold}>
                    ₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Terms & Conditions Block */}
          {invoice.termsAndConditions ? (
            <View style={styles.termsSection} wrap={false}>
              <Text style={styles.termsHeading}>Terms & Conditions:</Text>
              {invoice.termsAndConditions.split("\n").map((line: string, lIdx: number) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                return (
                  <View key={lIdx} style={styles.bulletItem}>
                    <Text style={styles.bulletSymbol}>•</Text>
                    <Text style={styles.bulletText}>{trimmed}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Authorised Signatory & Disclaimer Block */}
          <View style={styles.signatureSection} wrap={false}>
            <View style={styles.signatureLeftCol}>
              <Text style={styles.disclaimerText}>
                This is a computer generated document issued by {cp.name}.
              </Text>
            </View>

            <View style={styles.signatureRightCol}>
              <Text style={styles.signatoryHeader}>For {cp.name}</Text>
              {sigUrl ? (
                <Image src={sigUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureSpace} />
              )}
              <Text style={styles.signatoryNameText}>{sigName}</Text>
              <View style={styles.signatoryLine} />
              <Text style={styles.signatoryDesignationText}>{sigDesignation}</Text>
            </View>
          </View>

          {/* Footer */}
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
};

export async function generateInvoicePDFBuffer(invoice: any, company?: any): Promise<Buffer> {
  const cp = company || {};
  let signatureUrl = invoice.signatorySignatureUrl;

  // Only fallback if signatureUrl is strictly undefined (legacy/unassigned).
  // If it's explicitly "", it means the user opted out of attaching the image.
  if (signatureUrl === undefined && cp.signatories && Array.isArray(cp.signatories)) {
    const sigName = invoice.signatoryName || cp.signatoryName || "";
    if (sigName) {
      const matched = cp.signatories.find(
        (s: any) => s.name?.toLowerCase().trim() === sigName.toLowerCase().trim()
      );
      if (matched?.signatureUrl) {
        signatureUrl = matched.signatureUrl;
      }
    }
  }
  if (signatureUrl === undefined && cp.signatureUrl && !invoice.signatoryName) {
    signatureUrl = cp.signatureUrl;
  }

  if (!signatureUrl) {
    signatureUrl = "";
  }

  let base64Signature = "";
  if (signatureUrl) {
    try {
      if (signatureUrl.startsWith("data:")) {
        base64Signature = signatureUrl;
      } else {
        const res = await fetch(signatureUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const buf = Buffer.from(ab);
          const mime = res.headers.get("content-type") || "image/png";
          base64Signature = `data:${mime};base64,${buf.toString("base64")}`;
        }
      }
    } catch (e) {
      console.error("Failed to pre-fetch signature image as Base64 for PDF rendering:", e);
    }
  }

  let base64Logo = "";
  if (cp.logoUrl) {
    try {
      if (cp.logoUrl.startsWith("data:")) {
        base64Logo = cp.logoUrl;
      } else {
        const res = await fetch(cp.logoUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const buf = Buffer.from(ab);
          const mime = res.headers.get("content-type") || "image/png";
          base64Logo = `data:${mime};base64,${buf.toString("base64")}`;
        }
      }
    } catch (e) {
      console.error("Failed to pre-fetch logo image as Base64 for PDF rendering:", e);
    }
  }

  const invoiceWithSignature = {
    ...invoice,
    signatorySignatureUrl: base64Signature || signatureUrl,
  };

  const companyWithLogo = {
    ...cp,
    logoUrl: base64Logo || cp.logoUrl,
  };

  const pdfBuffer = await renderToBuffer(<InvoicePDFDocument invoice={invoiceWithSignature} company={companyWithLogo} />);
  return Buffer.from(pdfBuffer);
}
