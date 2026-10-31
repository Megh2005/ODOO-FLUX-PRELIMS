import { sendMail } from "@/lib/mailService";

// Send low-stock warning email
export async function sendLowStockNotificationEmail(
  companyId: string | any,
  productName: string,
  currentStock: number,
  minimumStockQuantity: number,
  unit: string,
  category: string,
  sku?: string
): Promise<boolean> {
  const skuRow = sku
    ? `<tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 0;color:#64748b;font-weight:600;">SKU:</td>
        <td style="padding:8px 0;color:#0f172a;">${sku}</td>
       </tr>`
    : "";

  const html = `
    <div style="font-family:'Courier New', Courier, monospace; max-width:600px; margin:0 auto; border:2px solid #000000; padding:20px; background:#ffffff; color:#000000;">
      <div style="background:#000000; color:#ffffff; padding:16px; text-align:center; border:1px solid #000000; margin-bottom:20px;">
        <h2 style="margin:0; font-size:18px; font-weight:bold; font-family:'Courier New', Courier, monospace; letter-spacing:1px; color:#ffffff;">SUTRA</h2>
        <p style="margin:4px 0 0; font-size:12px; font-family:'Courier New', Courier, monospace; color:#ffffff;">INVENTORY ALERT SYSTEM</p>
      </div>

      <div style="border:1px solid #000000; padding:16px; margin-bottom:20px; background:#ffffff; color:#000000;">
        <p style="margin:0; font-weight:bold; font-size:14px; font-family:'Courier New', Courier, monospace;">[ LOW STOCK WARNING ]</p>
        <p style="margin:8px 0 0; font-size:13px; font-family:'Courier New', Courier, monospace;">
          Item <strong>${productName}</strong> has reached or fallen below minimum threshold limit.
        </p>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px; font-family:'Courier New', Courier, monospace; color:#000000;">
        <tr style="border-bottom:1px solid #000000;">
          <td style="padding:8px 0; font-weight:bold; width:40%;">Product Name:</td>
          <td style="padding:8px 0; font-weight:bold;">${productName}</td>
        </tr>
        ${skuRow}
        <tr style="border-bottom:1px solid #000000;">
          <td style="padding:8px 0; font-weight:bold;">Category:</td>
          <td style="padding:8px 0;">${category}</td>
        </tr>
        <tr style="border-bottom:1px solid #000000;">
          <td style="padding:8px 0; font-weight:bold;">Current Available Stock:</td>
          <td style="padding:8px 0; font-weight:bold;">${currentStock} ${unit}</td>
        </tr>
        <tr style="border-bottom:1px solid #000000;">
          <td style="padding:8px 0; font-weight:bold;">Minimum Threshold:</td>
          <td style="padding:8px 0;">${minimumStockQuantity} ${unit}</td>
        </tr>
      </table>

      <p style="font-size:12px; margin-top:16px; font-family:'Courier New', Courier, monospace;">
        Please reorder stock soon to prevent operational delays.
      </p>

      <div style="border-top:1px solid #000000; margin-top:20px; padding-top:12px; text-align:center; font-size:11px; font-family:'Courier New', Courier, monospace;">
        Automated Monospace System • SUTRA
      </div>
    </div>
  `;

  const text =
    `SUTRA - LOW STOCK ALERT\n\n` +
    `Product: ${productName}\n` +
    `Current Stock: ${currentStock} ${unit}\n` +
    `Minimum Threshold: ${minimumStockQuantity} ${unit}\n` +
    `Category: ${category}` +
    (sku ? `\nSKU: ${sku}` : "") +
    `\n\nPlease reorder stock soon to avoid project delays.\n\n— SUTRA System`;

  let toEmail: string | undefined;
  if (companyId) {
    const Company = (await import("@/models/Company")).default;
    const company = await Company.findById(companyId).lean();
    if (company && company.email) {
      toEmail = company.email;
    }
  }

  const result = await sendMail({
    to: toEmail,
    subject: `🚨 Low Stock Alert: ${productName}`,
    text,
    html,
  });

  return result.success;
}
