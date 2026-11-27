import { describe, expect, it } from "vitest";
import { buildOrderRecord } from "./ai-agents";
import {
  buildEscPosReceipt,
  buildEscPosTextReport,
  renderErpReportPrintHtml,
  renderInvoicePrintHtml,
} from "./printer";
import { generateQrDataUrl, generateQrSvg } from "./qr-generator";

describe("QR Code Generator & Bluetooth/WiFi Printer Engine", () => {
  it("generates real scannable QR PNG Data URLs and SVGs", async () => {
    const payload = "WACRM|INV-20261126-9999|TOTAL=410700|PAY=QRIS|HASH=ABCDEF12";
    const dataUrl = await generateQrDataUrl(payload, 200);
    const svg = await generateQrSvg(payload);

    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(250);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("builds valid ESC/POS thermal receipt bytes with init, native QR, and cut commands", () => {
    const order = buildOrderRecord({
      id: "ord-bt-1",
      workspaceName: "WACRM Enterprise",
      customerName: "Andi Pratama",
      customerPhone: "+628123456789",
      shippingAddress: "Jl. Diponegoro No. 19, Surabaya",
      channel: "whatsapp",
      paymentMethod: "qris",
      paymentStatus: "paid",
      aiGenerated: true,
      items: [
        {
          id: "i-1",
          productId: "p-1",
          sku: "KOPI-GAYO",
          productName: "Kopi Arabika Gayo 1Kg",
          quantity: 2,
          unitPrice: 185000,
          costPrice: 110000,
        },
      ],
    });

    const receipt = buildEscPosReceipt(order, "WACRM Enterprise");
    // ESC @ initialize
    expect(receipt.bytes[0]).toBe(0x1b);
    expect(receipt.bytes[1]).toBe(0x40);
    expect(receipt.plainText).toContain(order.invoiceNumber);
    expect(receipt.plainText).toContain("Andi Pratama");
    expect(receipt.base64.length).toBeGreaterThan(50);
    // Ends with GS V 0 cut command
    expect(receipt.bytes[receipt.bytes.length - 3]).toBe(0x1d);
    expect(receipt.bytes[receipt.bytes.length - 2]).toBe(0x56);
  });

  it("escapes HTML safely in WiFi invoice & ERP report print templates", () => {
    const order = buildOrderRecord({
      id: "ord-xss-1",
      workspaceName: "WACRM <script>alert(1)</script>",
      customerName: "<b>Malicious</b>",
      customerPhone: null,
      shippingAddress: "Kediri",
      channel: "whatsapp",
      paymentMethod: "cash",
      paymentStatus: "paid",
      aiGenerated: false,
      items: [
        {
          id: "i-2",
          productId: null,
          sku: "SKU1",
          productName: "Produk Uji",
          quantity: 1,
          unitPrice: 50000,
          costPrice: 25000,
        },
      ],
    });

    const html = renderInvoicePrintHtml(
      order,
      "WACRM <script>alert(1)</script>",
      "data:image/png;base64,AAA",
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;Malicious&lt;/b&gt;");

    const erpHtml = renderErpReportPrintHtml(
      [
        {
          sku: "SKU1",
          name: "Produk Uji",
          category: "Umum",
          unit: "pcs",
          unitPrice: 50000,
          costPrice: 25000,
          stockQty: 10,
        },
      ],
      "Toko Berkah Nusantara",
    );
    expect(erpHtml).toContain("Laporan Stok &amp; Inventaris Gudang");
    expect(erpHtml).toContain("Toko Berkah Nusantara");
    expect(erpHtml).toContain("SKU1");

    const escSummary = buildEscPosTextReport("RINGKASAN", "WACRM", ["Kas: Rp 10.000.000"]);
    expect(escSummary.bytes[0]).toBe(0x1b);
    expect(escSummary.plainText).toContain("RINGKASAN");
  });
});
