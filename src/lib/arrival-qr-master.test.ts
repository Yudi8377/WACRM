import { describe, expect, it } from "vitest";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import {
  createArrivalQrLabelRecord,
  encodeArrivalQrPayload,
  generateNextArrivalCodes,
  generateNextGroupSku,
  parseScannedQrCode,
  renderArrivalQrStickersPrintHtml,
  type FifoBatchRecord,
} from "@/lib/fifo-inventory";
import {
  deriveGroupCode,
  getDefaultMasterData,
  normalizeProductGroup,
} from "@/lib/store-profile";
import type { ErpProductRecord, MasterCategoryRecord } from "@/lib/crm-types";

const SAMPLE_PRODUCTS: ErpProductRecord[] = [
  {
    id: "prod-1",
    sku: "MNM-2611-001",
    name: "Kopi Arabika Gayo 500gr",
    category: "Minuman",
    description: "Roast medium",
    unit: "pack",
    unitPrice: 125_000,
    costPrice: 78_000,
    stockQty: 15,
    minStock: 5,
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
];

describe("Kelompok Barang Master Data & Auto-QR Normalization", () => {
  it("derives clean uppercase group prefix codes from Indonesian product group names", () => {
    expect(deriveGroupCode("Minuman")).toBe("MNM");
    expect(deriveGroupCode("Minuman & Kopi")).toBe("MIK");
    expect(deriveGroupCode("Skincare Herbal Alami")).toBe("SHA");
    expect(deriveGroupCode("Grosir", "gro")).toBe("GRO");
    expect(deriveGroupCode("Kopi", "kop-99")).toBe("KOP99");
  });

  it("hydrates legacy MasterCategoryRecord entries seamlessly with FIFO & Auto-QR defaults", () => {
    const legacy: MasterCategoryRecord = {
      id: "cat-legacy",
      name: "Makanan Ringan",
      description: "Keripik dan camilan UMKM",
    };
    const norm = normalizeProductGroup(legacy, 0);
    expect(norm.groupCode).toMatch(/^[A-Z0-9]{2,5}$/);
    expect(norm.defaultRack).toBe("Rak A-1");
    expect(norm.defaultUnit).toBe("pcs");
    expect(norm.badgeColorHex).toMatch(/^#[0-9a-f]{6}$/i);

    const defaults = getDefaultMasterData();
    expect(defaults.categories.length).toBeGreaterThanOrEqual(5);
    const minuman = defaults.categories.find((c) => c.name === "Minuman");
    expect(minuman?.groupCode).toBe("MNM");
    expect(minuman?.requiresExpiry).toBe(true);
    expect(minuman?.defaultShelfLifeDays).toBe(90);
  });
});

describe("Arrival QR Label Generator, Sequencer & Parser (WACRM-IN)", () => {
  const fixedDate = new Date("2026-11-26T10:00:00.000Z");
  const minumanGroup: MasterCategoryRecord = {
    id: "cat-2",
    name: "Minuman",
    description: "Kopi & bahan kafe",
    groupCode: "MNM",
    defaultRack: "Rak B-1",
    defaultUnit: "pack",
    defaultShelfLifeDays: 90,
    requiresExpiry: true,
    badgeColorHex: "#06b6d4",
  };

  it("auto-generates collision-free sequential SKUs and FIFO batch codes per Kelompok Barang", () => {
    const nextSku = generateNextGroupSku(minumanGroup, SAMPLE_PRODUCTS, [], fixedDate);
    expect(nextSku).toBe("MNM-2611-002");

    const existingBatches: FifoBatchRecord[] = [
      {
        id: "fifo-1",
        batchCode: "LOT-MNM-261126-01",
        productId: "prod-1",
        sku: "MNM-2611-001",
        productName: "Kopi Arabika Gayo 500gr",
        supplierName: "PT Roastery",
        receivedDate: "2026-11-26",
        expiryDate: "2027-02-24",
        initialQty: 10,
        remainingQty: 10,
        unitCostIdr: 78_000,
        rackLocation: "Rak B-1",
        qrPayload: "WACRM-ITEM|SKU:MNM-2611-001|LOT:LOT-MNM-261126-01",
        createdAt: fixedDate.toISOString(),
      },
    ];

    const codes = generateNextArrivalCodes(minumanGroup, existingBatches, [], fixedDate);
    expect(codes.arrivalId).toBe("RCV-MNM-261126-02");
    expect(codes.batchCode).toBe("LOT-MNM-261126-02");
    expect(codes.suggestedExpiryDate).toBe("2027-02-24");
  });

  it("creates new-product and restock arrival QR records and round-trips WACRM-IN payloads cleanly", () => {
    const newLabel = createArrivalQrLabelRecord(
      {
        group: minumanGroup,
        productName: "Matcha Ceremonial Uji 250gr",
        qty: 20,
        costPrice: 95_000,
        unitPrice: 149_000,
        stickerCopies: 5,
        supplierName: "CV Teh Nusantara",
      },
      SAMPLE_PRODUCTS,
      [],
      [],
      fixedDate,
    );

    expect(newLabel.isNewMasterProduct).toBe(true);
    expect(newLabel.sku).toBe("MNM-2611-002");
    expect(newLabel.batchCode).toBe("LOT-MNM-261126-01");
    expect(newLabel.expiryDate).toBe("2027-02-24");
    expect(newLabel.rackLocation).toBe("Rak B-1");
    expect(newLabel.unit).toBe("pack");
    expect(newLabel.status).toBe("generated_ready");

    const parsed = parseScannedQrCode(newLabel.qrPayload);
    expect(parsed.kind).toBe("arrival_label");
    expect(parsed.arrivalId).toBe(newLabel.id);
    expect(parsed.groupCode).toBe("MNM");
    expect(parsed.sku).toBe("MNM-2611-002");
    expect(parsed.batchCode).toBe("LOT-MNM-261126-01");
    expect(parsed.expiryDate).toBe("2027-02-24");
    expect(parsed.qty).toBe(20);
    expect(parsed.unitCostIdr).toBe(95_000);

    // Restock existing product
    const restockLabel = createArrivalQrLabelRecord(
      {
        group: minumanGroup,
        productName: SAMPLE_PRODUCTS[0].name,
        existingProduct: SAMPLE_PRODUCTS[0],
        qty: 30,
        costPrice: 76_000,
        unitPrice: 125_000,
      },
      SAMPLE_PRODUCTS,
      [],
      [newLabel],
      fixedDate,
    );
    expect(restockLabel.isNewMasterProduct).toBe(false);
    expect(restockLabel.existingProductId).toBe("prod-1");
    expect(restockLabel.sku).toBe("MNM-2611-001");
    expect(restockLabel.id).toBe("RCV-MNM-261126-02");
  });

  it("keeps backward compatibility with WACRM-ITEM, INV-*, and raw SKU codes", () => {
    const manualIn = encodeArrivalQrPayload({
      arrivalId: "RCV-GRO-261126-01",
      groupCode: "GRO",
      sku: "GRO-2611-001",
      batchCode: "LOT-GRO-261126-01",
      qty: 12,
    });
    expect(parseScannedQrCode(manualIn).kind).toBe("arrival_label");
    expect(parseScannedQrCode("WACRM-ITEM|SKU:KOPI-01|LOT:LOT-A1|EXP:2027-01-01").kind).toBe("batch_item");
    expect(parseScannedQrCode("INV-2026-0042").kind).toBe("invoice_shipment");
    expect(parseScannedQrCode("SKU-CUSTOM-01").kind).toBe("sku_or_barcode");
  });

  it("renders Thermal 58mm, Thermal 80mm, and A4 Grid printable sticker HTML with strict XSS escaping", () => {
    const label = createArrivalQrLabelRecord(
      {
        group: minumanGroup,
        productName: `<script>alert("xss")</script> Sirup Vanilla & Caramel`,
        qty: 10,
        costPrice: 40_000,
        unitPrice: 65_000,
        stickerCopies: 3,
      },
      SAMPLE_PRODUCTS,
      [],
      [],
      fixedDate,
    );

    const html58 = renderArrivalQrStickersPrintHtml({
      labels: [label],
      qrDataUrlById: { [label.id]: "data:image/png;base64,AAAA" },
      storeProfile: { businessName: `Toko <Berkah> & Co`, phone: "+628123" },
      layout: "thermal58",
    });
    expect(html58).toContain("size: 58mm auto");
    expect(html58).toContain("Stiker 1/3");
    expect(html58).toContain("Stiker 3/3");
    expect(html58).not.toContain("<script>alert");
    expect(html58).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");

    const html80 = renderArrivalQrStickersPrintHtml({
      labels: [label],
      qrDataUrlById: {},
      storeProfile: { businessName: "Toko Berkah", phone: "+628123" },
      layout: "thermal80",
    });
    expect(html80).toContain("size: 80mm auto");

    const htmlA4 = renderArrivalQrStickersPrintHtml({
      labels: [label],
      qrDataUrlById: {},
      storeProfile: { businessName: "Toko Berkah", phone: "+628123" },
      layout: "a4_grid",
    });
    expect(htmlA4).toContain("size: A4 portrait");
    expect(htmlA4).toContain("grid-template-columns: repeat(3, 1fr)");
  });
});

describe("End-to-End Scan-to-Integrated-System Intake (Master + ERP + POS + AI + Accounting)", () => {
  it("auto-registers a scanned new arrival QR into Master Barang, ERP Stock Movements, AI Knowledge, and Accounting, then restocks on a second arrival", async () => {
    const adapter = createDemoWorkspaceAdapter();
    const before = await adapter.loadAll();
    const initialCount = before.products.length;
    const initialEntries = before.accountingEntries.length;

    const group: MasterCategoryRecord = {
      id: "cat-skc",
      name: "Skincare & Herbal",
      description: "Perawatan herbal",
      groupCode: "SKC",
      defaultRack: "Rak C-1",
      defaultUnit: "pcs",
      defaultShelfLifeDays: 365,
      requiresExpiry: true,
      badgeColorHex: "#ec4899",
    };

    // 1. Generate arrival QR for a brand-new item not in Master Data yet
    const arrival = createArrivalQrLabelRecord(
      {
        group,
        productName: "Serum Vitamin C Organik 30ml",
        qty: 25,
        costPrice: 48_000,
        unitPrice: 99_000,
        supplierName: "PT Herbal Nusantara",
      },
      before.products,
      [],
      [],
      new Date("2026-11-26T12:00:00.000Z"),
    );

    const scanned = parseScannedQrCode(arrival.qrPayload);
    expect(scanned.kind).toBe("arrival_label");
    expect(scanned.sku).toBe("SKC-2611-001");

    // 2. Scan triggers Master Barang creation + ERP stock movement + AI Knowledge + Accounting journal
    const created = await adapter.createProduct({
      sku: arrival.sku,
      name: arrival.productName,
      category: arrival.groupName,
      description: `Scan Stiker QR [${arrival.id}] · Rak ${arrival.rackLocation}`,
      unit: arrival.unit,
      unitPrice: arrival.unitPrice,
      costPrice: arrival.costPrice,
      stockQty: arrival.qty,
      minStock: arrival.minStock,
    });

    await adapter.createAccountingEntry({
      kind: "expense",
      categoryName: "Persediaan Barang Dagang (FIFO)",
      amount: arrival.qty * arrival.costPrice,
      description: `Scan QR Barang Datang [${arrival.id}] ${arrival.productName}`,
    });

    const afterFirst = await adapter.loadAll();
    expect(afterFirst.products.length).toBe(initialCount + 1);
    const inMaster = afterFirst.products.find((p) => p.sku === "SKC-2611-001");
    expect(inMaster).toBeDefined();
    expect(inMaster?.stockQty).toBe(25);
    expect(inMaster?.category).toBe("Skincare & Herbal");
    expect(afterFirst.stockMovements.some((m) => m.sku === "SKC-2611-001" && m.quantity === 25)).toBe(true);
    expect(afterFirst.aiKnowledge.some((k) => k.title.includes("SKC-2611-001"))).toBe(true);
    expect(afterFirst.accountingEntries.length).toBeGreaterThan(initialEntries);

    // 3. Subsequent restock scan increments stock & writes ERP movement reason
    await adapter.updateProduct(created.id, {
      stockQty: created.stockQty + 15,
      stockReason: `Scan Stiker QR Barang Datang [RCV-SKC-261126-02] · Batch LOT-SKC-261126-02`,
    });

    const afterRestock = await adapter.loadAll();
    const restocked = afterRestock.products.find((p) => p.id === created.id);
    expect(restocked?.stockQty).toBe(40);
    expect(
      afterRestock.stockMovements.some(
        (m) => m.sku === "SKC-2611-001" && m.notes?.includes("RCV-SKC-261126-02"),
      ),
    ).toBe(true);
  });
});
