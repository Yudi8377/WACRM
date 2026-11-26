import { formatIdr, PAYMENT_METHOD_LABELS, type FinancialReportSummary, type PosOrderRecord } from "@/lib/crm-types";

export interface PrintResult {
  ok: boolean;
  method: "android_bluetooth" | "web_bluetooth" | "android_wifi" | "browser_wifi_print" | "fallback";
  message: string;
}

interface AndroidBridge {
  showToast?: (msg: string) => void;
  shareText?: (title: string, text: string) => void;
  printWifiDocument?: (jobName: string) => void;
  printBluetoothEscPos?: (escPosBase64: string, fallbackText: string) => string | void;
}

function getAndroidBridge(): AndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { WACRMAndroid?: AndroidBridge }).WACRMAndroid;
  return bridge ?? null;
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

/**
 * Builds standard ESC/POS binary thermal receipt commands (58mm / 32-char default)
 * including ESC @ init, bold headers, alignment, native ESC/POS QR code command (GS ( k),
 * and paper feed + cut (GS V 0).
 */
export function buildEscPosReceipt(order: PosOrderRecord, storeName: string): {
  bytes: Uint8Array;
  base64: string;
  plainText: string;
} {
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
  pushText(`${storeName.toUpperCase()}\n`);
  lines.push(storeName.toUpperCase());
  // Normal size, center
  pushBytes(0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00);
  pushText("WACRM AI POS & Invoice\n");
  pushText(`${sep}\n`);
  lines.push("WACRM AI POS & Invoice", sep);

  // Left align
  pushBytes(0x1b, 0x61, 0x00);
  const dateStr = new Date(order.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const metaLines = [
    `No     : ${order.invoiceNumber}`,
    `Tanggal: ${dateStr}`,
    `Pemesan: ${order.customerName}`,
    ...(order.customerPhone ? [`HP     : ${order.customerPhone}`] : []),
    `Alamat : ${order.shippingAddress || "-"}`,
    `Bayar  : ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`,
    `Status : ${order.paymentStatus.toUpperCase()}`,
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

  // Native ESC/POS QR Code (GS ( k)
  const qrBytes = encoder.encode(order.qrPayload);
  const qrLen = qrBytes.length + 3;
  const pL = qrLen & 0xff;
  const pH = (qrLen >> 8) & 0xff;
  pushBytes(0x1b, 0x61, 0x01); // Center
  pushBytes(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // Model 2
  pushBytes(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05); // Module size 5
  pushBytes(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // Error correction M
  pushBytes(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30); // Store QR data
  for (const b of qrBytes) chunks.push(b);
  pushBytes(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // Print QR

  pushText("\nScan QR untuk verifikasi/bayar\n");
  pushText("Terima kasih telah berbelanja!\n\n\n\n");
  lines.push(sep, `QR: ${order.qrPayload}`, "Terima kasih telah berbelanja!");

  // GS V 0 (Full Cut)
  pushBytes(0x1d, 0x56, 0x00);

  const bytes = new Uint8Array(chunks);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");

  return { bytes, base64, plainText: lines.join("\n") };
}

export function buildEscPosFinancialReport(
  report: FinancialReportSummary,
  storeName: string,
  orderCount: number,
): { bytes: Uint8Array; base64: string; plainText: string } {
  const encoder = new TextEncoder();
  const sep = "--------------------------------";
  const now = new Date().toLocaleString("id-ID");
  const lines = [
    storeName.toUpperCase(),
    "LAPORAN KEUANGAN WACRM",
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
    formatLinePair("Nilai Stok ERP", formatIdr(report.inventoryValue)),
    formatLinePair("Total Aset", formatIdr(report.totalAssets)),
    formatLinePair("Kewajiban", formatIdr(report.totalLiabilities)),
    formatLinePair("Ekuitas", formatIdr(report.totalEquity)),
    formatLinePair("Neraca", report.isBalanced ? "SEIMBANG" : "PERLU CEK"),
    sep,
    "Terverifikasi AI System Guardian",
    "",
    "",
    "",
  ];
  const plainText = lines.join("\n");
  const raw = encoder.encode(`\x1b@\x1ba\x00${plainText}\x1dV\x00`);
  let binary = "";
  for (let i = 0; i < raw.length; i += 1) binary += String.fromCharCode(raw[i]);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(raw).toString("base64");
  return { bytes: raw, base64, plainText };
}

/**
 * Prints ESC/POS binary data via Android Native Bluetooth SPP bridge or Web Bluetooth GATT.
 */
export async function printViaBluetooth(escPos: {
  bytes: Uint8Array;
  base64: string;
  plainText: string;
}): Promise<PrintResult> {
  // 1. Native Android APK Bluetooth Bridge
  const android = getAndroidBridge();
  if (android?.printBluetoothEscPos) {
    const res = android.printBluetoothEscPos(escPos.base64, escPos.plainText);
    return {
      ok: true,
      method: "android_bluetooth",
      message: typeof res === "string" && res ? res : "Perintah cetak dikirim ke Printer Bluetooth Android.",
    };
  }

  // 2. Web Bluetooth API (Chrome Desktop / Android Chrome)
  const nav = typeof navigator !== "undefined" ? (navigator as unknown as {
    bluetooth?: {
      requestDevice: (opts: Record<string, unknown>) => Promise<{
        name?: string;
        gatt?: {
          connect: () => Promise<{
            getPrimaryServices: () => Promise<Array<{
              getCharacteristics: () => Promise<Array<{
                properties: { write?: boolean; writeWithoutResponse?: boolean };
                writeValue: (data: BufferSource) => Promise<void>;
              }>>;
            }>>;
          }>;
        };
      }>;
    };
  }) : null;

  if (!nav?.bluetooth) {
    return {
      ok: false,
      method: "fallback",
      message: "Browser ini belum mendukung Web Bluetooth. Gunakan Chrome Android/Desktop, Aplikasi APK WACRM, atau pilih Cetak WiFi/PDF.",
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
        message: `Perangkat "${device.name ?? "Bluetooth"}" tidak memiliki karakteristik tulis ESC/POS. Gunakan Cetak WiFi atau Aplikasi Android APK.`,
      };
    }
    const chunkSize = 20;
    for (let i = 0; i < escPos.bytes.length; i += chunkSize) {
      await writable.writeValue(escPos.bytes.slice(i, i + chunkSize));
    }
    return {
      ok: true,
      method: "web_bluetooth",
      message: `Struk berhasil dicetak ke printer Bluetooth "${device.name ?? "Thermal Printer"}".`,
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
 * Prints cleanly to WiFi/AirPrint/Mopria/Network Printer or PDF via Android Native PrintManager
 * or dedicated formatted browser print window.
 */
export function printViaWifiHtml(title: string, bodyHtml: string, paperMode: "a4" | "thermal58" = "a4"): PrintResult {
  const android = getAndroidBridge();
  if (typeof window === "undefined") {
    return { ok: false, method: "fallback", message: "Hanya tersedia di browser." };
  }

  const pageCss =
    paperMode === "thermal58"
      ? `@page { size: 58mm auto; margin: 2mm; } body { width: 54mm; font-family: monospace; font-size: 11px; }`
      : `@page { size: A4; margin: 14mm; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #0f172a; }`;

  // If inside Android WebView, inject temporary print overlay or use native PrintManager
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
  <title>${title.replace(/</g, "&lt;")}</title>
  <style>
    ${pageCss}
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; }
    th { font-weight: 700; background: #f8fafc; }
    .right { text-align: right; }
    .center { text-align: center; }
    .muted { color: #64748b; font-size: 11px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #d1fae5; color: #065f46; }
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

export function renderInvoicePrintHtml(order: PosOrderRecord, storeName: string, qrDataUrl: string): string {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = order.items
    .map(
      (i) =>
        `<tr><td><strong>${esc(i.productName)}</strong><br/><span class="muted">${esc(i.sku)}</span></td><td class="center">${i.quantity}</td><td class="right">${esc(formatIdr(i.unitPrice))}</td><td class="right"><strong>${esc(formatIdr(i.lineTotal))}</strong></td></tr>`,
    )
    .join("");
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:14px;">
      <div>
        <h1 style="margin:0;color:#059669;font-size:20px;">${esc(storeName)}</h1>
        <p class="muted" style="margin:4px 0 0;">INVOICE RESMI · WACRM AI POS &amp; ERP</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:16px;font-weight:800;">${esc(order.invoiceNumber)}</div>
        <div class="muted">${esc(new Date(order.createdAt).toLocaleString("id-ID"))}</div>
        <span class="badge">${esc(order.paymentStatus.toUpperCase())} · ${esc(PAYMENT_METHOD_LABELS[order.paymentMethod])}</span>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:14px;">
      <div style="flex:1;">
        <div class="muted">KEPADA PEMESAN</div>
        <div style="font-weight:700;font-size:15px;">${esc(order.customerName)}</div>
        ${order.customerPhone ? `<div>Telp: ${esc(order.customerPhone)}</div>` : ""}
        <div>Alamat: ${esc(order.shippingAddress || "-")}</div>
        ${order.aiGenerated ? `<div class="muted" style="margin-top:4px;">Dibuat otomatis oleh Multi-Agent AI WACRM</div>` : ""}
      </div>
      <div style="text-align:center;">
        <img src="${qrDataUrl}" alt="QR Pembayaran" style="width:128px;height:128px;border:1px solid #cbd5e1;border-radius:8px;padding:4px;" />
        <div class="muted">Scan QR Pembayaran / Verifikasi</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Produk</th><th class="center">Qty</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="max-width:280px;margin-left:auto;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal</span><span>${esc(formatIdr(order.subtotal))}</span></div>
      ${order.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#dc2626;"><span>Diskon</span><span>-${esc(formatIdr(order.discountAmount))}</span></div>` : ""}
      ${order.taxAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>PPN 11%</span><span>${esc(formatIdr(order.taxAmount))}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #0f172a;font-weight:800;font-size:16px;"><span>TOTAL</span><span>${esc(formatIdr(order.totalAmount))}</span></div>
    </div>
    <p class="muted" style="margin-top:18px;border-top:1px dashed #cbd5e1;padding-top:8px;">
      Payload Verifikasi QR: <code>${esc(order.qrPayload)}</code>
    </p>
  `;
}

export function buildEscPosTextReport(
  title: string,
  storeName: string,
  bodyLines: string[],
): { bytes: Uint8Array; base64: string; plainText: string } {
  const encoder = new TextEncoder();
  const sep = "--------------------------------";
  const now = new Date().toLocaleString("id-ID");
  const lines = [
    storeName.toUpperCase(),
    title.toUpperCase(),
    `Cetak: ${now}`,
    sep,
    ...bodyLines,
    sep,
    "WACRM Enterprise AI Suite",
    "",
    "",
    "",
  ];
  const plainText = lines.join("\n");
  const raw = encoder.encode(`\x1b@\x1ba\x00${plainText}\x1dV\x00`);
  let binary = "";
  for (let i = 0; i < raw.length; i += 1) binary += String.fromCharCode(raw[i]);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(raw).toString("base64");
  return { bytes: raw, base64, plainText };
}

export function renderErpReportPrintHtml(
  products: Array<{ sku: string; name: string; category: string; unit: string; unitPrice: number; costPrice: number; stockQty: number }>,
  storeName: string,
): string {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const totalValue = products.reduce((s, p) => s + p.stockQty * p.costPrice, 0);
  const rows = products
    .map(
      (p) =>
        `<tr><td><code>${esc(p.sku)}</code></td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td class="right">${esc(formatIdr(p.unitPrice))}</td><td class="right">${p.stockQty} ${esc(p.unit)}</td></tr>`,
    )
    .join("");
  return `
    <div style="border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="margin:0;color:#059669;">${esc(storeName)} — Laporan Inventaris ERP</h1>
      <p class="muted">Dicetak pada ${esc(new Date().toLocaleString("id-ID"))} · ${products.length} SKU · Nilai Persediaan: ${esc(formatIdr(totalValue))}</p>
    </div>
    <table>
      <thead><tr><th>SKU</th><th>Nama Produk</th><th>Kategori</th><th class="right">Harga Jual</th><th class="right">Stok</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderFinancialReportPrintHtml(
  report: FinancialReportSummary,
  storeName: string,
  orders: PosOrderRecord[],
): string {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const recentOrders = orders
    .slice(0, 15)
    .map(
      (o) =>
        `<tr><td>${esc(o.invoiceNumber)}</td><td>${esc(o.customerName)}</td><td>${esc(PAYMENT_METHOD_LABELS[o.paymentMethod])}</td><td>${esc(o.paymentStatus)}</td><td class="right">${esc(formatIdr(o.totalAmount))}</td></tr>`,
    )
    .join("");
  return `
    <div style="border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="margin:0;color:#059669;">${esc(storeName)} — Laporan Keuangan &amp; ERP</h1>
      <p class="muted">Dicetak pada ${esc(new Date().toLocaleString("id-ID"))} · Status Neraca: ${report.isBalanced ? "SEIMBANG (TERVERIFIKASI AI)" : "PERLU REKONSILIASI"}</p>
    </div>
    <h3>1. Laporan Laba Rugi (Income Statement)</h3>
    <table>
      <tbody>
        <tr><td>Pendapatan Penjualan</td><td class="right"><strong>${esc(formatIdr(report.totalRevenue))}</strong></td></tr>
        <tr><td>Harga Pokok Penjualan (HPP / COGS)</td><td class="right">(${esc(formatIdr(report.totalCogs))})</td></tr>
        <tr><td><strong>Laba Kotor</strong></td><td class="right"><strong>${esc(formatIdr(report.grossProfit))}</strong></td></tr>
        <tr><td>Beban Operasional</td><td class="right">(${esc(formatIdr(report.totalExpenses))})</td></tr>
        <tr style="background:#ecfdf5;"><td><strong>LABA BERSIH (Margin ${report.profitMarginPct.toFixed(1)}%)</strong></td><td class="right"><strong>${esc(formatIdr(report.netProfit))}</strong></td></tr>
      </tbody>
    </table>
    <h3>2. Ringkasan Neraca (Balance Sheet)</h3>
    <table>
      <tbody>
        <tr><td>Kas &amp; Bank</td><td class="right">${esc(formatIdr(report.cashBalance))}</td></tr>
        <tr><td>Piutang Usaha</td><td class="right">${esc(formatIdr(report.receivablesBalance))}</td></tr>
        <tr><td>Nilai Persediaan Barang (ERP)</td><td class="right">${esc(formatIdr(report.inventoryValue))}</td></tr>
        <tr><td><strong>Total Aset</strong></td><td class="right"><strong>${esc(formatIdr(report.totalAssets))}</strong></td></tr>
        <tr><td>Total Kewajiban / PPN Keluaran</td><td class="right">${esc(formatIdr(report.totalLiabilities))}</td></tr>
        <tr><td>Total Ekuitas &amp; Laba Ditahan</td><td class="right">${esc(formatIdr(report.totalEquity))}</td></tr>
      </tbody>
    </table>
    <h3>3. Ringkasan Transaksi POS Terbaru (${orders.length} Order)</h3>
    <table>
      <thead><tr><th>Invoice</th><th>Pemesan</th><th>Pembayaran</th><th>Status</th><th class="right">Total</th></tr></thead>
      <tbody>${recentOrders || '<tr><td colspan="5" class="center muted">Belum ada transaksi.</td></tr>'}</tbody>
    </table>
  `;
}
