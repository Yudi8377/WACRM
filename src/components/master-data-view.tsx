"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Bot,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Eye,
  ImagePlus,
  Layers,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { CrudToolbar, PaginationBar } from "@/components/crud-toolbar";
import {
  formatIdr,
  LIFECYCLE_LABELS,
  PAYMENT_METHOD_LABELS,
  type ContactRecord,
  type CourierServiceTier,
  type ErpProductRecord,
  type ErpSupplierRecord,
  type LifecycleStage,
  type MasterCategoryRecord,
  type MasterCourierRecord,
  type MasterPaymentAccountRecord,
  type MasterUnitRecord,
  type PaymentMethod,
} from "@/lib/crm-types";
import { sanitizeImageUrl, sanitizePhoneDigits, sanitizeTrackingUrl } from "@/lib/security";
import {
  buildCourierKnowledgeSummary,
  deriveGroupCode,
  loadLocalMasterData,
  normalizeProductGroup,
  saveLocalMasterData,
  type LocalMasterDataState,
} from "@/lib/store-profile";
import { generateNextGroupSku } from "@/lib/fifo-inventory";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface MasterDataViewProps {
  adapter: WorkspaceAdapter;
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  contacts: ContactRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
  onOpenQrGenerator?: () => void;
}

type MasterSubTab = "products" | "suppliers" | "customers" | "categories" | "couriers" | "payments";

const PAGE_SIZE = 6;

async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
    throw new Error("Format foto tidak didukung. Gunakan PNG, JPG, atau WebP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const rawUrl = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid."));
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        const safe = sanitizeImageUrl(compressed);
        if (!safe) {
          reject(new Error("URL foto ditolak oleh filter keamanan."));
          return;
        }
        resolve(safe);
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function MasterDataView({
  adapter,
  products,
  suppliers,
  contacts,
  onRefresh,
  onToast,
  onOpenQrGenerator,
}: MasterDataViewProps) {
  const [subTab, setSubTab] = useState<MasterSubTab>("products");
  const [productLayout, setProductLayout] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localMaster, setLocalMaster] = useState<LocalMasterDataState>(() =>
    loadLocalMasterData(adapter.tenantId),
  );

  // Modal states
  const [modalMode, setModalMode] = useState<"none" | "create" | "edit">("none");
  const [viewSupplier, setViewSupplier] = useState<ErpSupplierRecord | null>(null);
  const [viewCourier, setViewCourier] = useState<MasterCourierRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingCourierAi, setSyncingCourierAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for Product (+ Card Picture & Weight)
  const [pSku, setPSku] = useState("");
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("Umum");
  const [pUnit, setPUnit] = useState("pcs");
  const [pPrice, setPPrice] = useState("0");
  const [pCost, setPCost] = useState("0");
  const [pStock, setPStock] = useState("10");
  const [pMinStock, setPMinStock] = useState("5");
  const [pWeightGrams, setPWeightGrams] = useState("500");
  const [pImageUrl, setPImageUrl] = useState<string>("");
  const [pDesc, setPDesc] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form states for Supplier
  const [sName, setSName] = useState("");
  const [sPic, setSPic] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sAddr, setSAddr] = useState("");
  const [sTerms, setSTerms] = useState("NET 14");

  // Form states for Customer
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCompany, setCCompany] = useState("");
  const [cStage, setCStage] = useState<LifecycleStage>("lead");
  const [cNotes, setCNotes] = useState("");

  // Form states for Category / Kelompok Barang & Unit
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catRack, setCatRack] = useState("Rak A-1");
  const [catDefaultUnit, setCatDefaultUnit] = useState("pcs");
  const [catRequiresExpiry, setCatRequiresExpiry] = useState(true);
  const [catShelfLifeDays, setCatShelfLifeDays] = useState("90");
  const [catBadgeColor, setCatBadgeColor] = useState("#10b981");
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");

  // Form states for Courier (Multi-tier pricing + AI logistics knowledge)
  const [curCode, setCurCode] = useState("");
  const [curName, setCurName] = useState("");
  const [curService, setCurService] = useState("Reguler");
  const [curRate, setCurRate] = useState("15000");
  const [curEta, setCurEta] = useState("2-3 hari");
  const [curCodSupported, setCurCodSupported] = useState(true);
  const [curInsuranceSupported, setCurInsuranceSupported] = useState(true);
  const [curTrackingUrl, setCurTrackingUrl] = useState("https://cekresi.com/?noresi={resi}");
  const [curPickupSchedule, setCurPickupSchedule] = useState("Senin–Sabtu 10.00 & 16.00 WIB");
  const [curCutoff, setCurCutoff] = useState("16.00 WIB");
  const [curPackaging, setCurPackaging] = useState("Bubble wrap 2 lapis + dus tebal; cairan wajib segel rapat.");
  const [curMaxDimensions, setCurMaxDimensions] = useState("60x60x60 cm (volumetrik /6000)");
  const [curClaimPolicy, setCurClaimPolicy] = useState("Klaim maksimal 2x24 jam setelah paket diterima disertai video unboxing.");
  const [curAiNotes, setCurAiNotes] = useState("");
  const [curTiers, setCurTiers] = useState<CourierServiceTier[]>([]);

  // Form states for Payment Account
  const [payMethod, setPayMethod] = useState<PaymentMethod>("bank_transfer");
  const [payProvider, setPayProvider] = useState("");
  const [payNumber, setPayNumber] = useState("");
  const [payHolder, setPayHolder] = useState("");

  function commitLocal(next: LocalMasterDataState) {
    setLocalMaster(saveLocalMasterData(adapter.tenantId, next));
  }

  function switchSubTab(next: MasterSubTab) {
    setSubTab(next);
    setSelectedId(null);
    setSearch("");
    setPage(1);
    setModalMode("none");
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPImageUrl(dataUrl);
      onToast("Card Picture berhasil dimuat & dioptimasi.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memuat gambar.", "error");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function syncCouriersToAiKnowledge(couriersToSync = localMaster.couriers) {
    setSyncingCourierAi(true);
    try {
      const activeCouriers = couriersToSync.filter((c) => c.isActive);
      const summary = buildCourierKnowledgeSummary(activeCouriers);
      await adapter.addAiKnowledge({
        sourceType: "sop",
        title: `Pengetahuan Kurir & Tarif Pengiriman (${activeCouriers.length} Ekspedisi Aktif)`,
        content: summary,
        tags: ["kurir", "ekspedisi", "ongkir", "pengiriman", "cod", "asuransi"],
      });
      await adapter.runAiKnowledgeSync();
      await onRefresh();
      onToast(`Pengetahuan ${activeCouriers.length} kurir & tarif ongkir berhasil disinkronkan ke Multi-Agent AI!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyinkronkan pengetahuan kurir ke AI.", "error");
    } finally {
      setSyncingCourierAi(false);
    }
  }

  const q = search.trim().toLowerCase();

  const filteredProducts = products.filter(
    (p) => !q || `${p.sku} ${p.name} ${p.category}`.toLowerCase().includes(q),
  );
  const filteredSuppliers = suppliers.filter(
    (s) => !q || `${s.name} ${s.contactPerson ?? ""} ${s.phone ?? ""} ${s.address ?? ""}`.toLowerCase().includes(q),
  );
  const filteredContacts = contacts.filter(
    (c) => !q || `${c.displayName} ${c.phoneE164 ?? ""} ${c.company ?? ""}`.toLowerCase().includes(q),
  );
  const filteredCategories = localMaster.categories.filter(
    (c) => !q || `${c.name} ${c.description}`.toLowerCase().includes(q),
  );
  const filteredCouriers = localMaster.couriers.filter(
    (c) =>
      !q ||
      `${c.code} ${c.name} ${c.serviceType} ${c.pickupSchedule ?? ""} ${(c.serviceTiers ?? []).map((t) => `${t.serviceName} ${t.coverageZones}`).join(" ")}`
        .toLowerCase()
        .includes(q),
  );
  const filteredPayments = localMaster.paymentAccounts.filter(
    (p) => !q || `${p.providerName} ${p.accountNumber} ${p.accountHolder}`.toLowerCase().includes(q),
  );

  const totalCurrent =
    subTab === "products"
      ? filteredProducts.length
      : subTab === "suppliers"
        ? filteredSuppliers.length
        : subTab === "customers"
          ? filteredContacts.length
          : subTab === "categories"
            ? filteredCategories.length
            : subTab === "couriers"
              ? filteredCouriers.length
              : filteredPayments.length;

  const startIdx = (page - 1) * PAGE_SIZE;

  function openCreateModal() {
    setPSku("");
    setPName("");
    setPCategory(localMaster.categories[0]?.name ?? "Umum");
    setPUnit(localMaster.units[0]?.code ?? "pcs");
    setPPrice("");
    setPCost("");
    setPStock("20");
    setPMinStock("5");
    setPWeightGrams("500");
    setPImageUrl("");
    setPDesc("");

    setSName("");
    setSPic("");
    setSPhone("");
    setSEmail("");
    setSAddr("");
    setSTerms("NET 14");

    setCName("");
    setCPhone("");
    setCEmail("");
    setCCompany("");
    setCStage("lead");
    setCNotes("");

    setCatName("");
    setCatDesc("");
    setCatCode("");
    setCatRack(`Rak ${String.fromCharCode(65 + (localMaster.categories.length % 6))}-1`);
    setCatDefaultUnit(localMaster.units[0]?.code ?? "pcs");
    setCatRequiresExpiry(true);
    setCatShelfLifeDays("90");
    setCatBadgeColor("#10b981");
    setUnitCode("");
    setUnitName("");

    setCurCode("");
    setCurName("");
    setCurService("Reguler & Express");
    setCurRate("18000");
    setCurEta("2-3 hari");
    setCurCodSupported(true);
    setCurInsuranceSupported(true);
    setCurTrackingUrl("https://cekresi.com/?noresi={resi}");
    setCurPickupSchedule("Senin–Sabtu 10.00 & 16.00 WIB");
    setCurCutoff("16.00 WIB");
    setCurPackaging("Bubble wrap 2 lapis + dus kuat; barang pecah belah wajib packing kayu.");
    setCurMaxDimensions("60x60x60 cm (volumetrik /6000)");
    setCurClaimPolicy("Klaim maksimal 2x24 jam disertai foto resi & video unboxing.");
    setCurAiNotes("");
    setCurTiers([
      {
        id: `tier-${Date.now()}-1`,
        serviceName: "Reguler",
        ratePerKg: 18000,
        minWeightKg: 1,
        maxWeightKg: 50,
        estimatedDays: "2-3 hari",
        coverageZones: "Seluruh Indonesia",
        codSupported: true,
        codFeePct: 3,
        insuranceAvailable: true,
        insuranceFeePct: 0.2,
      },
      {
        id: `tier-${Date.now()}-2`,
        serviceName: "Express / Kilat",
        ratePerKg: 30000,
        minWeightKg: 1,
        maxWeightKg: 30,
        estimatedDays: "1 hari",
        coverageZones: "Kota besar Jawa, Bali & Sumatera",
        codSupported: false,
        codFeePct: 0,
        insuranceAvailable: true,
        insuranceFeePct: 0.2,
      },
    ]);

    setPayMethod("bank_transfer");
    setPayProvider("");
    setPayNumber("");
    setPayHolder("");

    setModalMode("create");
  }

  function openEditModal(overrideId?: string) {
    const id = overrideId ?? selectedId;
    if (!id) return;
    setSelectedId(id);

    if (subTab === "products") {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      setPSku(p.sku);
      setPName(p.name);
      setPCategory(p.category);
      setPUnit(p.unit);
      setPPrice(String(p.unitPrice));
      setPCost(String(p.costPrice));
      setPStock(String(p.stockQty));
      setPMinStock(String(p.minStock));
      setPWeightGrams(String(p.weightGrams ?? 500));
      setPImageUrl(p.imageUrl ?? "");
      setPDesc(p.description);
    } else if (subTab === "suppliers") {
      const s = suppliers.find((x) => x.id === id);
      if (!s) return;
      setSName(s.name);
      setSPic(s.contactPerson ?? "");
      setSPhone(s.phone ?? "");
      setSEmail(s.email ?? "");
      setSAddr(s.address ?? "");
      setSTerms(s.paymentTerms);
    } else if (subTab === "customers") {
      const c = contacts.find((x) => x.id === id);
      if (!c) return;
      setCName(c.displayName);
      setCPhone(c.phoneE164 ?? "");
      setCEmail(c.email ?? "");
      setCCompany(c.company ?? "");
      setCStage(c.lifecycleStage);
      setCNotes(c.notes ?? "");
    } else if (subTab === "categories") {
      const cat = localMaster.categories.find((x) => x.id === id);
      if (!cat) return;
      const norm = normalizeProductGroup(cat);
      setCatName(norm.name);
      setCatDesc(norm.description);
      setCatCode(norm.groupCode);
      setCatRack(norm.defaultRack);
      setCatDefaultUnit(norm.defaultUnit);
      setCatRequiresExpiry(norm.requiresExpiry);
      setCatShelfLifeDays(String(norm.defaultShelfLifeDays));
      setCatBadgeColor(norm.badgeColorHex);
    } else if (subTab === "couriers") {
      const cur = localMaster.couriers.find((x) => x.id === id);
      if (!cur) return;
      setCurCode(cur.code);
      setCurName(cur.name);
      setCurService(cur.serviceType);
      setCurRate(String(cur.baseRate));
      setCurEta(cur.estimatedDays);
      setCurCodSupported(Boolean(cur.codSupported));
      setCurInsuranceSupported(Boolean(cur.insuranceSupported ?? true));
      setCurTrackingUrl(cur.trackingUrlTemplate ?? "https://cekresi.com/?noresi={resi}");
      setCurPickupSchedule(cur.pickupSchedule ?? "");
      setCurCutoff(cur.cutoffTime ?? "");
      setCurPackaging(cur.packagingNotes ?? "");
      setCurMaxDimensions(cur.maxDimensionsCm ?? "");
      setCurClaimPolicy(cur.claimPolicy ?? "");
      setCurAiNotes(cur.aiShippingNotes ?? "");
      setCurTiers(
        cur.serviceTiers && cur.serviceTiers.length > 0
          ? cur.serviceTiers
          : [
              {
                id: `${cur.id}-default`,
                serviceName: cur.serviceType || "Reguler",
                ratePerKg: cur.baseRate,
                minWeightKg: 1,
                maxWeightKg: 50,
                estimatedDays: cur.estimatedDays,
                coverageZones: "Seluruh Indonesia",
                codSupported: Boolean(cur.codSupported),
                codFeePct: cur.codSupported ? 3 : 0,
                insuranceAvailable: Boolean(cur.insuranceSupported ?? true),
                insuranceFeePct: 0.2,
              },
            ],
      );
    } else if (subTab === "payments") {
      const pay = localMaster.paymentAccounts.find((x) => x.id === id);
      if (!pay) return;
      setPayMethod(pay.method);
      setPayProvider(pay.providerName);
      setPayNumber(pay.accountNumber);
      setPayHolder(pay.accountHolder);
    }

    setModalMode("edit");
  }

  function addCourierTier() {
    setCurTiers((prev) => [
      ...prev,
      {
        id: `tier-${Date.now()}-${prev.length + 1}`,
        serviceName: "Paket Baru",
        ratePerKg: Number(curRate) || 15000,
        minWeightKg: 1,
        maxWeightKg: 50,
        estimatedDays: "2-3 hari",
        coverageZones: "Seluruh Indonesia",
        codSupported: curCodSupported,
        codFeePct: curCodSupported ? 3 : 0,
        insuranceAvailable: curInsuranceSupported,
        insuranceFeePct: 0.2,
      },
    ]);
  }

  function updateCourierTier(tierId: string, patch: Partial<CourierServiceTier>) {
    setCurTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, ...patch } : t)));
  }

  function removeCourierTier(tierId: string) {
    setCurTiers((prev) => prev.filter((t) => t.id !== tierId));
  }

  async function handleDelete(overrideId?: string) {
    const id = overrideId ?? selectedId;
    if (!id) return;
    if (!window.confirm("Yakin ingin menghapus data Master ini?")) return;

    try {
      if (subTab === "products") {
        await adapter.deleteProduct(id);
        await onRefresh();
      } else if (subTab === "suppliers") {
        if (adapter.deleteSupplier) {
          await adapter.deleteSupplier(id);
          await onRefresh();
        } else {
          onToast("Penghapusan supplier tidak tersedia di mode ini.", "error");
          return;
        }
      } else if (subTab === "customers") {
        await adapter.deleteContact(id);
        await onRefresh();
      } else if (subTab === "categories") {
        commitLocal({
          ...localMaster,
          categories: localMaster.categories.filter((c) => c.id !== id),
        });
      } else if (subTab === "couriers") {
        commitLocal({
          ...localMaster,
          couriers: localMaster.couriers.filter((c) => c.id !== id),
        });
      } else if (subTab === "payments") {
        commitLocal({
          ...localMaster,
          paymentAccounts: localMaster.paymentAccounts.filter((p) => p.id !== id),
        });
      }
      setSelectedId(null);
      onToast("Data berhasil dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus data.", "error");
    }
  }

  async function handleSubmitModal(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (subTab === "products") {
        const sanitizedPhoto = pImageUrl.trim() ? sanitizeImageUrl(pImageUrl.trim()) : null;
        if (pImageUrl.trim() && !sanitizedPhoto) {
          onToast("URL Card Picture tidak valid atau tidak aman (gunakan HTTPS atau upload gambar).", "error");
          setSaving(false);
          return;
        }
        if (modalMode === "create") {
          await adapter.createProduct({
            sku: pSku.trim().toUpperCase(),
            name: pName.trim(),
            category: pCategory.trim() || "Umum",
            unit: pUnit.trim() || "pcs",
            unitPrice: Number(pPrice) || 0,
            costPrice: Number(pCost) || 0,
            stockQty: Number(pStock) || 0,
            minStock: Number(pMinStock) || 5,
            weightGrams: Math.max(10, Number(pWeightGrams) || 500),
            imageUrl: sanitizedPhoto,
            description: pDesc.trim(),
          });
          onToast("Master Barang + Card Picture berhasil ditambahkan & disinkronkan ke POS + AI.");
        } else if (selectedId) {
          await adapter.updateProduct(selectedId, {
            name: pName.trim(),
            category: pCategory.trim() || "Umum",
            unit: pUnit.trim() || "pcs",
            unitPrice: Number(pPrice) || 0,
            costPrice: Number(pCost) || 0,
            stockQty: Number(pStock) || 0,
            minStock: Number(pMinStock) || 5,
            weightGrams: Math.max(10, Number(pWeightGrams) || 500),
            imageUrl: sanitizedPhoto,
            description: pDesc.trim(),
          });
          onToast("Master Barang & Card Picture diperbarui.");
        }
        await onRefresh();
      } else if (subTab === "suppliers") {
        if (modalMode === "create") {
          await adapter.createSupplier({
            name: sName.trim(),
            contactPerson: sPic.trim() || undefined,
            phone: sPhone.trim() || undefined,
            email: sEmail.trim() || undefined,
            address: sAddr.trim() || undefined,
            paymentTerms: sTerms.trim() || "NET 14",
          });
          onToast("Master Supplier baru ditambahkan.");
        } else if (selectedId && adapter.updateSupplier) {
          await adapter.updateSupplier(selectedId, {
            name: sName.trim(),
            contactPerson: sPic.trim(),
            phone: sPhone.trim(),
            email: sEmail.trim(),
            address: sAddr.trim(),
            paymentTerms: sTerms.trim() || "NET 14",
          });
          onToast("Master Supplier diperbarui.");
        }
        await onRefresh();
      } else if (subTab === "customers") {
        if (modalMode === "create") {
          await adapter.createContact({
            displayName: cName.trim(),
            phoneE164: cPhone.trim() || undefined,
            email: cEmail.trim() || undefined,
            company: cCompany.trim() || undefined,
            lifecycleStage: cStage,
            notes: cNotes.trim() || undefined,
            tags: [cStage],
          });
          onToast("Master Pelanggan baru ditambahkan.");
        } else if (selectedId) {
          await adapter.updateContact(selectedId, {
            displayName: cName.trim(),
            phoneE164: cPhone.trim() || null,
            email: cEmail.trim() || null,
            company: cCompany.trim() || null,
            lifecycleStage: cStage,
            notes: cNotes.trim() || null,
          });
          onToast("Master Pelanggan diperbarui.");
        }
        await onRefresh();
      } else if (subTab === "categories") {
        const shelfLife = catRequiresExpiry ? Math.max(1, Number(catShelfLifeDays) || 90) : 0;
        const record: MasterCategoryRecord = normalizeProductGroup({
          id: modalMode === "edit" && selectedId ? selectedId : `cat-${Date.now()}`,
          name: catName.trim(),
          description: catDesc.trim(),
          groupCode: deriveGroupCode(catName.trim(), catCode),
          defaultRack: catRack.trim() || "Rak A-1",
          defaultUnit: catDefaultUnit.trim() || "pcs",
          requiresExpiry: catRequiresExpiry,
          defaultShelfLifeDays: shelfLife,
          badgeColorHex: catBadgeColor || "#10b981",
        });
        const nextCats =
          modalMode === "edit"
            ? localMaster.categories.map((c) => (c.id === record.id ? record : c))
            : [record, ...localMaster.categories];
        const nextUnits: MasterUnitRecord[] =
          unitCode.trim() && unitName.trim()
            ? [
                { id: `u-${Date.now()}`, code: unitCode.trim().toLowerCase(), name: unitName.trim() },
                ...localMaster.units,
              ]
            : localMaster.units;
        commitLocal({ ...localMaster, categories: nextCats, units: nextUnits });
        onToast(`Kelompok Barang [${record.groupCode}] ${record.name} tersimpan & siap untuk Auto-QR!`);
      } else if (subTab === "couriers") {
        const cleanedTiers = curTiers.filter((t) => t.serviceName.trim().length > 0);
        const lowestTierRate =
          cleanedTiers.length > 0
            ? Math.min(...cleanedTiers.map((t) => Math.max(0, Number(t.ratePerKg) || 0)))
            : Math.max(0, Number(curRate) || 0);
        const safeTrack =
          sanitizeTrackingUrl(curTrackingUrl, "SAMPLE123")
            ? curTrackingUrl.trim()
            : "https://cekresi.com/?noresi={resi}";
        const record: MasterCourierRecord = {
          id: modalMode === "edit" && selectedId ? selectedId : `cur-${Date.now()}`,
          code: curCode.trim().toUpperCase(),
          name: curName.trim(),
          serviceType:
            cleanedTiers.length > 0
              ? cleanedTiers.map((t) => t.serviceName).join(" / ")
              : curService.trim() || "Reguler",
          baseRate: lowestTierRate,
          estimatedDays: cleanedTiers[0]?.estimatedDays || curEta.trim() || "2-3 hari",
          codSupported: curCodSupported || cleanedTiers.some((t) => t.codSupported),
          insuranceSupported: curInsuranceSupported || cleanedTiers.some((t) => t.insuranceAvailable),
          trackingUrlTemplate: safeTrack,
          isActive: true,
          serviceTiers: cleanedTiers,
          pickupSchedule: curPickupSchedule.trim() || undefined,
          cutoffTime: curCutoff.trim() || undefined,
          packagingNotes: curPackaging.trim() || undefined,
          maxDimensionsCm: curMaxDimensions.trim() || undefined,
          claimPolicy: curClaimPolicy.trim() || undefined,
          aiShippingNotes: curAiNotes.trim() || undefined,
        };
        const nextCouriers =
          modalMode === "edit"
            ? localMaster.couriers.map((c) => (c.id === record.id ? record : c))
            : [record, ...localMaster.couriers];
        commitLocal({ ...localMaster, couriers: nextCouriers });
        // Automatically enrich Multi-Agent AI knowledge with updated courier tariffs & rules
        await adapter.addAiKnowledge({
          sourceType: "sop",
          title: `Kurir ${record.name} (${record.code}) — Tarif & Kebijakan Pengiriman`,
          content: buildCourierKnowledgeSummary([record]),
          tags: ["kurir", record.code.toLowerCase(), record.name.toLowerCase(), "ongkir", "pengiriman"],
        });
        await onRefresh();
        onToast(`Master Kurir ${record.name} disimpan & otomatis memperkaya kecerdasan Multi-Agent AI!`);
      } else if (subTab === "payments") {
        const record: MasterPaymentAccountRecord = {
          id: modalMode === "edit" && selectedId ? selectedId : `pay-${Date.now()}`,
          method: payMethod,
          providerName: payProvider.trim(),
          accountNumber: payNumber.trim(),
          accountHolder: payHolder.trim(),
          isActive: true,
        };
        const next =
          modalMode === "edit"
            ? localMaster.paymentAccounts.map((p) => (p.id === record.id ? record : p))
            : [record, ...localMaster.paymentAccounts];
        commitLocal({ ...localMaster, paymentAccounts: next });
        onToast("Master Rekening Pembayaran disimpan.");
      }
      setModalMode("none");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan data Master.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Master Data Usaha</h2>
          <p className="text-xs text-slate-400">
            Kelola data induk Barang (+ Card Picture), Supplier (+ View Detail), Pelanggan, Kelompok Barang &amp; Aturan Auto-QR/FIFO, Kurir Ekspedisi (+ Pilihan Ongkir &amp; Pengetahuan AI), serta Rekening Bayar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenQrGenerator && (
            <button
              type="button"
              onClick={onOpenQrGenerator}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              <QrCode className="h-3.5 w-3.5" />
              Generator QR Barang Datang
            </button>
          )}

          {subTab === "products" && (
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setProductLayout("cards")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  productLayout === "cards"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Card Picture
              </button>
              <button
                type="button"
                onClick={() => setProductLayout("table")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  productLayout === "table"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Tabel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-module Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "products" as const, label: `Barang (${products.length})`, icon: Boxes },
          { id: "suppliers" as const, label: `Supplier (${suppliers.length})`, icon: Building2 },
          { id: "customers" as const, label: `Pelanggan (${contacts.length})`, icon: Users },
          { id: "categories" as const, label: `Kelompok Barang & Satuan (${localMaster.categories.length})`, icon: Layers },
          { id: "couriers" as const, label: `Kurir Ekspedisi (${localMaster.couriers.length})`, icon: Truck },
          { id: "payments" as const, label: `Rekening Bayar (${localMaster.paymentAccounts.length})`, icon: CreditCard },
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchSubTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Courier AI Knowledge Enrichment Banner */}
      {subTab === "couriers" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Pengetahuan Logistik &amp; Pilihan Biaya Kirim Terhubung ke Multi-Agent AI
              </h3>
              <p className="mt-0.5 max-w-2xl text-xs text-slate-300">
                Setiap tarif layanan per kg, kebijakan COD, cut-off pickup, asuransi, volumetrik, dan batas gratis ongkir di sini otomatis dipakai oleh AI CS saat menjawab pertanyaan ongkir pelanggan &amp; menghitung ongkir pada POS/QR otomatis.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={syncingCourierAi}
            onClick={() => void syncCouriersToAiKnowledge()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-cyan-400 disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${syncingCourierAi ? "animate-spin" : ""}`} />
            {syncingCourierAi ? "Menyinkronkan..." : "Sinkronkan ke Pengetahuan AI"}
          </button>
        </div>
      )}

      {/* Standard Business CRUD Toolbar */}
      <CrudToolbar
        dark
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari di Master Data..."
        onAddNew={openCreateModal}
        addNewLabel="Tambah Baru"
        hasSelection={Boolean(selectedId)}
        onEditSelected={() => openEditModal()}
        onDeleteSelected={() => void handleDelete()}
        onRefresh={() => void onRefresh()}
      />

      {/* PRODUCTS: CARD PICTURE GRID OR TABLE */}
      {subTab === "products" && productLayout === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.slice(startIdx, startIdx + PAGE_SIZE).map((p) => {
            const safeImg = sanitizeImageUrl(p.imageUrl);
            const lowStock = p.stockQty <= p.minStock;
            const marginPct =
              p.unitPrice > 0 ? Math.round(((p.unitPrice - p.costPrice) / p.unitPrice) * 100) : 0;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`group cursor-pointer overflow-hidden rounded-2xl border transition ${
                  selectedId === p.id
                    ? "border-emerald-400 bg-slate-900 ring-2 ring-emerald-500/30"
                    : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
                }`}
              >
                {/* Card Picture Area */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                  {safeImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeImg}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 p-4 text-center">
                      <ImagePlus className="h-8 w-8 text-slate-600" />
                      <span className="mt-1.5 text-[11px] font-medium text-slate-500">
                        Belum ada Card Picture
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(p.id);
                        }}
                        className="mt-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-slate-800"
                      >
                        + Unggah Foto Produk
                      </button>
                    </div>
                  )}
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    <span className="rounded-lg bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 backdrop-blur-xs">
                      {p.sku}
                    </span>
                    <span className="rounded-lg bg-slate-950/85 px-2 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur-xs">
                      {p.category}
                    </span>
                  </div>
                  <span
                    className={`absolute right-2.5 top-2.5 rounded-lg px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs ${
                      lowStock
                        ? "bg-rose-600/90 text-white"
                        : "bg-emerald-600/90 text-white"
                    }`}
                  >
                    Stok: {p.stockQty} {p.unit}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <h3 className="truncate text-sm font-bold text-white">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] text-slate-400">
                    {p.description || "Produk aktif tersinkronisasi otomatis ke POS & Katalog AI."}
                  </p>
                  <div className="mt-3 flex items-end justify-between border-t border-slate-800 pt-3">
                    <div>
                      <div className="text-[10px] text-slate-500">
                        HPP {formatIdr(p.costPrice)} · Margin {marginPct}% · {p.weightGrams ?? 500}g
                      </div>
                      <div className="text-base font-extrabold text-emerald-400">
                        {formatIdr(p.unitPrice)}
                        <span className="text-[11px] font-normal text-slate-400">/{p.unit}</span>
                      </div>
                    </div>
                    <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(p.id)}
                        className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(p.id)}
                        className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
              Tidak ada barang yang cocok dengan pencarian Anda.
            </div>
          )}
        </div>
      )}

      {/* Data Table per Sub-Module */}
      {(subTab !== "products" || productLayout === "table") && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
          {subTab === "products" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-right">Harga Jual</th>
                  <th className="px-4 py-3 text-right">Berat</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProducts.slice(startIdx, startIdx + PAGE_SIZE).map((p) => {
                  const safeImg = sanitizeImageUrl(p.imageUrl);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer transition ${
                        selectedId === p.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        {safeImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={safeImg}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg border border-slate-700 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-600">
                            <ImagePlus className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">{p.sku}</td>
                      <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                      <td className="px-4 py-3 text-slate-300">{p.category}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatIdr(p.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{p.weightGrams ?? 500} g</td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 font-bold text-white">
                          {p.stockQty} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openEditModal(p.id)}
                            className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(p.id)}
                            className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {subTab === "suppliers" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nama Supplier</th>
                  <th className="px-4 py-3">PIC</th>
                  <th className="px-4 py-3">Telepon / Email</th>
                  <th className="px-4 py-3">Termin</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSuppliers.slice(startIdx, startIdx + PAGE_SIZE).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer transition ${
                      selectedId === s.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-white">
                      {s.name}
                      <div className="text-[11px] font-normal text-slate-400">{s.address ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.contactPerson ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div>{s.phone ?? "-"}</div>
                      <div className="text-[11px] text-slate-400">{s.email ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">{s.paymentTerms}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setViewSupplier(s)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(s.id)}
                          className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(s.id)}
                          className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === "customers" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nama Pelanggan</th>
                  <th className="px-4 py-3">Telepon / WA</th>
                  <th className="px-4 py-3">Perusahaan / Toko</th>
                  <th className="px-4 py-3">Tahap</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredContacts.slice(startIdx, startIdx + PAGE_SIZE).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`cursor-pointer transition ${
                      selectedId === c.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-white">{c.displayName}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{c.phoneE164 ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{c.company ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        {LIFECYCLE_LABELS[c.lifecycleStage].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditModal(c.id)}
                          className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === "categories" && (
            <div className="divide-y divide-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-500/5 px-4 py-3 text-xs text-slate-300">
                <div>
                  <span className="font-bold text-emerald-300">Integrasi Kelompok Barang → Auto-QR &amp; FIFO Gudang:</span>{" "}
                  Setiap Kelompok Barang otomatis membentuk prefix kode SKU, Rak Gudang default, dan tanggal kadaluwarsa FIFO saat Anda membuat stiker QR Barang Datang.
                </div>
                {onOpenQrGenerator && (
                  <button
                    type="button"
                    onClick={onOpenQrGenerator}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Buat &amp; Cetak Stiker QR Barang Datang
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Kode &amp; Kelompok Barang</th>
                    <th className="px-4 py-3">Rak &amp; Satuan Default</th>
                    <th className="px-4 py-3">Aturan FIFO / Expired</th>
                    <th className="px-4 py-3">Contoh Auto-SKU Berikutnya</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredCategories.slice(startIdx, startIdx + PAGE_SIZE).map((cat, idx) => {
                    const norm = normalizeProductGroup(cat, idx);
                    const nextSku = generateNextGroupSku(norm, products);
                    const itemCount = products.filter(
                      (p) => p.category.toLowerCase() === norm.name.toLowerCase(),
                    ).length;
                    return (
                      <tr
                        key={cat.id}
                        onClick={() => setSelectedId(cat.id)}
                        className={`cursor-pointer ${selectedId === cat.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="rounded-md px-2 py-0.5 font-mono text-[10px] font-extrabold text-white"
                              style={{ backgroundColor: norm.badgeColorHex }}
                            >
                              {norm.groupCode}
                            </span>
                            <div>
                              <div className="font-bold text-white">
                                {norm.name}{" "}
                                <span className="ml-1 text-[10px] font-normal text-slate-400">
                                  ({itemCount} produk)
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">{norm.description || "Kelompok barang master"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <div className="font-semibold text-cyan-300">{norm.defaultRack}</div>
                          <div className="text-[11px] text-slate-400">Satuan: {norm.defaultUnit}</div>
                        </td>
                        <td className="px-4 py-3">
                          {norm.requiresExpiry ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                              FEFO Anti-Basi · {norm.defaultShelfLifeDays} hari
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                              Non-Expired (FIFO Masuk)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-emerald-300">{nextSku}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => openEditModal(cat.id)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">Ubah</button>
                            <button type="button" onClick={() => void handleDelete(cat.id)} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4">
                <div className="text-xs font-bold text-slate-300">Satuan Barang Terdaftar:</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {localMaster.units.map((u) => (
                    <span key={u.id} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] text-cyan-300">
                      <strong>{u.code}</strong> · {u.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subTab === "couriers" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Kode &amp; Ekspedisi</th>
                  <th className="px-4 py-3">Pilihan Biaya Pengiriman (Multi-Layanan)</th>
                  <th className="px-4 py-3">COD &amp; Cut-Off Pickup</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCouriers.slice(startIdx, startIdx + PAGE_SIZE).map((cur) => {
                  const tiers = cur.serviceTiers ?? [];
                  return (
                    <tr
                      key={cur.id}
                      onClick={() => setSelectedId(cur.id)}
                      className={`cursor-pointer ${selectedId === cur.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                            {cur.code}
                          </span>
                          <span className="font-bold text-white">{cur.name}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {cur.pickupSchedule ?? "Pickup harian Senin–Sabtu"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {tiers.length > 0 ? (
                            tiers.map((tier) => (
                              <span
                                key={tier.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                              >
                                <span className="font-semibold text-white">{tier.serviceName}:</span>
                                <span className="font-bold text-emerald-400">
                                  {formatIdr(tier.ratePerKg)}/kg
                                </span>
                                <span className="text-slate-400">({tier.estimatedDays})</span>
                              </span>
                            ))
                          ) : (
                            <span className="font-semibold text-emerald-400">
                              {cur.serviceType}: {formatIdr(cur.baseRate)}/kg ({cur.estimatedDays})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div>
                          {cur.codSupported ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              COD Aktif
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                              Non-COD
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Cut-off: {cur.cutoffTime ?? "16.00 WIB"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setViewCourier(cur)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          <button type="button" onClick={() => openEditModal(cur.id)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">Ubah</button>
                          <button type="button" onClick={() => void handleDelete(cur.id)} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {subTab === "payments" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Bank / Penyedia</th>
                  <th className="px-4 py-3">Nomor Rekening / ID</th>
                  <th className="px-4 py-3">Atas Nama</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPayments.slice(startIdx, startIdx + PAGE_SIZE).map((pay) => (
                  <tr
                    key={pay.id}
                    onClick={() => setSelectedId(pay.id)}
                    className={`cursor-pointer ${selectedId === pay.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"}`}
                  >
                    <td className="px-4 py-3 font-semibold text-cyan-300">{PAYMENT_METHOD_LABELS[pay.method]}</td>
                    <td className="px-4 py-3 font-bold text-white">{pay.providerName}</td>
                    <td className="px-4 py-3 font-mono text-emerald-300">{pay.accountNumber}</td>
                    <td className="px-4 py-3 text-slate-300">{pay.accountHolder}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => openEditModal(pay.id)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">Ubah</button>
                        <button type="button" onClick={() => void handleDelete(pay.id)} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Back / Next Pagination */}
      <PaginationBar
        dark
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={totalCurrent}
        onPageChange={setPage}
      />

      {/* VIEW SUPPLIER DETAIL MODAL */}
      {viewSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{viewSupplier.name}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                        viewSupplier.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {viewSupplier.status === "active" ? "Supplier Aktif" : "Nonaktif"}
                    </span>
                    <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 font-semibold text-cyan-300">
                      Termin: {viewSupplier.paymentTerms}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSupplier(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <User className="h-3.5 w-3.5 text-cyan-400" />
                    PIC / Kontak Utama
                  </div>
                  <div className="mt-1 font-semibold text-white">
                    {viewSupplier.contactPerson || "Belum diisi"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    Telepon / WhatsApp
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 font-mono font-semibold text-white">
                    <span>{viewSupplier.phone || "Belum diisi"}</span>
                    {viewSupplier.phone && sanitizePhoneDigits(viewSupplier.phone) && (
                      <a
                        href={`https://wa.me/${sanitizePhoneDigits(viewSupplier.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-emerald-600 px-2 py-0.5 font-sans text-[10px] font-bold text-white hover:bg-emerald-500"
                      >
                        Chat WA
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-cyan-400" />
                    Email Bisnis
                  </div>
                  <div className="mt-1 truncate font-semibold text-white">
                    {viewSupplier.email ? (
                      <a href={`mailto:${viewSupplier.email}`} className="text-cyan-300 hover:underline">
                        {viewSupplier.email}
                      </a>
                    ) : (
                      "Belum diisi"
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    Terdaftar Sejak
                  </div>
                  <div className="mt-1 font-semibold text-white">
                    {new Date(viewSupplier.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  Alamat Gudang / Kantor Supplier
                </div>
                <div className="mt-1 leading-relaxed text-slate-200">
                  {viewSupplier.address || "Belum ada alamat gudang yang dicatat."}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-300">
                <strong className="text-emerald-300">ID Supplier:</strong>{" "}
                <span className="font-mono text-slate-400">{viewSupplier.id}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  const id = viewSupplier.id;
                  setViewSupplier(null);
                  openEditModal(id);
                }}
                className="rounded-xl bg-cyan-500/20 px-4 py-2 font-bold text-cyan-300 hover:bg-cyan-500/30"
              >
                Ubah Data Supplier
              </button>
              <button
                type="button"
                onClick={() => setViewSupplier(null)}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW COURIER DETAIL & AI KNOWLEDGE MODAL */}
      {viewCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {viewCourier.name} ({viewCourier.code})
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewCourier.pickupSchedule ?? "Pickup harian"} · Cut-off: {viewCourier.cutoffTime ?? "16.00 WIB"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewCourier(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <h4 className="mb-2 font-bold text-cyan-300">Pilihan Paket &amp; Biaya Pengiriman</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(viewCourier.serviceTiers ?? []).map((tier) => (
                    <div
                      key={tier.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/90 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{tier.serviceName}</span>
                        <span className="font-mono text-[10px] text-cyan-400">
                          {tier.minWeightKg}–{tier.maxWeightKg} kg
                        </span>
                      </div>
                      <div className="mt-1 text-base font-extrabold text-emerald-400">
                        {formatIdr(tier.ratePerKg)}
                        <span className="text-[11px] font-normal text-slate-400">/kg</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-300">
                        Estimasi: {tier.estimatedDays}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-semibold ${
                            tier.codSupported
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {tier.codSupported ? `COD (${tier.codFeePct}%)` : "Non-COD"}
                        </span>
                        {tier.insuranceAvailable && (
                          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-semibold text-cyan-300">
                            Asuransi {tier.insuranceFeePct}%
                          </span>
                        )}
                        {tier.coverageZones && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                            {tier.coverageZones}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-semibold text-slate-400">Jadwal Pickup &amp; Cut-Off</div>
                  <div className="mt-1 text-slate-200">
                    {viewCourier.pickupSchedule || "-"} (Cut-off: {viewCourier.cutoffTime || "-"})
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-semibold text-slate-400">Standar Packing &amp; Dimensi Maks</div>
                  <div className="mt-1 text-slate-200">
                    {viewCourier.packagingNotes || "-"} {viewCourier.maxDimensionsCm ? `(${viewCourier.maxDimensionsCm})` : ""}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-semibold text-slate-400">Dukungan COD &amp; Asuransi</div>
                  <div className="mt-1 text-slate-200">
                    COD: {viewCourier.codSupported ? "Tersedia" : "Tidak"} · Asuransi: {viewCourier.insuranceSupported ? "Tersedia" : "Tidak"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-semibold text-slate-400">Kebijakan Klaim Paket</div>
                  <div className="mt-1 text-slate-200">{viewCourier.claimPolicy || "-"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Pratinjau Pengetahuan Multi-Agent AI
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200">
                  {buildCourierKnowledgeSummary([viewCourier])}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  const id = viewCourier.id;
                  setViewCourier(null);
                  openEditModal(id);
                }}
                className="rounded-xl bg-cyan-500/20 px-4 py-2 font-bold text-cyan-300 hover:bg-cyan-500/30"
              >
                Ubah Tarif &amp; Pengetahuan Kurir
              </button>
              <button
                type="button"
                onClick={() => setViewCourier(null)}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD SUB-MODULE FORM MODAL (Tambah Baru / Ubah) */}
      {modalMode !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">
                {modalMode === "create" ? "Tambah Baru" : "Ubah Data"} —{" "}
                {subTab === "products"
                  ? "Master Barang & Card Picture"
                  : subTab === "suppliers"
                    ? "Master Supplier"
                    : subTab === "customers"
                      ? "Master Pelanggan"
                      : subTab === "categories"
                        ? "Master Kelompok Barang & Auto-QR"
                        : subTab === "couriers"
                          ? "Master Kurir Ekspedisi & Pengetahuan AI"
                          : "Master Rekening Pembayaran"}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="mt-4 space-y-3 text-xs">
              {subTab === "products" && (
                <>
                  {/* CARD PICTURE UPLOAD & LIVE PREVIEW */}
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/80 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">Card Picture (Foto Produk)</span>
                      {pImageUrl && (
                        <button
                          type="button"
                          onClick={() => setPImageUrl("")}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900">
                        {sanitizeImageUrl(pImageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sanitizeImageUrl(pImageUrl)!}
                            alt="Preview Card Picture"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="p-2 text-center text-[11px] text-slate-500">
                            <ImagePlus className="mx-auto h-6 w-6 text-slate-600" />
                            <span className="mt-1 block">Preview Foto</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(e) => void handlePhotoUpload(e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploadingPhoto ? "Mengoptimasi Gambar..." : "Unggah Foto Produk (JPG / PNG / WebP)"}
                        </button>
                        <label className="block text-[11px] text-slate-400">
                          Atau tempel URL Gambar HTTPS
                          <input
                            value={pImageUrl.startsWith("data:") ? "" : pImageUrl}
                            onChange={(e) => setPImageUrl(e.target.value)}
                            placeholder="https://contoh.com/foto-produk.jpg"
                            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="flex items-center justify-between">
                        <span>Kode SKU *</span>
                        {modalMode === "create" && (
                          <button
                            type="button"
                            onClick={() => {
                              const grp =
                                localMaster.categories.find((c) => c.name === pCategory) ??
                                localMaster.categories[0];
                              if (grp) {
                                const norm = normalizeProductGroup(grp);
                                setPSku(generateNextGroupSku(norm, products));
                                setPUnit(norm.defaultUnit);
                              }
                            }}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
                          >
                            ✨ Auto SKU Kelompok
                          </button>
                        )}
                      </span>
                      <input
                        required
                        disabled={modalMode === "edit"}
                        value={pSku}
                        onChange={(e) => setPSku(e.target.value)}
                        placeholder="MNM-2611-001"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      Kelompok Barang
                      <select
                        value={pCategory}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          setPCategory(nextName);
                          const grp = localMaster.categories.find((c) => c.name === nextName);
                          if (grp && modalMode === "create") {
                            const norm = normalizeProductGroup(grp);
                            setPUnit(norm.defaultUnit);
                            if (!pSku.trim()) {
                              setPSku(generateNextGroupSku(norm, products));
                            }
                          }
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      >
                        {localMaster.categories.map((c) => {
                          const norm = normalizeProductGroup(c);
                          return (
                            <option key={c.id} value={c.name}>
                              [{norm.groupCode}] {c.name}
                            </option>
                          );
                        })}
                        <option value="Umum">Umum</option>
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    Nama Barang *
                    <input required value={pName} onChange={(e) => setPName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Harga Jual (Rp) *
                      <input required type="number" min={0} value={pPrice} onChange={(e) => setPPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Harga Modal / HPP (Rp)
                      <input type="number" min={0} value={pCost} onChange={(e) => setPCost(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <label className="block">
                      Stok
                      <input type="number" min={0} value={pStock} onChange={(e) => setPStock(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Stok Min
                      <input type="number" min={0} value={pMinStock} onChange={(e) => setPMinStock(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Berat (gram)
                      <input type="number" min={10} value={pWeightGrams} onChange={(e) => setPWeightGrams(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Satuan
                      <select value={pUnit} onChange={(e) => setPUnit(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                        {localMaster.units.map((u) => (
                          <option key={u.id} value={u.code}>{u.code}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    Deskripsi Barang
                    <textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              {subTab === "suppliers" && (
                <>
                  <label className="block">
                    Nama Supplier *
                    <input required value={sName} onChange={(e) => setSName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      PIC / Kontak
                      <input value={sPic} onChange={(e) => setSPic(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      No. Telepon / WA
                      <input value={sPhone} onChange={(e) => setSPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Email
                      <input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Termin Pembayaran
                      <input value={sTerms} onChange={(e) => setSTerms(e.target.value)} placeholder="NET 14" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <label className="block">
                    Alamat Gudang Supplier
                    <input value={sAddr} onChange={(e) => setSAddr(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              {subTab === "customers" && (
                <>
                  <label className="block">
                    Nama Pelanggan *
                    <input required value={cName} onChange={(e) => setCName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      No. HP / WhatsApp
                      <input value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+62812..." className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Segmen Pelanggan
                      <select value={cStage} onChange={(e) => setCStage(e.target.value as LifecycleStage)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                        {(Object.keys(LIFECYCLE_LABELS) as LifecycleStage[]).map((st) => (
                          <option key={st} value={st}>{LIFECYCLE_LABELS[st].label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Email
                      <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Toko / Perusahaan
                      <input value={cCompany} onChange={(e) => setCCompany(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <label className="block">
                    Catatan &amp; Alamat Default
                    <textarea rows={2} value={cNotes} onChange={(e) => setCNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              {subTab === "categories" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="col-span-2 block">
                      Nama Kelompok Barang *
                      <input
                        required
                        value={catName}
                        onChange={(e) => {
                          setCatName(e.target.value);
                          if (!catCode.trim()) {
                            setCatCode(deriveGroupCode(e.target.value));
                          }
                        }}
                        placeholder="Contoh: Makanan Ringan / Kopi Roastery"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block">
                      Kode Prefix QR *
                      <input
                        value={catCode}
                        maxLength={5}
                        onChange={(e) => setCatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder="MKR"
                        className="mt-1 w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 font-mono font-bold uppercase text-emerald-300"
                      />
                    </label>
                  </div>
                  <label className="block">
                    Deskripsi Kelompok Barang
                    <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Contoh: Produk snack kemasan dengan kontrol expired 120 hari" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block">
                      Rak Gudang Default
                      <input value={catRack} onChange={(e) => setCatRack(e.target.value)} placeholder="Rak A-1" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Satuan Default
                      <select value={catDefaultUnit} onChange={(e) => setCatDefaultUnit(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                        {localMaster.units.map((u) => (
                          <option key={u.id} value={u.code}>{u.code} ({u.name})</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      Warna Lencana QR
                      <input type="color" value={catBadgeColor} onChange={(e) => setCatBadgeColor(e.target.value)} className="mt-1 h-[38px] w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-1" />
                    </label>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                        <input
                          type="checkbox"
                          checked={catRequiresExpiry}
                          onChange={(e) => setCatRequiresExpiry(e.target.checked)}
                          className="h-4 w-4 rounded accent-amber-500"
                        />
                        Wajib Pelacakan Tanggal Expired (FIFO Anti-Basi)
                      </label>
                      {catRequiresExpiry && (
                        <label className="flex items-center gap-2 text-[11px] text-slate-300">
                          Masa Simpan:
                          <input
                            type="number"
                            min={1}
                            max={1825}
                            value={catShelfLifeDays}
                            onChange={(e) => setCatShelfLifeDays(e.target.value)}
                            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-white"
                          />
                          hari
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                    <label className="block">
                      Tambah Satuan Baru (opsional)
                      <input value={unitCode} onChange={(e) => setUnitCode(e.target.value)} placeholder="box / lusin" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Nama Satuan
                      <input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Box / Lusin" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                </>
              )}

              {subTab === "couriers" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Kode Kurir *
                      <input required value={curCode} onChange={(e) => setCurCode(e.target.value)} placeholder="JNE / SICEPAT / POS" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Nama Ekspedisi *
                      <input required value={curName} onChange={(e) => setCurName(e.target.value)} placeholder="JNE Express / Pos Indonesia" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>

                  {/* MULTI-TIER SHIPPING COST OPTIONS */}
                  <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-cyan-300">Pilihan Biaya Pengiriman (Multi-Layanan)</span>
                        <p className="text-[11px] text-slate-400">
                          AI akan membandingkan &amp; merekomendasikan opsi ongkir ini ke calon pelanggan.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addCourierTier}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30"
                      >
                        <Plus className="h-3 w-3" />
                        Tambah Opsi Layanan
                      </button>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {curTiers.map((tier) => (
                        <div
                          key={tier.id}
                          className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 space-y-2"
                        >
                          <div className="grid grid-cols-12 gap-2">
                            <input
                              value={tier.serviceName}
                              onChange={(e) => updateCourierTier(tier.id, { serviceName: e.target.value })}
                              placeholder="Nama Paket (cth: Reguler / YES)"
                              className="col-span-5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                            />
                            <input
                              type="number"
                              min={0}
                              value={tier.ratePerKg}
                              onChange={(e) =>
                                updateCourierTier(tier.id, { ratePerKg: Math.max(0, Number(e.target.value) || 0) })
                              }
                              placeholder="Tarif/kg"
                              className="col-span-3 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-semibold text-emerald-300"
                            />
                            <input
                              value={tier.estimatedDays}
                              onChange={(e) => updateCourierTier(tier.id, { estimatedDays: e.target.value })}
                              placeholder="Estimasi"
                              className="col-span-3 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeCourierTier(tier.id)}
                              className="col-span-1 flex items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                              title="Hapus layanan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px]">
                            <label className="inline-flex items-center gap-1.5 text-slate-300">
                              <input
                                type="checkbox"
                                checked={tier.codSupported}
                                onChange={(e) => updateCourierTier(tier.id, { codSupported: e.target.checked })}
                              />
                              COD ({tier.codFeePct}%)
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-slate-300">
                              <input
                                type="checkbox"
                                checked={tier.insuranceAvailable}
                                onChange={(e) => updateCourierTier(tier.id, { insuranceAvailable: e.target.checked })}
                              />
                              Asuransi
                            </label>
                            <label className="inline-flex items-center gap-1 text-slate-400">
                              Min Kg:
                              <input
                                type="number"
                                min={1}
                                value={tier.minWeightKg ?? 1}
                                onChange={(e) =>
                                  updateCourierTier(tier.id, { minWeightKg: Math.max(1, Number(e.target.value) || 1) })
                                }
                                className="w-12 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-white"
                              />
                            </label>
                            <input
                              value={tier.coverageZones ?? ""}
                              onChange={(e) => updateCourierTier(tier.id, { coverageZones: e.target.value })}
                              placeholder="Cakupan area (cth: Jawa-Bali / Seluruh RI)"
                              className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-slate-200"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DETAILED LOGISTICS POLICIES FOR AI INTELLIGENCE */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Jadwal Pickup Harian
                      <input value={curPickupSchedule} onChange={(e) => setCurPickupSchedule(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Jam Cut-Off Pengiriman Hari Sama
                      <input value={curCutoff} onChange={(e) => setCurCutoff(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-slate-200">
                      <input
                        type="checkbox"
                        checked={curCodSupported}
                        onChange={(e) => setCurCodSupported(e.target.checked)}
                      />
                      Mendukung Bayar di Tempat (COD)
                    </label>
                    <label className="inline-flex items-center gap-2 text-slate-200">
                      <input
                        type="checkbox"
                        checked={curInsuranceSupported}
                        onChange={(e) => setCurInsuranceSupported(e.target.checked)}
                      />
                      Mendukung Asuransi Pengiriman
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Aturan Packing Aman
                      <textarea rows={2} value={curPackaging} onChange={(e) => setCurPackaging(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Dimensi Maks &amp; Volumetrik
                      <textarea rows={2} value={curMaxDimensions} onChange={(e) => setCurMaxDimensions(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>

                  <label className="block">
                    Kebijakan Klaim Kerusakan / Kehilangan Paket
                    <input value={curClaimPolicy} onChange={(e) => setCurClaimPolicy(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>

                  <label className="block">
                    Template URL Lacak Resi (HTTPS)
                    <input value={curTrackingUrl} onChange={(e) => setCurTrackingUrl(e.target.value)} placeholder="https://cekresi.com/?noresi={resi}" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>

                  <label className="block">
                    Catatan Khusus untuk Kecerdasan Multi-Agent AI
                    <textarea
                      rows={2}
                      value={curAiNotes}
                      onChange={(e) => setCurAiNotes(e.target.value)}
                      placeholder="Contoh: Sarankan paket Kargo jika pesanan > 5 kg atau tujuan luar Jawa untuk hemat ongkir."
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                </>
              )}

              {subTab === "payments" && (
                <>
                  <label className="block">
                    Metode Pembayaran
                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Bank / Penyedia *
                    <input required value={payProvider} onChange={(e) => setPayProvider(e.target.value)} placeholder="Bank BRI / QRIS Toko" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    No. Rekening / Merchant ID *
                    <input required value={payNumber} onChange={(e) => setPayNumber(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    Atas Nama *
                    <input required value={payHolder} onChange={(e) => setPayHolder(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setModalMode("none")}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
