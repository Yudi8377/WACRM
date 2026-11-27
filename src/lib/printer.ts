import {
  formatIdr,
  PAYMENT_METHOD_LABELS,
  type FinancialReportSummary,
  type PosOrderRecord,
  type PrinterPaperProfile,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import { getDefaultStoreProfile } from "@/lib/store-profile";

export interface PrintResult {
  ok: boolean;
  method:
    | "android_usb_otg"
    | "web_usb_otg"
    | "web_serial_edc"
    | "android_bluetooth"
    | "web_bluetooth"
    | "android_wifi"
    | "browser_wifi_print"
    | "share_pdf"
    | "download_escpos"
    | "fallback";
  message: string;
}

export interface PrinterCapabilities {
  isAndroid: boolean;
  isIos: boolean;
  isAndroidApk: boolean;
  supportsWebUsb: boolean;
  supportsWebSerial: boolean;
  supportsWebBluetooth: boolean;
  supportsWebShare: boolean;
}

interface AndroidBridge {
  showToast?: (msg: string) => void;
  shareText?: (title: string, text: string) => void;
  printWifiDocument?: (jobName: string) => void;
  printHtml?: (title: string, html: string) => void;
  printBluetoothEscPos?: (escPosBase64: string, fallbackText: string) => string | void;
  printUsbEscPos?: (escPosBase64: string, jobName: string) => string | void;
  speakText?: (text: string, lang?: string) => void;
  stopSpeaking?: () => void;
  startVoiceInput?: (lang?: string) => void;
  isBiometricAvailable?: () => boolean;
  authenticateBiometric?: (title: string, subtitle: string) => void;
}

export function detectPrinterCapabilities(): PrinterCapabilities {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isAndroid: false,
      isIos: false,
      isAndroidApk: false,
      supportsWebUsb: false,
      supportsWebSerial: false,
      supportsWebBluetooth: false,
      supportsWebShare: false,
    };
  }
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const bridge = getAndroidBridge();
  const nav = navigator as unknown as {
    usb?: unknown;
    serial?: unknown;
    bluetooth?: unknown;
    share?: unknown;
  };
  return {
    isAndroid,
    isIos,
    isAndroidApk: Boolean(bridge),
    supportsWebUsb: Boolean(nav.usb),
    supportsWebSerial: Boolean(nav.serial),
    supportsWebBluetooth: Boolean(nav.bluetooth),
    supportsWebShare: typeof nav.share === "function",
  };
}

export function getAndroidBridge(): AndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { WACRMAndroid?: AndroidBridge }).WACRMAndroid;
  return bridge ?? null;
}

function resolveStore(storeOrName: string | StoreBusinessProfile): StoreBusinessProfile {
  if (typeof storeOrName === "string") {
    return getDefaultStoreProfile(storeOrName);
  }
  return storeOrName;
}

function escHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function padRight(text: string, len: number): string {
  return text.length >= len ? text.slice(0, len) : text + " ".repeat(len - text.length);
}

function padLeft(text: string, len: number): string {
  return text.length >= len ? text.slice(0, len) : " ".repeat(len - text.length) + text;
}

function formatLinePair(left: string, right: string, width = 32): string {
  const maxLeft = Math.max(4, width - right.length - 1);
  return `${padRight(left, maxLeft)} ${padLeft(right, width - maxLeft - 1)}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

function appendEscPosQr(chunks: number[], encoder: TextEncoder, payload: string): void {
  const qrBytes = encoder.encode(payload);
  const qrLen = qrBytes.length + 3;
  const pL = qrLen & 0xff;
  const pH = (qrLen >> 8) & 0xff;
  chunks.push(0x1b, 0x61, 0x01); // Center
  chunks.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // Model 2
  chunks.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05); // Module size 5
  chunks.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // Error correction M
  chunks.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30); // Store QR data
  for (const b of qrBytes) chunks.push(b);
  chunks.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // Print QR
}

/**
 * Builds standard ESC/POS 58mm/80mm thermal receipt using ONLY the User's own Store Profile
 * (zero vendor/WACRM branding on customer receipts!).
 */
export function buildEscPosReceipt(
  order: PosOrderRecord,
  storeOrName: string | StoreBusinessProfile,
): {
  bytes: Uint8Array;
  base64: string;
  plainText: string;
} {
  const store = resolveStore(storeOrName);
  const encoder = new TextEncoder();
  const chunks: number[] = [];
  const pushBytes = (...arr: number[]) => chunks.push(...arr);
  const pushText = (s: string) => {
    const encoded = encoder.encode(s);
    for (const b of encoded) chunks.push(b);
  };

  const lines: string[] = [];
  const sep = "--------------------------------";

  // ESC @ (Init printer)
  pushBytes(0x1b, 0x40);
  // Center + Bold + Double Height
  pushBytes(0x1b, 0x61, 0x01, 0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11);
  pushText(`${store.businessName.toUpperCase()}\n`);
  lines.push(store.businessName.toUpperCase());
  // Normal size, center
  pushBytes(0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00);
  if (store.address) {
    pushText(`${store.address.slice(0, 32)}\n`);
    lines.push(store.address.slice(0, 32));
  }
  if (store.phone) {
    pushText(`Telp: ${store.phone}\n`);
    lines.push(`Telp: ${store.phone}`);
  }
  pushText(`${sep}\n`);
  lines.push(sep);

  // Left align
  pushBytes(0x1b, 0x61, 0x00);
  const dateStr = new Date(order.paidAt || order.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusLabel = order.paymentStatus === "paid" ? "LUNAS" : order.paymentStatus.toUpperCase();
  const metaLines = [
    `No Inv : ${order.invoiceNumber}`,
    `Tanggal: ${dateStr}`,
    `Pemesan: ${order.customerName}`,
    ...(order.customerPhone ? [`HP     : ${order.customerPhone}`] : []),
    `Alamat : ${order.shippingAddress || "-"}`,
    `Bayar  : ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`,
    `Status : ${statusLabel}`,
    sep,
  ];
  for (const l of metaLines) {
    pushText(`${l}\n`);
    lines.push(l);
  }

  for (const item of order.items) {
    const itemTitle = item.productName.slice(0, 32);
    const qtyPrice = `${item.quantity}x ${formatIdr(item.unitPrice)}`;
    const lineTot = formatIdr(item.lineTotal);
    const pair = formatLinePair(qtyPrice, lineTot, 32);
    pushText(`${itemTitle}\n${pair}\n`);
    lines.push(itemTitle, pair);
  }

  pushText(`${sep}\n`);
  lines.push(sep);
  const totals = [
    formatLinePair("Subtotal", formatIdr(order.subtotal)),
    ...(order.discountAmount > 0 ? [formatLinePair("Diskon", `-${formatIdr(order.discountAmount)}`)] : []),
    ...(order.taxAmount > 0 ? [formatLinePair("PPN 11%", formatIdr(order.taxAmount))] : []),
  ];
  for (const t of totals) {
    pushText(`${t}\n`);
    lines.push(t);
  }

  // Bold Total
  pushBytes(0x1b, 0x45, 0x01);
  const grand = formatLinePair("TOTAL", formatIdr(order.totalAmount));
  pushText(`${grand}\n`);
  lines.push(grand);
  pushBytes(0x1b, 0x45, 0x00);

  appendEscPosQr(chunks, encoder, order.qrPayload);

  pushText(`\n${store.invoiceFooter || "Terima kasih telah berbelanja!"}\n\n\n\n`);
  lines.push(sep, `QR: ${order.qrPayload}`, store.invoiceFooter || "Terima kasih telah berbelanja!");

  // GS V 0 (Full Cut)
  pushBytes(0x1d, 0x56, 0x00);

  const bytes = new Uint8Array(chunks);
  return { bytes, base64: toBase64(bytes), plainText: lines.join("\n") };
}

/**
 * Builds an ESC/POS Thermal Shipping & Order QR Label (Label Pesanan & Pengiriman)
 * with Sender (User's Store), Recipient, Shipping Address, Courier, Packing List & Native QR!
 */
export function buildEscPosShippingLabel(
  order: PosOrderRecord,
  storeOrName: string | StoreBusinessProfile,
): {
  bytes: Uint8Array;
  base64: string;
  plainText: string;
} {
  const store = resolveStore(storeOrName);
  const encoder = new TextEncoder();
  const chunks: number[] = [];
  const pushBytes = (...arr: number[]) => chunks.push(...arr);
  const pushText = (s: string) => {
    for (const b of encoder.encode(s)) chunks.push(b);
  };
  const sep = "================================";
  const dash = "--------------------------------";
  const courier = order.shippingCourier || store.defaultCourier || "Reguler";
  const tracking = order.trackingCode || `RESI-${order.invoiceNumber.replace(/^INV-/, "")}`;
  const statusTag = order.paymentStatus === "paid" ? "LUNAS (NON-COD)" : order.paymentMethod === "cod" ? `COD ${formatIdr(order.totalAmount)}` : "BELUM LUNAS";

  const lines: string[] = [];

  pushBytes(0x1b, 0x40); // Init
  pushBytes(0x1b, 0x61, 0x01, 0x1b, 0x45, 0x01);
  pushText("LABEL PENGIRIMAN PESANAN\n");
  pushText(`${store.businessName.toUpperCase()}\n`);
  pushBytes(0x1b, 0x45, 0x00);
  pushText(`${sep}\n`);
  lines.push("LABEL PENGIRIMAN PESANAN", store.businessName.toUpperCase(), sep);

  pushBytes(0x1b, 0x61, 0x00);
  const infoLines = [
    `RESI   : ${tracking}`,
    `ORDER  : ${order.invoiceNumber}`,
    `KURIR  : ${courier}`,
    `STATUS : ${statusTag}`,
    dash,
    `PENERIMA: ${order.customerName}`,
    ...(order.customerPhone ? [`HP      : ${order.customerPhone}`] : []),
    `ALAMAT  : ${order.shippingAddress}`,
    dash,
    `PENGIRIM: ${store.businessName}`,
    ...(store.phone ? [`TELP    : ${store.phone}`] : []),
    ...(store.city ? [`ASAL    : ${store.city}`] : []),
    dash,
    "ISI PAKET:",
    ...order.items.map((i) => `- ${i.quantity}x ${i.productName.slice(0, 25)}`),
    dash,
  ];
  for (const l of infoLines) {
    pushText(`${l}\n`);
    lines.push(l);
  }

  appendEscPosQr(chunks, encoder, order.qrPayload);
  pushText("\nScan QR untuk cek pesanan\n\n\n\n");
  lines.push(`QR: ${order.qrPayload}`, "Scan QR untuk cek pesanan");

  pushBytes(0x1d, 0x56, 0x00); // Full cut

  const bytes = new Uint8Array(chunks);
  return { bytes, base64: toBase64(bytes), plainText: lines.join("\n") };
}

export function buildEscPosFinancialReport(
  report: FinancialReportSummary,
  storeOrName: string | StoreBusinessProfile,
  orderCount: number,
): { bytes: Uint8Array; base64: string; plainText: string } {
  const store = resolveStore(storeOrName);
  const encoder = new TextEncoder();
  const sep = "--------------------------------";
  const now = new Date().toLocaleString("id-ID");
  const lines = [
    store.businessName.toUpperCase(),
    "LAPORAN KEUANGAN USAHA",
    `Cetak: ${now}`,
    sep,
    formatLinePair("Total Transaksi", `${orderCount} order`),
    formatLinePair("Pendapatan", formatIdr(report.totalRevenue)),
    formatLinePair("HPP / COGS", formatIdr(report.totalCogs)),
    formatLinePair("Laba Kotor", formatIdr(report.grossProfit)),
    formatLinePair("Beban Ops", formatIdr(report.totalExpenses)),
    sep,
    formatLinePair("LABA BERSIH", formatIdr(report.netProfit)),
    formatLinePair("Margin", `${report.profitMarginPct.toFixed(1)}%`),
    sep,
    formatLinePair("Kas & Bank", formatIdr(report.cashBalance)),
    formatLinePair("Nilai Stok", formatIdr(report.inventoryValue)),
    formatLinePair("Total Aset", formatIdr(report.totalAssets)),
    formatLinePair("Kewajiban", formatIdr(report.totalLiabilities)),
    formatLinePair("Ekuitas", formatIdr(report.totalEquity)),
    formatLinePair("Neraca", report.isBalanced ? "SEIMBANG" : "PERLU CEK"),
    sep,
    store.address || store.businessTagline || "",
    "",
    "",
    "",
  ];
  const plainText = lines.join("\n");
  const raw = encoder.encode(`\x1b@\x1ba\x00${plainText}\x1dV\x00`);
  return { bytes: raw, base64: toBase64(raw), plainText };
}

export function buildEscPosTextReport(
  title: string,
  storeOrName: string | StoreBusinessProfile,
  bodyLines: string[],
): { bytes: Uint8Array; base64: string; plainText: string } {
  const store = resolveStore(storeOrName);
  const encoder = new TextEncoder();
  const sep = "--------------------------------";
  const now = new Date().toLocaleString("id-ID");
  const lines = [
    store.businessName.toUpperCase(),
    title.toUpperCase(),
    `Cetak: ${now}`,
    sep,
    ...bodyLines,
    sep,
    store.phone ? `Telp: ${store.phone}` : store.businessName,
    "",
    "",
    "",
  ];
  const plainText = lines.join("\n");
  const raw = encoder.encode(`\x1b@\x1ba\x00${plainText}\x1dV\x00`);
  return { bytes: raw, base64: toBase64(raw), plainText };
}

/**
 * Prints ESC/POS binary data via Android Native Bluetooth SPP bridge or Web Bluetooth GATT.
 */
export async function printViaBluetooth(escPos: {
  bytes: Uint8Array;
  base64: string;
  plainText: string;
}): Promise<PrintResult> {
  const android = getAndroidBridge();
  if (android?.printBluetoothEscPos) {
    const res = android.printBluetoothEscPos(escPos.base64, escPos.plainText);
    return {
      ok: true,
      method: "android_bluetooth",
      message: typeof res === "string" && res ? res : "Perintah cetak dikirim ke Printer Bluetooth Android.",
    };
  }

  const nav =
    typeof navigator !== "undefined"
      ? (navigator as unknown as {
          bluetooth?: {
            requestDevice: (opts: Record<string, unknown>) => Promise<{
              name?: string;
              gatt?: {
                connect: () => Promise<{
                  getPrimaryServices: () => Promise<
                    Array<{
                      getCharacteristics: () => Promise<
                        Array<{
                          properties: { write?: boolean; writeWithoutResponse?: boolean };
                          writeValue: (data: BufferSource) => Promise<void>;
                        }>
                      >;
                    }>
                  >;
                }>;
              };
            }>;
          };
        })
      : null;

  if (!nav?.bluetooth) {
    return {
      ok: false,
      method: "fallback",
      message:
        "Browser ini belum mendukung Web Bluetooth. Gunakan Chrome Android/Desktop, Aplikasi Android, atau pilih Cetak WiFi/PDF.",
    };
  }

  try {
    const optionalServices = [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      "0000ff00-0000-1000-8000-00805f9b34fb",
    ];
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices,
    });
    const server = await device.gatt?.connect();
    if (!server) throw new Error("Gagal menghubungkan GATT printer Bluetooth.");
    const services = await server.getPrimaryServices();
    let writable: { writeValue: (data: BufferSource) => Promise<void> } | null = null;
    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          writable = ch;
          break;
        }
      }
      if (writable) break;
    }
    if (!writable) {
      return {
        ok: false,
        method: "web_bluetooth",
        message: `Perangkat "${device.name ?? "Bluetooth"}" tidak memiliki karakteristik tulis ESC/POS. Gunakan Cetak WiFi atau Aplikasi Android.`,
      };
    }
    const chunkSize = 20;
    for (let i = 0; i < escPos.bytes.length; i += chunkSize) {
      await writable.writeValue(escPos.bytes.slice(i, i + chunkSize));
    }
    return {
      ok: true,
      method: "web_bluetooth",
      message: `Berhasil dicetak ke printer Bluetooth "${device.name ?? "Thermal Printer"}".`,
    };
  } catch (err) {
    return {
      ok: false,
      method: "web_bluetooth",
      message: err instanceof Error ? err.message : "Koneksi printer Bluetooth dibatalkan atau gagal.",
    };
  }
}

/**
 * Builds a compact 32-column ESC/POS slip specifically formatted for EDC / Mini POS terminals
 * (Android EDC, Pax/Sunmi/Verifone USB-C/Serial thermal printers).
 */
export function buildEscPosEdcCompact(
  order: PosOrderRecord,
  storeOrName: string | StoreBusinessProfile,
): { bytes: Uint8Array; base64: string; plainText: string } {
  const store = resolveStore(storeOrName);
  const encoder = new TextEncoder();
  const chunks: number[] = [];
  const pushBytes = (...arr: number[]) => chunks.push(...arr);
  const pushText = (s: string) => {
    for (const b of encoder.encode(s)) chunks.push(b);
  };
  const sep = "--------------------------------";
  const courier = order.shippingCourier || store.defaultCourier || "Reguler";
  const status = order.paymentStatus === "paid" ? "LUNAS" : "TAGIHAN";
  const lines = [
    store.businessName.toUpperCase().slice(0, 32),
    `SLIP EDC · ${status}`,
    sep,
    `INV : ${order.invoiceNumber}`,
    `CUST: ${order.customerName.slice(0, 26)}`,
    `KURIR: ${courier.slice(0, 25)}`,
    `BAYAR: ${PAYMENT_METHOD_LABELS[order.paymentMethod].slice(0, 25)}`,
    sep,
    ...order.items.map((i) =>
      formatLinePair(`${i.quantity}x ${i.productName.slice(0, 15)}`, formatIdr(i.lineTotal), 32),
    ),
    sep,
    formatLinePair("TOTAL", formatIdr(order.totalAmount), 32),
    sep,
  ];
  pushBytes(0x1b, 0x40, 0x1b, 0x61, 0x00);
  for (const l of lines) pushText(`${l}\n`);
  appendEscPosQr(chunks, encoder, order.qrPayload);
  pushText("\nTerima kasih!\n\n\n");
  pushBytes(0x1d, 0x56, 0x00);
  const bytes = new Uint8Array(chunks);
  return {
    bytes,
    base64: toBase64(bytes),
    plainText: [...lines, `QR: ${order.qrPayload}`].join("\n"),
  };
}

/**
 * Direct USB-C / Micro-USB OTG Printing for Thermal, Label & EDC Printers!
 * 1. On Android APK: invokes native `UsbManager` bulk OUT transfer via `WACRMAndroid.printUsbEscPos`.
 * 2. On Chrome Android / Desktop: invokes WebUSB API (`navigator.usb`) USB Printer Class (0x07).
 */
export async function printViaUsbOtg(
  escPos: { bytes: Uint8Array; base64: string; plainText: string },
  jobName = "Dokumen Toko",
): Promise<PrintResult> {
  const android = getAndroidBridge();
  if (android?.printUsbEscPos) {
    const res = android.printUsbEscPos(escPos.base64, jobName);
    return {
      ok: true,
      method: "android_usb_otg",
      message:
        typeof res === "string" && res
          ? res
          : `Perintah cetak dikirim melalui kabel USB-C / Micro-USB OTG (${jobName}).`,
    };
  }

  type WebUsbDevice = {
    productName?: string;
    configuration: {
      interfaces: Array<{
        interfaceNumber: number;
        alternates: Array<{
          interfaceClass: number;
          endpoints: Array<{ direction: string; endpointNumber: number; type?: string }>;
        }>;
      }>;
    } | null;
    open: () => Promise<void>;
    selectConfiguration: (n: number) => Promise<void>;
    claimInterface: (n: number) => Promise<void>;
    transferOut: (endpointNumber: number, data: BufferSource) => Promise<unknown>;
    close: () => Promise<void>;
  };

  const nav =
    typeof navigator !== "undefined"
      ? (navigator as unknown as {
          usb?: {
            requestDevice: (opts: { filters: Array<Record<string, unknown>> }) => Promise<WebUsbDevice>;
          };
        })
      : null;

  if (!nav?.usb) {
    return {
      ok: false,
      method: "fallback",
      message:
        "Browser ini belum mendukung WebUSB langsung (misalnya Safari iOS). Gunakan tombol 'Cetak Inkjet / LaserJet / AirPrint' atau 'Bagikan / PDF' untuk iOS & HP non-OTG, atau pakai Chrome/APK Android untuk USB-C OTG langsung.",
    };
  }

  try {
    // USB Printer Class 0x07 + Vendor-specific POS/EDC printers (0xFF)
    const device = await nav.usb.requestDevice({
      filters: [{ classCode: 7 }, { classCode: 255 }],
    });
    await device.open();
    if (!device.configuration) {
      await device.selectConfiguration(1);
    }
    const interfaces = device.configuration?.interfaces ?? [];
    let targetInterface = -1;
    let outEndpoint = -1;

    for (const iface of interfaces) {
      for (const alt of iface.alternates) {
        const ep = alt.endpoints.find((e) => e.direction === "out");
        if (ep && (alt.interfaceClass === 7 || targetInterface === -1)) {
          targetInterface = iface.interfaceNumber;
          outEndpoint = ep.endpointNumber;
          if (alt.interfaceClass === 7) break;
        }
      }
      if (targetInterface !== -1 && outEndpoint !== -1) break;
    }

    if (targetInterface === -1 || outEndpoint === -1) {
      await device.close();
      return {
        ok: false,
        method: "web_usb_otg",
        message: `Perangkat USB "${device.productName ?? "Printer"}" tidak menyediakan endpoint cetak ESC/POS. Gunakan jalur 'Inkjet / LaserJet / Spooler OS' untuk printer tinta/laser USB.`,
      };
    }

    await device.claimInterface(targetInterface);
    const chunkSize = 64;
    for (let i = 0; i < escPos.bytes.length; i += chunkSize) {
      await device.transferOut(outEndpoint, escPos.bytes.slice(i, i + chunkSize));
    }
    await device.close();
    return {
      ok: true,
      method: "web_usb_otg",
      message: `Berhasil dicetak via kabel USB-C / Micro-USB ke "${device.productName ?? "Printer USB"}".`,
    };
  } catch (err) {
    return {
      ok: false,
      method: "web_usb_otg",
      message: err instanceof Error ? err.message : "Koneksi printer USB-C / Micro-USB dibatalkan atau gagal.",
    };
  }
}

/**
 * Direct USB Serial / EDC / RS232-to-USB-C Printing via Web Serial API (or Android USB OTG bridge).
 */
export async function printViaUsbSerialEdc(
  escPos: { bytes: Uint8Array; base64: string; plainText: string },
  jobName = "Slip EDC",
): Promise<PrintResult> {
  const android = getAndroidBridge();
  if (android?.printUsbEscPos) {
    return printViaUsbOtg(escPos, jobName);
  }

  type SerialPortLike = {
    open: (opts: { baudRate: number }) => Promise<void>;
    writable: {
      getWriter: () => {
        write: (data: Uint8Array) => Promise<void>;
        releaseLock: () => void;
      };
    } | null;
    close: () => Promise<void>;
  };

  const nav =
    typeof navigator !== "undefined"
      ? (navigator as unknown as { serial?: { requestPort: () => Promise<SerialPortLike> } })
      : null;

  if (!nav?.serial) {
    return {
      ok: false,
      method: "fallback",
      message:
        "Web Serial EDC tersedia di Chrome/Edge Desktop dengan kabel USB-C/RS232. Untuk HP Android/iOS, gunakan jalur 'USB-C OTG', 'Bluetooth Thermal', atau 'Bagikan / Unduh File ESC/POS'.",
    };
  }

  try {
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 });
    if (!port.writable) throw new Error("Port serial EDC tidak dapat ditulis.");
    const writer = port.writable.getWriter();
    await writer.write(escPos.bytes);
    writer.releaseLock();
    await port.close();
    return {
      ok: true,
      method: "web_serial_edc",
      message: `Berhasil dicetak ke Printer EDC / Serial USB (${jobName}).`,
    };
  } catch (err) {
    return {
      ok: false,
      method: "web_serial_edc",
      message: err instanceof Error ? err.message : "Cetak USB Serial / EDC dibatalkan.",
    };
  }
}

function buildPrintableDocumentHtml(
  title: string,
  bodyHtml: string,
  paperMode: PrinterPaperProfile,
): string {
  const pageCss =
    paperMode === "thermal58" || paperMode === "edc"
      ? `@page { size: 58mm auto; margin: 2mm; } body { width: 54mm; font-family: monospace; font-size: 11px; color: #0f172a; }`
      : paperMode === "thermal80"
        ? `@page { size: 80mm auto; margin: 3mm; } body { width: 74mm; font-family: monospace; font-size: 12px; color: #0f172a; }`
        : paperMode === "label100"
          ? `@page { size: 100mm 150mm; margin: 5mm; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; color: #0f172a; }`
          : `@page { size: A4; margin: 14mm; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #0f172a; }`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(title)}</title>
  <style>
    ${pageCss}
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; }
    th { font-weight: 700; background: #f8fafc; }
    .right { text-align: right; }
    .center { text-align: center; }
    .muted { color: #64748b; font-size: 11px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #d1fae5; color: #065f46; }
    .badge-warn { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;
}

/**
 * Universal OS Print Spooler:
 * Works with USB-connected Inkjet / LaserJet printers, Android Mopria & USB-OTG Print Services,
 * iOS AirPrint / USB-C printers, WiFi printers & Save-to-PDF!
 */
export function printViaSystemSpooler(
  title: string,
  bodyHtml: string,
  paperMode: PrinterPaperProfile = "a4",
): PrintResult {
  const android = getAndroidBridge();
  if (typeof window === "undefined") {
    return { ok: false, method: "fallback", message: "Hanya tersedia di browser." };
  }

  const fullDoc = buildPrintableDocumentHtml(title, bodyHtml, paperMode);

  if (android?.printHtml) {
    android.printHtml(title, fullDoc);
    return {
      ok: true,
      method: "android_wifi",
      message: `Layanan Cetak Android (USB-OTG Inkjet/LaserJet / Mopria / WiFi / PDF) dibuka untuk "${title}".`,
    };
  }

  return printViaWifiHtml(
    title,
    bodyHtml,
    paperMode === "thermal80" || paperMode === "edc" ? "thermal58" : paperMode,
  );
}

/**
 * Shares or downloads a self-contained printable document (ideal for iOS iPhone/iPad via AirPrint/Printer App
 * or Android apps like HP Smart, Epson iPrint, Canon PRINT, Brother & RawBT).
 */
export async function shareOrDownloadPrintable(
  title: string,
  bodyHtml: string,
  filenameBase: string,
  paperMode: PrinterPaperProfile = "a4",
): Promise<PrintResult> {
  if (typeof window === "undefined") {
    return { ok: false, method: "fallback", message: "Hanya tersedia di browser." };
  }
  const html = buildPrintableDocumentHtml(title, bodyHtml, paperMode);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const fileName = `${filenameBase}.html`;

  try {
    const nav = navigator as unknown as {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
    };
    const file = new File([blob], fileName, { type: "text/html" });
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      await nav.share({
        title,
        text: `Dokumen siap cetak: ${title}`,
        files: [file],
      });
      return {
        ok: true,
        method: "share_pdf",
        message: `Dokumen "${title}" dibagikan ke aplikasi cetak / AirPrint / WhatsApp.`,
      };
    }
  } catch {
    // Fall through to clean file download
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return {
    ok: true,
    method: "share_pdf",
    message: `File siap cetak "${fileName}" diunduh — buka di iOS/Android/PC untuk cetak ke printer Inkjet, LaserJet, atau EDC.`,
  };
}

/**
 * Downloads raw ESC/POS binary (.bin) for external USB-OTG/EDC/RawBT spooler apps on Android & iOS.
 */
export function downloadEscPosBinary(
  escPos: { bytes: Uint8Array; base64: string; plainText: string },
  filenameBase: string,
): PrintResult {
  if (typeof window === "undefined") {
    return { ok: false, method: "fallback", message: "Hanya tersedia di browser." };
  }
  const copy = new Uint8Array(escPos.bytes.length);
  copy.set(escPos.bytes);
  const blob = new Blob([copy.buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}-escpos.bin`;
  a.click();
  URL.revokeObjectURL(url);
  return {
    ok: true,
    method: "download_escpos",
    message: `File ESC/POS "${filenameBase}-escpos.bin" diunduh — siap dibuka di aplikasi cetak USB OTG / EDC / RawBT.`,
  };
}

/**
 * Prints cleanly via WiFi/AirPrint/Mopria/Network Printer or PDF.
 */
export function printViaWifiHtml(
  title: string,
  bodyHtml: string,
  paperMode: "a4" | "thermal58" | "label100" = "a4",
): PrintResult {
  const android = getAndroidBridge();
  if (typeof window === "undefined") {
    return { ok: false, method: "fallback", message: "Hanya tersedia di browser." };
  }

  const pageCss =
    paperMode === "thermal58"
      ? `@page { size: 58mm auto; margin: 2mm; } body { width: 54mm; font-family: monospace; font-size: 11px; }`
      : paperMode === "label100"
        ? `@page { size: 100mm 150mm; margin: 5mm; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; color: #0f172a; }`
        : `@page { size: A4; margin: 14mm; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #0f172a; }`;

  if (android?.printWifiDocument) {
    const styleId = "wacrm-native-print-style";
    let container = document.getElementById("wacrm-print-root");
    if (!container) {
      container = document.createElement("div");
      container.id = "wacrm-print-root";
      document.body.appendChild(container);
    }
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media screen { #wacrm-print-root { display: none; } }
      @media print {
        body > *:not(#wacrm-print-root) { display: none !important; }
        #wacrm-print-root { display: block !important; }
        ${pageCss}
      }
    `;
    container.innerHTML = bodyHtml;
    android.printWifiDocument(title);
    return {
      ok: true,
      method: "android_wifi",
      message: `Dialog cetak WiFi Android dibuka untuk "${title}".`,
    };
  }

  const popup = window.open("", "_blank", "width=860,height=920");
  if (!popup) {
    window.print();
    return {
      ok: true,
      method: "browser_wifi_print",
      message: "Dialog cetak WiFi / PDF browser dibuka.",
    };
  }
  popup.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(title)}</title>
  <style>
    ${pageCss}
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; }
    th { font-weight: 700; background: #f8fafc; }
    .right { text-align: right; }
    .center { text-align: center; }
    .muted { color: #64748b; font-size: 11px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #d1fae5; color: #065f46; }
    .badge-warn { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`);
  popup.document.close();
  return {
    ok: true,
    method: "browser_wifi_print",
    message: `Dokumen "${title}" siap dicetak melalui Printer WiFi / Jaringan / PDF.`,
  };
}

/**
 * White-Label Customer Invoice HTML — displays ONLY the User's own Store/Business Name, Address & Phone.
 */
export function renderInvoicePrintHtml(
  order: PosOrderRecord,
  storeOrName: string | StoreBusinessProfile,
  qrDataUrl: string,
): string {
  const store = resolveStore(storeOrName);
  const rows = order.items
    .map(
      (i) =>
        `<tr><td><strong>${escHtml(i.productName)}</strong><br/><span class="muted">SKU: ${escHtml(i.sku)}</span></td><td class="center">${i.quantity}</td><td class="right">${escHtml(formatIdr(i.unitPrice))}</td><td class="right"><strong>${escHtml(formatIdr(i.lineTotal))}</strong></td></tr>`,
    )
    .join("");
  const isPaid = order.paymentStatus === "paid";

  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:14px;">
      <div>
        <h1 style="margin:0;color:#0f172a;font-size:22px;">${escHtml(store.businessName)}</h1>
        ${store.businessTagline ? `<div style="font-size:12px;color:#059669;font-weight:600;margin-top:2px;">${escHtml(store.businessTagline)}</div>` : ""}
        ${store.address ? `<div class="muted" style="margin-top:3px;">${escHtml(store.address)}</div>` : ""}
        <div class="muted">${[store.phone, store.email, store.taxId ? `NPWP: ${store.taxId}` : ""].filter(Boolean).map(escHtml).join(" · ")}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#64748b;">INVOICE PEMBAYARAN</div>
        <div style="font-size:17px;font-weight:800;margin-top:2px;">${escHtml(order.invoiceNumber)}</div>
        <div class="muted">${escHtml(new Date(order.paidAt || order.createdAt).toLocaleString("id-ID"))}</div>
        <div style="margin-top:6px;">
          <span class="${isPaid ? "badge" : "badge-warn"}">${isPaid ? "LUNAS / PAID" : escHtml(order.paymentStatus.toUpperCase())} · ${escHtml(PAYMENT_METHOD_LABELS[order.paymentMethod])}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:14px;">
      <div style="flex:1;">
        <div class="muted">KEPADA PELANGGAN</div>
        <div style="font-weight:700;font-size:15px;">${escHtml(order.customerName)}</div>
        ${order.customerPhone ? `<div>Telp: ${escHtml(order.customerPhone)}</div>` : ""}
        <div>Alamat Kirim: ${escHtml(order.shippingAddress || "-")}</div>
        ${order.shippingCourier || order.shippingService ? `<div class="muted" style="margin-top:3px;">Kurir: ${escHtml(order.shippingService || order.shippingCourier || "-")} · Resi: ${escHtml(order.trackingCode || "-")}</div>` : ""}
      </div>
      <div style="text-align:center;">
        <img src="${qrDataUrl}" alt="QR Verifikasi Pesanan" style="width:124px;height:124px;border:1px solid #cbd5e1;border-radius:8px;padding:4px;" />
        <div class="muted">QR Verifikasi &amp; Pesanan</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Produk</th><th class="center">Qty</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="max-width:290px;margin-left:auto;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal</span><span>${escHtml(formatIdr(order.subtotal))}</span></div>
      ${order.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#dc2626;"><span>Diskon</span><span>-${escHtml(formatIdr(order.discountAmount))}</span></div>` : ""}
      ${order.taxAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>PPN 11%</span><span>${escHtml(formatIdr(order.taxAmount))}</span></div>` : ""}
      ${(order.shippingCost ?? 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Ongkir (${escHtml(order.shippingService || order.shippingCourier || "Kurir")})</span><span>${escHtml(formatIdr(order.shippingCost ?? 0))}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #0f172a;font-weight:800;font-size:16px;"><span>TOTAL</span><span>${escHtml(formatIdr(order.totalAmount))}</span></div>
    </div>
    <p class="muted" style="margin-top:18px;border-top:1px dashed #cbd5e1;padding-top:8px;">
      ${escHtml(store.invoiceFooter || "Terima kasih atas pembelian Anda.")}
    </p>
  `;
}

/**
 * Dedicated Scannable QR Order & Shipping Label HTML (100x150mm / A5 / WiFi Thermal).
 * Displays ONLY User's Store as Sender + Recipient + Courier + Packing List + Large QR Code!
 */
export function renderShippingLabelPrintHtml(
  order: PosOrderRecord,
  storeOrName: string | StoreBusinessProfile,
  qrDataUrl: string,
): string {
  const store = resolveStore(storeOrName);
  const courier = order.shippingCourier || store.defaultCourier || "Reguler";
  const tracking = order.trackingCode || `RESI-${order.invoiceNumber.replace(/^INV-/, "")}`;
  const isPaid = order.paymentStatus === "paid";
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td>${escHtml(i.productName)} <span class="muted">(${escHtml(i.sku)})</span></td><td class="right"><strong>${i.quantity}x</strong></td></tr>`,
    )
    .join("");

  return `
    <div style="border:2px solid #0f172a;border-radius:10px;padding:14px;max-width:460px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:8px;">
        <div>
          <div style="font-size:16px;font-weight:800;">${escHtml(store.businessName)}</div>
          <div class="muted">${escHtml(store.city || store.address || "")} · ${escHtml(store.phone || "")}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:800;background:#0f172a;color:#fff;padding:3px 8px;border-radius:6px;">${escHtml(courier)}</div>
          <div class="muted" style="margin-top:3px;font-family:monospace;">${escHtml(tracking)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;gap:12px;margin-top:12px;border-bottom:1px dashed #94a3b8;padding-bottom:12px;">
        <div style="flex:1;">
          <div class="muted" style="font-weight:700;letter-spacing:0.5px;">PENERIMA / TUJUAN PENGIRIMAN</div>
          <div style="font-size:16px;font-weight:800;margin-top:3px;">${escHtml(order.customerName)}</div>
          ${order.customerPhone ? `<div style="font-weight:600;">HP: ${escHtml(order.customerPhone)}</div>` : ""}
          <div style="margin-top:4px;line-height:1.4;">${escHtml(order.shippingAddress)}</div>
          <div style="margin-top:8px;">
            <span class="${isPaid ? "badge" : "badge-warn"}">
              ${isPaid ? "LUNAS · NON-COD" : order.paymentMethod === "cod" ? `BAYAR COD: ${escHtml(formatIdr(order.totalAmount))}` : "MENUNGGU PEMBAYARAN"}
            </span>
          </div>
        </div>
        <div style="text-align:center;flex-shrink:0;">
          <img src="${qrDataUrl}" alt="QR Label Pengiriman" style="width:128px;height:128px;border:1px solid #0f172a;border-radius:6px;padding:3px;" />
          <div style="font-family:monospace;font-size:10px;margin-top:3px;font-weight:700;">${escHtml(order.invoiceNumber)}</div>
        </div>
      </div>

      <div style="margin-top:10px;">
        <div class="muted" style="font-weight:700;">DAFTAR ISI PAKET (${order.items.reduce((s, i) => s + i.quantity, 0)} item)</div>
        <table style="margin-top:4px;">
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #cbd5e1;" class="muted">
        <span>Pengirim: ${escHtml(store.businessName)} (${escHtml(store.phone || "-")})</span>
        <span>${escHtml(new Date(order.createdAt).toLocaleDateString("id-ID"))}</span>
      </div>
    </div>
  `;
}

export function renderErpReportPrintHtml(
  products: Array<{
    sku: string;
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
    costPrice: number;
    stockQty: number;
  }>,
  storeOrName: string | StoreBusinessProfile,
): string {
  const store = resolveStore(storeOrName);
  const totalValue = products.reduce((s, p) => s + p.stockQty * p.costPrice, 0);
  const rows = products
    .map(
      (p) =>
        `<tr><td><code>${escHtml(p.sku)}</code></td><td>${escHtml(p.name)}</td><td>${escHtml(p.category)}</td><td class="right">${escHtml(formatIdr(p.unitPrice))}</td><td class="right">${p.stockQty} ${escHtml(p.unit)}</td></tr>`,
    )
    .join("");
  return `
    <div style="border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="margin:0;color:#0f172a;">${escHtml(store.businessName)}</h1>
      <div style="font-size:14px;font-weight:700;color:#059669;margin-top:2px;">Laporan Stok &amp; Inventaris Gudang</div>
      <p class="muted">${escHtml(store.address || "")} · Dicetak ${escHtml(new Date().toLocaleString("id-ID"))} · ${products.length} SKU · Nilai Persediaan: ${escHtml(formatIdr(totalValue))}</p>
    </div>
    <table>
      <thead><tr><th>SKU</th><th>Nama Produk</th><th>Kategori</th><th class="right">Harga Jual</th><th class="right">Stok</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderFinancialReportPrintHtml(
  report: FinancialReportSummary,
  storeOrName: string | StoreBusinessProfile,
  orders: PosOrderRecord[],
): string {
  const store = resolveStore(storeOrName);
  const recentOrders = orders
    .slice(0, 15)
    .map(
      (o) =>
        `<tr><td>${escHtml(o.invoiceNumber)}</td><td>${escHtml(o.customerName)}</td><td>${escHtml(PAYMENT_METHOD_LABELS[o.paymentMethod])}</td><td>${escHtml(o.paymentStatus)}</td><td class="right">${escHtml(formatIdr(o.totalAmount))}</td></tr>`,
    )
    .join("");
  return `
    <div style="border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="margin:0;color:#0f172a;">${escHtml(store.businessName)}</h1>
      <div style="font-size:14px;font-weight:700;color:#059669;margin-top:2px;">Laporan Keuangan (Laba Rugi &amp; Neraca)</div>
      <p class="muted">${escHtml(store.address || "")} · Dicetak pada ${escHtml(new Date().toLocaleString("id-ID"))} · Status Neraca: ${report.isBalanced ? "SEIMBANG" : "PERLU PENYESUAIAN"}</p>
    </div>
    <h3>1. Laporan Laba Rugi (Income Statement)</h3>
    <table>
      <tbody>
        <tr><td>Pendapatan Penjualan</td><td class="right"><strong>${escHtml(formatIdr(report.totalRevenue))}</strong></td></tr>
        <tr><td>Harga Pokok Penjualan (HPP / COGS)</td><td class="right">(${escHtml(formatIdr(report.totalCogs))})</td></tr>
        <tr><td><strong>Laba Kotor</strong></td><td class="right"><strong>${escHtml(formatIdr(report.grossProfit))}</strong></td></tr>
        <tr><td>Beban Operasional</td><td class="right">(${escHtml(formatIdr(report.totalExpenses))})</td></tr>
        <tr style="background:#ecfdf5;"><td><strong>LABA BERSIH (Margin ${report.profitMarginPct.toFixed(1)}%)</strong></td><td class="right"><strong>${escHtml(formatIdr(report.netProfit))}</strong></td></tr>
      </tbody>
    </table>
    <h3>2. Ringkasan Neraca (Balance Sheet)</h3>
    <table>
      <tbody>
        <tr><td>Kas &amp; Bank</td><td class="right">${escHtml(formatIdr(report.cashBalance))}</td></tr>
        <tr><td>Piutang Usaha</td><td class="right">${escHtml(formatIdr(report.receivablesBalance))}</td></tr>
        <tr><td>Nilai Persediaan Barang</td><td class="right">${escHtml(formatIdr(report.inventoryValue))}</td></tr>
        <tr><td><strong>Total Aset</strong></td><td class="right"><strong>${escHtml(formatIdr(report.totalAssets))}</strong></td></tr>
        <tr><td>Total Kewajiban / PPN Keluaran</td><td class="right">${escHtml(formatIdr(report.totalLiabilities))}</td></tr>
        <tr><td>Total Ekuitas &amp; Laba Ditahan</td><td class="right">${escHtml(formatIdr(report.totalEquity))}</td></tr>
      </tbody>
    </table>
    <h3>3. Ringkasan Transaksi Terbaru (${orders.length} Order)</h3>
    <table>
      <thead><tr><th>Invoice</th><th>Pelanggan</th><th>Pembayaran</th><th>Status</th><th class="right">Total</th></tr></thead>
      <tbody>${recentOrders || '<tr><td colspan="5" class="center muted">Belum ada transaksi.</td></tr>'}</tbody>
    </table>
  `;
}
