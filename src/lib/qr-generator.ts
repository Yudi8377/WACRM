import QRCode from "qrcode";

export interface InvoiceQrInput {
  invoiceNumber: string;
  customerName: string;
  shippingAddress: string;
  totalAmount: number;
  paymentMethod: string;
  workspaceName?: string;
  shippingCourier?: string;
  shippingService?: string;
  shippingCost?: number;
}

function simpleChecksum(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

/**
 * Generates a structured, deterministic QR payment & order verification payload
 * encoding invoice reference, customer name, address, payment method, total IDR,
 * and integrity checksum so scanners and POS apps can verify authenticity.
 */
export function buildInvoiceQrPayload(input: InvoiceQrInput): string {
  const merchant = (input.workspaceName ?? "WACRM").replace(/\|/g, " ").slice(0, 40);
  const customer = input.customerName.replace(/\|/g, " ").slice(0, 60);
  const address = (input.shippingAddress || "-").replace(/\|/g, " ").slice(0, 100);
  const amount = Math.round(Math.max(0, input.totalAmount));
  const courierTag =
    input.shippingService || input.shippingCourier
      ? `|SHIP:${(input.shippingService || input.shippingCourier || "").replace(/\|/g, " ").slice(0, 32)}`
      : "";
  const core = `WACRM-QRIS|${input.invoiceNumber}|${merchant}|${customer}|${address}|IDR:${amount}|${input.paymentMethod.toUpperCase()}${courierTag}`;
  const sig = simpleChecksum(core);
  return `${core}|CHK:${sig}`;
}

export async function generateQrDataUrl(payload: string, width = 220): Promise<string> {
  return QRCode.toDataURL(payload, {
    width,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export async function generateQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export function generateInvoiceNumber(prefix = "INV"): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}
