import * as XLSX from "xlsx";

export function exportInventoryToExcel(products: any[]) {
  const data = products.map((product, index) => ({
    "S.No": index + 1,
    "Product Name": product.productName,
    "SKU": product.sku || "-",
    "Category": product.category,
    "Unit": product.unit,
    "Current Stock": product.currentStock,
    "Min Threshold": product.minimumStockQuantity,
    "Purchase Price (₹)": product.purchasePrice,
    "Selling Price (₹)": product.sellingPrice,
    "Total Purchase Value (₹)": (product.currentStock * product.purchasePrice).toFixed(2),
    "Total Selling Value (₹)": (product.currentStock * product.sellingPrice).toFixed(2),
    "Stock Status": product.currentStock <= product.minimumStockQuantity ? "LOW STOCK" : "IN STOCK",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Stock");

  const columnWidths = [
    { wch: 6 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 15 },
  ];
  worksheet["!cols"] = columnWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return excelBuffer;
}

export function exportInvoicesToExcel(invoices: any[]) {
  const data = invoices.map((invoice, index) => ({
    "S.No": index + 1,
    "Document Type": invoice.documentType.replace("_", " "),
    "Invoice Number": invoice.invoiceNumber,
    "Customer Name": invoice.customerSnapshot?.customerName || "-",
    "Issue Date": new Date(invoice.issueDate).toLocaleDateString("en-IN"),
    "Due Date": new Date(invoice.dueDate).toLocaleDateString("en-IN"),
    "Payment Terms": invoice.paymentTerms,
    "Sub Total (₹)": invoice.subTotal,
    "Freight (₹)": invoice.freightCharges || 0,
    "GST %": `${invoice.gstPercentage}%`,
    "GST Amount (₹)": invoice.gstAmount,
    "Grand Total (₹)": invoice.grandTotal,
    "Status": invoice.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Billing History");

  const columnWidths = [
    { wch: 6 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
  ];
  worksheet["!cols"] = columnWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return excelBuffer;
}

export function exportCustomersToExcel(customers: any[]) {
  const data = customers.map((customer, index) => ({
    "S.No": index + 1,
    "Customer Name": customer.customerName,
    "Company Name": customer.companyName || "-",
    "Phone": customer.phone || "-",
    "Email": customer.email || "-",
    "GSTIN": customer.gstin || "-",
    "Outstanding Balance (₹)": customer.outstandingBalance || 0,
    "Projects": (customer.projectReferences || []).join(", "),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Directory");

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 25 },
    { wch: 16 },
    { wch: 25 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return excelBuffer;
}
