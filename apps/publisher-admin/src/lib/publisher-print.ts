import type {
  LicenseRecord,
  PublisherCompanyProfile,
  SubscriptionInvoiceRecord,
  VendorPurchaseOrderRecord,
} from "./publisher-types";
import { formatIdr } from "./publisher-types";

function escHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openPrintableHtmlWindow(title: string, bodyHtml: string): void {
  if (typeof window === "undefined") return;
  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; line-height: 1.5; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px; }
    .brand { font-size: 18px; font-weight: 800; color: #064e3b; }
    .sub { font-size: 11px; color: #475569; }
    .doc-title { text-align: right; }
    .doc-title h1 { margin: 0; font-size: 16px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #d1fae5; color: #065f46; font-weight: 700; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; font-size: 11px; color: #0f172a; }
    .num { text-align: right; font-family: Consolas, monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; margin-bottom: 14px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sign { margin-top: 36px; display: flex; justify-content: space-between; }
    .sign-col { width: 220px; text-align: center; }
    .sign-line { margin-top: 52px; border-top: 1px solid #334155; padding-top: 4px; font-weight: 700; }
    .foot { margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    @media print { .no-print { display: none !important; } body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:14px;text-align:right;">
    <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">Cetak / Simpan PDF</button>
    <button onclick="window.close()" style="background:#e2e8f0;color:#0f172a;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;margin-left:6px;">Tutup</button>
  </div>
  ${bodyHtml}
  <script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 250); });</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=960,height=740");
  if (!w) {
    window.print();
    return;
  }
  w.document.open();
  w.document.write(fullHtml);
  w.document.close();
}

function buildHeader(profile: PublisherCompanyProfile, docTitle: string, docCode: string): string {
  return `<div class="hdr">
    <div>
      <div class="brand">${escHtml(profile.companyName)}</div>
      <div class="sub">${escHtml(profile.address)}</div>
      <div class="sub">NPWP: ${escHtml(profile.npwp)} · Telp: ${escHtml(profile.phone)} · ${escHtml(profile.email)}</div>
    </div>
    <div class="doc-title">
      <h1>${escHtml(docTitle)}</h1>
      <div class="sub">No. Dokumen: <strong>${escHtml(docCode)}</strong></div>
      <div class="sub">Dicetak: ${new Date().toLocaleString("id-ID")}</div>
    </div>
  </div>`;
}

export function printEmsTableReport(params: {
  profile: PublisherCompanyProfile;
  title: string;
  subtitle: string;
  docCode: string;
  columns: string[];
  rows: string[][];
  summaryNotes?: string[];
}): void {
  const ths = params.columns.map((c) => `<th>${escHtml(c)}</th>`).join("");
  const trs = params.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  const notesHtml = params.summaryNotes?.length
    ? `<div class="box"><strong>Ringkasan Eksekutif:</strong><ul style="margin:6px 0 0 18px;padding:0;">${params.summaryNotes.map((n) => `<li>${escHtml(n)}</li>`).join("")}</ul></div>`
    : "";

  openPrintableHtmlWindow(
    params.title,
    `${buildHeader(params.profile, params.title, params.docCode)}
    <p style="margin:0 0 10px 0;color:#334155;">${escHtml(params.subtitle)}</p>
    ${notesHtml}
    <table>
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs || `<tr><td colspan="${params.columns.length}" style="text-align:center;">Tidak ada data.</td></tr>`}</tbody>
    </table>
    <div class="sign">
      <div class="sign-col">Disiapkan Oleh,<div class="sign-line">Administrator EMS</div></div>
      <div class="sign-col">Disetujui Oleh,<div class="sign-line">Direksi ${escHtml(params.profile.companyName)}</div></div>
    </div>
    <div class="foot"><span>WACRM Publisher HQ · Standard Enterprise Management System v5.3</span><span>Dokumen Resmi Internal</span></div>`,
  );
}

export function printLicenseCertificate(profile: PublisherCompanyProfile, lic: LicenseRecord): void {
  openPrintableHtmlWindow(
    `Sertifikat Lisensi ${lic.licenseKey}`,
    `${buildHeader(profile, "Sertifikat Lisensi Resmi WACRM", lic.licenseKey)}
    <div class="box" style="border:2px solid #059669;background:#ecfdf5;">
      <div style="font-size:11px;color:#065f46;font-weight:700;text-transform:uppercase;">Cryptographic License Key</div>
      <div style="font-size:20px;font-family:Consolas,monospace;font-weight:800;letter-spacing:1.2px;margin-top:4px;color:#0f172a;">${escHtml(lic.licenseKey)}</div>
    </div>
    <div class="grid2">
      <div class="box">
        <strong>Informasi Perusahaan Pemegang Lisensi</strong><br/>
        Perusahaan: ${escHtml(lic.tenantName)}<br/>
        Domain: ${escHtml(lic.domain)}<br/>
        Status: <span class="badge">${escHtml(lic.status.toUpperCase())}</span>
      </div>
      <div class="box">
        <strong>Hak Akses &amp; Kuota Edisi</strong><br/>
        Edisi: <strong>${escHtml(lic.editionId.toUpperCase())}</strong> (${escHtml(lic.billingCycle)})<br/>
        Kuota Kursi: ${lic.maxSeats >= 9999 ? "Unlimited" : `${lic.maxSeats} pengguna`}<br/>
        Agen AI Aktif: ${lic.maxAiAgents} Agen · Berlaku s/d: <strong>${escHtml(lic.expiresAt)}</strong>
      </div>
    </div>
    <div class="box">
      <strong>Modul &amp; Entitlement Aktif (${lic.entitlements.length} modul):</strong><br/>
      <div style="margin-top:6px;font-family:Consolas,monospace;font-size:11px;">${escHtml(lic.entitlements.join(" · "))}</div>
    </div>
    <div class="sign">
      <div class="sign-col">License Officer,<div class="sign-line">Publisher LMS</div></div>
      <div class="sign-col">Penerbit Resmi,<div class="sign-line">${escHtml(profile.companyName)}</div></div>
    </div>`,
  );
}

export function printCommercialInvoice(
  profile: PublisherCompanyProfile,
  inv: SubscriptionInvoiceRecord,
): void {
  openPrintableHtmlWindow(
    `Invoice ${inv.invoiceNumber}`,
    `${buildHeader(profile, "Commercial Invoice & Faktur PPN 11%", inv.invoiceNumber)}
    <div class="grid2">
      <div class="box">
        <strong>Ditagihkan Kepada:</strong><br/>
        <strong>${escHtml(inv.tenantName)}</strong><br/>
        SKU: ${escHtml(inv.skuCode)}<br/>
        Status: <span class="badge">${escHtml(inv.status.toUpperCase())}</span>
      </div>
      <div class="box">
        <strong>Detail Penagihan:</strong><br/>
        Tanggal Terbit: ${escHtml(inv.issuedDate)}<br/>
        Jatuh Tempo: ${escHtml(inv.dueDate)}<br/>
        Tanggal Lunas: ${escHtml(inv.paidDate || "Belum Lunas")}
      </div>
    </div>
    <table>
      <thead><tr><th>Deskripsi Layanan / Lisensi</th><th>Siklus</th><th class="num">DPP (Subtotal)</th><th class="num">PPN (${Math.round(inv.ppnRate * 100)}%)</th><th class="num">Total Tagihan</th></tr></thead>
      <tbody>
        <tr>
          <td>${escHtml(inv.description)}</td>
          <td>${escHtml(inv.billingCycle)} (${inv.periodMonths} bln)</td>
          <td class="num">${escHtml(formatIdr(inv.subtotalIdr))}</td>
          <td class="num">${escHtml(formatIdr(inv.ppnAmountIdr))}</td>
          <td class="num"><strong>${escHtml(formatIdr(inv.totalIdr))}</strong></td>
        </tr>
      </tbody>
    </table>
    <div class="box" style="margin-top:14px;">
      <strong>Instruksi Pembayaran Transfer Bank:</strong><br/>
      Bank: ${escHtml(profile.bankName)} · No. Rekening: <strong>${escHtml(profile.bankAccountNo)}</strong> · Atas Nama: ${escHtml(profile.bankAccountHolder)}
    </div>`,
  );
}

export function printVendorPurchaseOrder(
  profile: PublisherCompanyProfile,
  po: VendorPurchaseOrderRecord,
): void {
  openPrintableHtmlWindow(
    `Purchase Order ${po.poNumber}`,
    `${buildHeader(profile, "Purchase Order (PO) Pengadaan", po.poNumber)}
    <div class="grid2">
      <div class="box">
        <strong>Vendor / Pemasok:</strong><br/>
        <strong>${escHtml(po.vendorName)}</strong><br/>
        Kategori: ${escHtml(po.category)}
      </div>
      <div class="box">
        <strong>Status PO:</strong> <span class="badge">${escHtml(po.status.toUpperCase())}</span><br/>
        Tanggal PO: ${escHtml(po.orderDate)}<br/>
        Tanggal Bayar: ${escHtml(po.paidDate || "Belum Dibayar")}
      </div>
    </div>
    <table>
      <thead><tr><th>Deskripsi Barang / Layanan Cloud</th><th class="num">Qty</th><th class="num">Harga Satuan</th><th class="num">PPN Masukan</th><th class="num">Total PO</th></tr></thead>
      <tbody>
        <tr>
          <td>${escHtml(po.description)}</td>
          <td class="num">${po.qty}</td>
          <td class="num">${escHtml(formatIdr(po.unitCostIdr))}</td>
          <td class="num">${escHtml(formatIdr(po.ppnInputIdr))}</td>
          <td class="num"><strong>${escHtml(formatIdr(po.totalIdr))}</strong></td>
        </tr>
      </tbody>
    </table>`,
  );
}
