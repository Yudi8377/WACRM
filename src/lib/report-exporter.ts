import {
  generateStructuredPdfBytes,
  type PdfTableColumn,
} from "@/lib/pdf-generator";
import { getAndroidBridge } from "@/lib/printer";

export type ReportExportFormat = "excel" | "pdf" | "csv" | "json";
export type DesktopTransferTransport = "usb" | "bluetooth" | "wifi" | "download";

export interface ReportSheetDataset {
  sheetName: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface ReportExportPayload {
  reportTitle: string;
  subtitle?: string;
  businessName: string;
  businessMeta?: string;
  filenameBase: string;
  kpis?: Array<{ label: string; value: string }>;
  sheets: ReportSheetDataset[];
  footerNote?: string;
}

export interface GeneratedExportArtifact {
  filename: string;
  mimeType: string;
  format: ReportExportFormat;
  bytes: Uint8Array;
  plainSummary: string;
  tsvForClipboard: string;
}

export interface TransferResult {
  ok: boolean;
  transport: DesktopTransferTransport;
  format: ReportExportFormat;
  filename: string;
  message: string;
}

function xmlEscape(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeSheetName(name: string, index: number): string {
  const clean = name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 28);
  return clean || `Sheet${index + 1}`;
}

/**
 * Generates a rich multi-worksheet Excel Workbook (SpreadsheetML 2003 `.xls`)
 * with styled emerald headers, auto-typed numbers, and full UTF-8 support.
 * Opens seamlessly in Microsoft Excel, LibreOffice Calc, Google Sheets & WPS Office!
 */
export function buildExcelWorkbookXml(payload: ReportExportPayload): string {
  const sheetsXml = payload.sheets
    .map((sheet, idx) => {
      const safeName = xmlEscape(sanitizeSheetName(sheet.sheetName, idx));
      const colCount = Math.max(1, sheet.headers.length);
      const colsXml = Array.from({ length: colCount })
        .map(() => `<Column ss:AutoFitWidth="1" ss:Width="135"/>`)
        .join("");

      const titleRow = `<Row ss:Height="24"><Cell ss:StyleID="Title"><Data ss:Type="String">${xmlEscape(`${payload.businessName} — ${payload.reportTitle}`)}</Data></Cell></Row>`;
      const metaRow = `<Row ss:Height="18"><Cell ss:StyleID="Meta"><Data ss:Type="String">${xmlEscape(payload.subtitle || `Dicetak: ${new Date().toLocaleString("id-ID")}`)}</Data></Cell></Row>`;
      const spacerRow = `<Row ss:Height="8"/>`;

      const headerCells = sheet.headers
        .map(
          (h) =>
            `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(String(h))}</Data></Cell>`,
        )
        .join("");
      const headerRow = `<Row ss:Height="22">${headerCells}</Row>`;

      const dataRows = sheet.rows
        .map((row) => {
          const cells = row
            .map((cell) => {
              if (typeof cell === "number" && Number.isFinite(cell)) {
                return `<Cell ss:StyleID="Num"><Data ss:Type="Number">${cell}</Data></Cell>`;
              }
              return `<Cell ss:StyleID="Cell"><Data ss:Type="String">${xmlEscape(String(cell ?? ""))}</Data></Cell>`;
            })
            .join("");
          return `<Row ss:Height="19">${cells}</Row>`;
        })
        .join("\n");

      return `<Worksheet ss:Name="${safeName}">
  <Table>
    ${colsXml}
    ${titleRow}
    ${metaRow}
    ${spacerRow}
    ${headerRow}
    ${dataRows}
  </Table>
</Worksheet>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="13" ss:Color="#065F46"/></Style>
    <Style ss:ID="Meta"><Font ss:Size="9" ss:Color="#475569"/></Style>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Size="10" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#059669" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Cell"><Font ss:Size="10" ss:Color="#0F172A"/></Style>
    <Style ss:ID="Num"><Font ss:Size="10" ss:Color="#0F172A"/><NumberFormat ss:Format="#,##0"/></Style>
  </Styles>
  ${sheetsXml}
</Workbook>`;
}

/**
 * Generates UTF-8 BOM CSV so Indonesian Excel displays Rp & special characters cleanly.
 */
export function buildCsvString(sheet: ReportSheetDataset): string {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? "");
    if (/[",\r\n;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    sheet.headers.map(escapeCsv).join(","),
    ...sheet.rows.map((r) => r.map(escapeCsv).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function buildTsvForExcelClipboard(sheet: ReportSheetDataset): string {
  const clean = (v: string | number) => String(v ?? "").replace(/[\t\r\n]+/g, " ");
  return [
    sheet.headers.map(clean).join("\t"),
    ...sheet.rows.map((r) => r.map(clean).join("\t")),
  ].join("\n");
}

/**
 * Compiles a structured report into Excel, PDF, CSV, or JSON bytes ready for download or desktop transfer.
 */
export function generateReportArtifact(
  payload: ReportExportPayload,
  format: ReportExportFormat,
): GeneratedExportArtifact {
  const primarySheet = payload.sheets[0] ?? { sheetName: "Laporan", headers: ["Info"], rows: [] };
  const dateStamp = new Date().toISOString().slice(0, 10);
  const safeBase = payload.filenameBase.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  const encoder = new TextEncoder();

  const plainSummary = [
    `${payload.businessName} — ${payload.reportTitle}`,
    payload.subtitle || "",
    ...(payload.kpis ?? []).map((k) => `• ${k.label}: ${k.value}`),
    `Total baris data: ${primarySheet.rows.length}`,
  ]
    .filter(Boolean)
    .join("\n");

  const tsvForClipboard = buildTsvForExcelClipboard(primarySheet);

  if (format === "excel") {
    const xml = buildExcelWorkbookXml(payload);
    return {
      filename: `${safeBase}-${dateStamp}.xls`,
      mimeType: "application/vnd.ms-excel;charset=utf-8",
      format,
      bytes: encoder.encode(xml),
      plainSummary,
      tsvForClipboard,
    };
  }

  if (format === "pdf") {
    const cols: PdfTableColumn[] = primarySheet.headers.map((h) => ({ header: h }));
    const pdfBytes = generateStructuredPdfBytes({
      title: payload.reportTitle,
      subtitle: payload.subtitle,
      businessName: payload.businessName,
      businessMeta: payload.businessMeta,
      kpis: payload.kpis,
      columns: cols,
      rows: primarySheet.rows.map((r) => r.map((c) => String(c ?? ""))),
      footerNote: payload.footerNote,
    });
    return {
      filename: `${safeBase}-${dateStamp}.pdf`,
      mimeType: "application/pdf",
      format,
      bytes: pdfBytes,
      plainSummary,
      tsvForClipboard,
    };
  }

  if (format === "csv") {
    const csv = buildCsvString(primarySheet);
    return {
      filename: `${safeBase}-${dateStamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      format,
      bytes: encoder.encode(csv),
      plainSummary,
      tsvForClipboard,
    };
  }

  const jsonBody = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      businessName: payload.businessName,
      reportTitle: payload.reportTitle,
      subtitle: payload.subtitle,
      kpis: payload.kpis ?? [],
      sheets: payload.sheets,
    },
    null,
    2,
  );
  return {
    filename: `${safeBase}-${dateStamp}.json`,
    mimeType: "application/json;charset=utf-8",
    format: "json",
    bytes: encoder.encode(jsonBody),
    plainSummary,
    tsvForClipboard,
  };
}

function toBlobBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function triggerBrowserDownload(artifact: GeneratedExportArtifact): void {
  const blob = new Blob([toBlobBuffer(artifact.bytes)], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = artifact.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Exports & transfers a report file to Desktop via USB, Bluetooth, Wi-Fi, or Direct Download.
 */
export async function exportAndTransferReport(
  payload: ReportExportPayload,
  format: ReportExportFormat,
  transport: DesktopTransferTransport,
): Promise<TransferResult> {
  const artifact = generateReportArtifact(payload, format);

  if (typeof window === "undefined") {
    return {
      ok: false,
      transport,
      format,
      filename: artifact.filename,
      message: "Ekspor laporan hanya dapat dijalankan di browser/aplikasi.",
    };
  }

  // 1. USB Transfer (Desktop File System Access Picker or Mobile Downloads/ folder for USB MTP transfer)
  if (transport === "usb") {
    const winWithPicker = window as unknown as {
      showSaveFilePicker?: (opts: {
        suggestedName: string;
        types?: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };
    const ext = `.${artifact.filename.split(".").pop() || "xls"}`;
    const baseMime = artifact.mimeType.split(";")[0];
    if (typeof winWithPicker.showSaveFilePicker === "function") {
      try {
        const handle = await winWithPicker.showSaveFilePicker({
          suggestedName: artifact.filename,
          types: [{ description: `Laporan ${format.toUpperCase()}`, accept: { [baseMime]: [ext] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(new Blob([toBlobBuffer(artifact.bytes)], { type: artifact.mimeType }));
        await writable.close();
        return {
          ok: true,
          transport: "usb",
          format,
          filename: artifact.filename,
          message: `File "${artifact.filename}" berhasil disimpan langsung ke drive / perangkat USB pilihan Anda!`,
        };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return {
            ok: false,
            transport: "usb",
            format,
            filename: artifact.filename,
            message: "Penyimpanan USB dibatalkan.",
          };
        }
      }
    }

    triggerBrowserDownload(artifact);
    return {
      ok: true,
      transport: "usb",
      format,
      filename: artifact.filename,
      message: `File "${artifact.filename}" tersimpan di folder Downloads HP/PC — sambungkan kabel USB-C / Micro-USB (mode Transfer File / MTP) untuk langsung salin ke Desktop.`,
    };
  }

  // 2. Bluetooth / Wi-Fi Direct / Quick Share / AirDrop via Web Share File API + Android Native Share
  if (transport === "bluetooth" || transport === "wifi") {
    const label =
      transport === "bluetooth"
        ? "Bluetooth (OPP / Kirim File ke PC)"
        : "Wi-Fi (Quick Share / AirDrop / Jaringan Lokal)";
    try {
      const nav = navigator as unknown as {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
      };
      const file = new File([toBlobBuffer(artifact.bytes)], artifact.filename, {
        type: artifact.mimeType.split(";")[0],
      });
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: `${payload.reportTitle} (${format.toUpperCase()})`,
          text: `Transfer laporan via ${label}: ${artifact.filename}`,
          files: [file],
        });
        return {
          ok: true,
          transport,
          format,
          filename: artifact.filename,
          message: `Panel kirim ${label} dibuka untuk file "${artifact.filename}". Pilih PC/Laptop tujuan Anda.`,
        };
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          transport,
          format,
          filename: artifact.filename,
          message: `Pengiriman via ${label} dibatalkan.`,
        };
      }
    }

    // Android APK bridge share fallback + guaranteed file download
    triggerBrowserDownload(artifact);
    const android = getAndroidBridge();
    if (android?.shareText) {
      try {
        android.shareText(`${payload.reportTitle} (${artifact.filename})`, artifact.plainSummary);
      } catch {
        // ignore
      }
    }
    return {
      ok: true,
      transport,
      format,
      filename: artifact.filename,
      message: `File "${artifact.filename}" berhasil diunduh ke folder Downloads — pilih 'Bagikan → ${transport === "bluetooth" ? "Bluetooth" : "Quick Share / Wi-Fi"}' untuk kirim ke Desktop!`,
    };
  }

  // 3. Direct Download
  triggerBrowserDownload(artifact);
  return {
    ok: true,
    transport: "download",
    format,
    filename: artifact.filename,
    message: `Laporan "${artifact.filename}" (${format.toUpperCase()}) berhasil diunduh!`,
  };
}
