/**
 * Zero-dependency standards-compliant PDF 1.4 binary generator (`%PDF-1.4`).
 * Produces genuine, multi-page downloadable `.pdf` files with crisp headers,
 * KPI summaries, and structured tables across Web, Mobile Chrome, iOS Safari & Android APK.
 */

export interface PdfTableColumn {
  header: string;
  widthRatio?: number;
  align?: "left" | "right";
}

export interface StructuredPdfDocument {
  title: string;
  subtitle?: string;
  businessName: string;
  businessMeta?: string;
  generatedAt?: string;
  kpis?: Array<{ label: string; value: string }>;
  columns: PdfTableColumn[];
  rows: string[][];
  footerNote?: string;
}

/**
 * Sanitizes text to safe WinAnsi / ASCII PDF literal characters and escapes `(`, `)`, `\`.
 */
function pdfSafeText(raw: string): string {
  const normalized = raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return normalized
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 2)}..`;
}

/**
 * Builds genuine `%PDF-1.4` bytes (A4 portrait: 595 x 842 pt) with automatic pagination.
 */
export function generateStructuredPdfBytes(doc: StructuredPdfDocument): Uint8Array {
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN_X = 36;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const BOTTOM_Y = 48;

  const pages: string[][] = [];
  let cmds: string[] = [];
  let y = PAGE_H - 42;

  const pushPage = () => {
    if (cmds.length > 0) {
      pages.push(cmds);
    }
    cmds = [];
    y = PAGE_H - 42;
  };

  const drawText = (
    x: number,
    baselineY: number,
    text: string,
    size = 9,
    bold = false,
    rgb: [number, number, number] = [0.06, 0.09, 0.16],
  ) => {
    const font = bold ? "/F2" : "/F1";
    cmds.push(
      `BT ${font} ${size} Tf ${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg 1 0 0 1 ${x.toFixed(1)} ${baselineY.toFixed(1)} Tm (${pdfSafeText(text)}) Tj ET`,
    );
  };

  const drawRect = (
    x: number,
    bottomY: number,
    w: number,
    h: number,
    fillRgb: [number, number, number],
  ) => {
    cmds.push(
      `${fillRgb[0].toFixed(3)} ${fillRgb[1].toFixed(3)} ${fillRgb[2].toFixed(3)} rg ${x.toFixed(1)} ${bottomY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`,
    );
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rgb: [number, number, number] = [0.82, 0.85, 0.89],
    width = 0.6,
  ) => {
    cmds.push(
      `${width} w ${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`,
    );
  };

  const drawPageHeader = (continued = false) => {
    // Emerald top accent bar
    drawRect(MARGIN_X, PAGE_H - 30, CONTENT_W, 4, [0.02, 0.59, 0.41]);
    y = PAGE_H - 48;
    drawText(MARGIN_X, y, truncateText(doc.businessName || "WACRM Commercial OS", 65), 14, true, [0.04, 0.08, 0.14]);
    const dateLabel = doc.generatedAt || new Date().toLocaleString("id-ID");
    drawText(PAGE_W - MARGIN_X - 155, y + 2, truncateText(dateLabel, 28), 8, false, [0.39, 0.45, 0.55]);
    y -= 14;
    if (doc.businessMeta) {
      drawText(MARGIN_X, y, truncateText(doc.businessMeta, 95), 8, false, [0.39, 0.45, 0.55]);
      y -= 14;
    }
    drawText(
      MARGIN_X,
      y,
      truncateText(`${doc.title}${continued ? " (Lanjutan)" : ""}`, 82),
      11.5,
      true,
      [0.02, 0.47, 0.34],
    );
    y -= 12;
    if (doc.subtitle && !continued) {
      drawText(MARGIN_X, y, truncateText(doc.subtitle, 100), 8.5, false, [0.3, 0.36, 0.45]);
      y -= 12;
    }
    drawLine(MARGIN_X, y, PAGE_W - MARGIN_X, y, [0.02, 0.59, 0.41], 1);
    y -= 14;
  };

  // Start Page 1
  drawPageHeader(false);

  // KPI summary row (up to 4 cards per row)
  if (doc.kpis && doc.kpis.length > 0) {
    const kpiList = doc.kpis.slice(0, 8);
    const colsPerRow = Math.min(4, kpiList.length);
    const gap = 8;
    const cardW = (CONTENT_W - gap * (colsPerRow - 1)) / colsPerRow;
    const cardH = 34;

    for (let i = 0; i < kpiList.length; i += colsPerRow) {
      const slice = kpiList.slice(i, i + colsPerRow);
      if (y - cardH < BOTTOM_Y) {
        pushPage();
        drawPageHeader(true);
      }
      slice.forEach((kpi, idx) => {
        const cx = MARGIN_X + idx * (cardW + gap);
        drawRect(cx, y - cardH + 6, cardW, cardH, [0.95, 0.97, 0.99]);
        drawText(cx + 6, y - 5, truncateText(kpi.label, 24), 7.2, false, [0.39, 0.45, 0.55]);
        drawText(cx + 6, y - 19, truncateText(kpi.value, 22), 9.5, true, [0.06, 0.09, 0.16]);
      });
      y -= cardH + 10;
    }
  }

  // Compute column widths
  const columns = doc.columns.length > 0 ? doc.columns : [{ header: "Data" }];
  const totalRatio = columns.reduce((s, c) => s + (c.widthRatio ?? 1), 0);
  const colWidths = columns.map((c) => ((c.widthRatio ?? 1) / totalRatio) * CONTENT_W);
  const colX: number[] = [];
  let cursorX = MARGIN_X;
  for (const w of colWidths) {
    colX.push(cursorX);
    cursorX += w;
  }

  const drawTableHeader = () => {
    const headerH = 20;
    drawRect(MARGIN_X, y - headerH + 5, CONTENT_W, headerH, [0.06, 0.12, 0.2]);
    columns.forEach((col, i) => {
      const maxChars = Math.max(6, Math.floor((colWidths[i] - 8) / 4.8));
      drawText(colX[i] + 4, y - 9, truncateText(col.header, maxChars), 8, true, [1, 1, 1]);
    });
    y -= headerH + 3;
  };

  if (y < BOTTOM_Y + 40) {
    pushPage();
    drawPageHeader(true);
  }
  drawTableHeader();

  const rowH = 16;
  const rows = doc.rows.length > 0 ? doc.rows : [["(Tidak ada data pada periode ini)"]];

  rows.forEach((row, rowIdx) => {
    if (y - rowH < BOTTOM_Y) {
      pushPage();
      drawPageHeader(true);
      drawTableHeader();
    }
    if (rowIdx % 2 === 1) {
      drawRect(MARGIN_X, y - rowH + 4, CONTENT_W, rowH, [0.97, 0.98, 0.99]);
    }
    columns.forEach((col, colIdx) => {
      const cell = row[colIdx] ?? "";
      const maxChars = Math.max(6, Math.floor((colWidths[colIdx] - 8) / 4.4));
      const trimmed = truncateText(String(cell), maxChars);
      drawText(colX[colIdx] + 4, y - 8, trimmed, 7.8, false, [0.1, 0.14, 0.22]);
    });
    drawLine(MARGIN_X, y - rowH + 4, PAGE_W - MARGIN_X, y - rowH + 4, [0.9, 0.92, 0.95], 0.4);
    y -= rowH;
  });

  // Footer note on last page
  const footerText =
    doc.footerNote ||
    `Dokumen resmi dicetak dari ${doc.businessName} · Format PDF 1.4 Siap Arsip & Transfer Desktop`;
  drawLine(MARGIN_X, 34, PAGE_W - MARGIN_X, 34, [0.82, 0.85, 0.89], 0.5);
  drawText(MARGIN_X, 22, truncateText(footerText, 105), 7.5, false, [0.42, 0.48, 0.57]);

  pushPage();

  // Add page numbers to every page
  const totalPages = pages.length;
  pages.forEach((pageCmds, i) => {
    pageCmds.push(
      `BT /F1 7.5 Tf 0.420 0.480 0.570 rg 1 0 0 1 ${(PAGE_W - MARGIN_X - 52).toFixed(1)} 22.0 Tm (Hal ${i + 1} / ${totalPages}) Tj ET`,
    );
  });

  // Assemble PDF objects
  // 1: Catalog, 2: Pages, 3: Font Helvetica, 4: Font Helvetica-Bold
  // 5.. : pairs of (Page obj, Content stream obj)
  const objects: string[] = [];
  const pageObjNumbers: number[] = [];
  const firstPageObj = 5;

  for (let i = 0; i < pages.length; i++) {
    pageObjNumbers.push(firstPageObj + i * 2);
  }

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjNumbers.map((n) => `${n} 0 R`).join(" ")}] >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((pageCmds, i) => {
    const contentObjNum = firstPageObj + i * 2 + 1;
    const streamStr = pageCmds.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`,
    );
    objects.push(`<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream`);
  });

  // Serialize with exact byte offsets for xref table
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;
  const offsets: number[] = [];

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  };

  pushStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  objects.forEach((body, idx) => {
    offsets.push(byteOffset);
    pushStr(`${idx + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefOffset = byteOffset;
  pushStr(`xref\n0 ${objects.length + 1}\n`);
  pushStr("0000000000 65535 f \n");
  offsets.forEach((off) => {
    pushStr(`${String(off).padStart(10, "0")} 00000 n \n`);
  });
  pushStr(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const output = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    output.set(c, pos);
    pos += c.length;
  }
  return output;
}

/**
 * Extracts readable lines/table cells from any printable HTML string so ANY invoice/receipt/report
 * can be converted to a genuine binary `.pdf` download in 1 tap!
 */
export function buildPdfFromPrintableHtml(
  title: string,
  bodyHtml: string,
  businessName = "WACRM Workspace",
): Uint8Array {
  const rowMatches = [...bodyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const stripTags = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const parsedRows: string[][] = [];
  let headers: string[] = [];

  for (const m of rowMatches) {
    const inner = m[1];
    const ths = [...inner.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((c) => stripTags(c[1]));
    if (ths.length > 0 && headers.length === 0) {
      headers = ths;
      continue;
    }
    const tds = [...inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));
    if (tds.length > 0) {
      parsedRows.push(tds);
    }
  }

  // Also capture key summary lines outside tables
  const withoutTables = bodyHtml.replace(/<table[\s\S]*?<\/table>/gi, "\n");
  const textLines = withoutTables
    .replace(/<\/(div|p|h1|h2|h3|h4|li|tr)>/gi, "\n")
    .split("\n")
    .map(stripTags)
    .filter((line) => line.length >= 2 && line.length <= 160);

  if (parsedRows.length > 0 && headers.length > 0) {
    return generateStructuredPdfBytes({
      title,
      subtitle: textLines.slice(0, 3).join(" | "),
      businessName,
      columns: headers.map((h) => ({ header: h })),
      rows: parsedRows,
      footerNote: textLines.slice(-2).join(" - "),
    });
  }

  return generateStructuredPdfBytes({
    title,
    businessName,
    columns: [{ header: "Rincian Dokumen", widthRatio: 1 }],
    rows: textLines.map((line) => [line]),
  });
}
