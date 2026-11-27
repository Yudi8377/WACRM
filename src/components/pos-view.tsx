"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bluetooth,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  QrCode,
  Receipt,
  ShieldAlert,
  Sparkles,
  Truck,
  Wifi,
  X,
} from "lucide-react";
import { CrudToolbar, PaginationBar } from "@/components/crud-toolbar";
import {
  formatIdr,
  PAYMENT_METHOD_LABELS,
  type ChannelType,
  type ErpProductRecord,
  type OrderStatus,
  type PaymentMethod,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  buildEscPosReceipt,
  buildEscPosShippingLabel,
  printViaBluetooth,
  printViaWifiHtml,
  renderInvoicePrintHtml,
  renderShippingLabelPrintHtml,
} from "@/lib/printer";
import { generateQrDataUrl } from "@/lib/qr-generator";
import { loadLocalMasterData } from "@/lib/store-profile";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface PosViewProps {
  adapter: WorkspaceAdapter;
  storeProfile: StoreBusinessProfile;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

interface CartItem {
  product: ErpProductRecord;
  quantity: number;
}

const PAGE_SIZE = 5;

export function PosView({
  adapter,
  storeProfile,
  products,
  orders,
  onRefresh,
  onToast,
}: PosViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Sub-Module Modals: "none" | "create" | "edit"
  const [formModal, setFormModal] = useState<"none" | "create" | "edit">("none");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCourier, setShippingCourier] = useState(storeProfile.defaultCourier || "JNE Reguler");
  const [channel, setChannel] = useState<ChannelType>("whatsapp");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("confirmed");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Invoice & Shipping Label QR Studio Modal
  const [studioOrder, setStudioOrder] = useState<PosOrderRecord | null>(null);
  const [studioTab, setStudioTab] = useState<"invoice" | "label">("invoice");
  const [qrState, setQrState] = useState<{ payload: string; url: string }>({ payload: "", url: "" });
  const [printingMode, setPrintingMode] = useState<"wifi" | "bluetooth" | null>(null);

  const couriers = useMemo(() => loadLocalMasterData(adapter.tenantId).couriers, [adapter.tenantId]);

  useEffect(() => {
    let active = true;
    const payload = studioOrder?.qrPayload;
    if (!payload) return;
    void generateQrDataUrl(payload, 260).then((url) => {
      if (active) setQrState({ payload, url });
    });
    return () => {
      active = false;
    };
  }, [studioOrder?.qrPayload]);

  const qrDataUrl = studioOrder && qrState.payload === studioOrder.qrPayload ? qrState.url : "";

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        !q ||
        o.invoiceNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.shippingAddress.toLowerCase().includes(q) ||
        (o.trackingCode ?? "").toLowerCase().includes(q),
    );
  }, [orders, search]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.isActive &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }, [products, productSearch]);

  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const paidOrdersCount = orders.filter((o) => o.paymentStatus === "paid").length;
  const aiOrdersCount = orders.filter((o) => o.aiGenerated).length;

  const subtotal = cart.reduce((s, c) => s + c.product.unitPrice * c.quantity, 0);
  const effectiveDiscount = Math.min(subtotal, Math.max(0, discountAmount));
  const taxable = Math.max(0, subtotal - effectiveDiscount);
  const tax = Math.round(taxable * 0.11);
  const total = taxable + tax;

  function openCreateSubModule() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setShippingAddress("");
    setShippingCourier(storeProfile.defaultCourier || couriers[0]?.name || "JNE Reguler");
    setChannel("whatsapp");
    setPaymentMethod("qris");
    setPaymentStatus("paid");
    setDiscountAmount(0);
    setNotes("");
    setFormModal("create");
  }

  function openEditSubModule(overrideId?: string) {
    const id = overrideId ?? selectedOrderId;
    const ord = orders.find((o) => o.id === id);
    if (!ord) return;
    setSelectedOrderId(ord.id);
    setShippingAddress(ord.shippingAddress);
    setShippingCourier(ord.shippingCourier || storeProfile.defaultCourier || "JNE Reguler");
    setPaymentStatus(ord.paymentStatus === "paid" ? "paid" : "unpaid");
    setOrderStatus(ord.orderStatus);
    setNotes(ord.notes ?? "");
    setFormModal("edit");
  }

  function addToCart(product: ErpProductRecord) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  }

  async function handleSubmitOrder(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (formModal === "create") {
        if (cart.length === 0) {
          onToast("Pilih minimal 1 produk pada keranjang.", "error");
          setSubmitting(false);
          return;
        }
        const created = await adapter.createPosOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          shippingAddress: shippingAddress.trim(),
          shippingCourier,
          channel,
          paymentMethod,
          paymentStatus,
          discountAmount: effectiveDiscount,
          taxRate: 0.11,
          notes: notes.trim() || null,
          items: cart.map((c) => ({
            productId: c.product.id,
            sku: c.product.sku,
            productName: c.product.name,
            quantity: c.quantity,
            unitPrice: c.product.unitPrice,
            costPrice: c.product.costPrice,
          })),
        });
        setFormModal("none");
        await onRefresh();
        setStudioTab(created.paymentStatus === "paid" ? "invoice" : "label");
        setStudioOrder(created);
        onToast(
          created.paymentStatus === "paid"
            ? `Pembayaran diterima! Invoice Lunas ${created.invoiceNumber} & Label Pengiriman QR otomatis terisi.`
            : `Order ${created.invoiceNumber} + Label QR berhasil dibuat!`,
        );
      } else if (formModal === "edit" && selectedOrderId) {
        await adapter.updatePosOrder(selectedOrderId, {
          shippingAddress: shippingAddress.trim(),
          shippingCourier,
          paymentStatus,
          orderStatus,
          notes: notes.trim(),
        });
        setFormModal("none");
        await onRefresh();
        onToast("Data pesanan & pengiriman berhasil diperbarui.");
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan pesanan POS.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment(order: PosOrderRecord) {
    try {
      await adapter.updatePosOrder(order.id, { paymentStatus: "paid", orderStatus: "confirmed" });
      await onRefresh();
      const paidOrder: PosOrderRecord = {
        ...order,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        paidAt: new Date().toISOString(),
      };
      setStudioTab("invoice");
      setStudioOrder(paidOrder);
      onToast(
        `Pembayaran ${order.invoiceNumber} dikonfirmasi LUNAS! Invoice otomatis terisi & jurnal kas diperbarui.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran.", "error");
    }
  }

  async function handleDeleteOrder(overrideId?: string) {
    const id = overrideId ?? selectedOrderId;
    if (!id) return;
    if (!window.confirm("Hapus pesanan POS ini?")) return;
    try {
      await adapter.deletePosOrder(id);
      setSelectedOrderId(null);
      await onRefresh();
      onToast("Pesanan POS dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus pesanan.", "error");
    }
  }

  async function handlePrint(order: PosOrderRecord, docType: "invoice" | "label", via: "wifi" | "bluetooth") {
    setPrintingMode(via);
    try {
      if (via === "bluetooth") {
        const escpos =
          docType === "label"
            ? buildEscPosShippingLabel(order, storeProfile)
            : buildEscPosReceipt(order, storeProfile);
        const res = await printViaBluetooth(escpos);
        onToast(res.message, res.ok ? "ok" : "error");
      } else {
        const qr = qrDataUrl || (await generateQrDataUrl(order.qrPayload, 260));
        const html =
          docType === "label"
            ? renderShippingLabelPrintHtml(order, storeProfile, qr)
            : renderInvoicePrintHtml(order, storeProfile, qr);
        const res = printViaWifiHtml(
          docType === "label"
            ? `Label Pengiriman ${order.invoiceNumber}`
            : `Invoice ${order.invoiceNumber}`,
          html,
          docType === "label" ? "label100" : "a4",
        );
        onToast(res.message, res.ok ? "ok" : "error");
      }
    } finally {
      setPrintingMode(null);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Receipt className="h-3.5 w-3.5" />
            {storeProfile.businessName} · Invoice Otomatis Lunas &amp; Label Pengiriman QR
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Point of Sale (POS), Invoice Otomatis &amp; Label Pengiriman QR
          </h2>
          <p className="text-xs text-slate-400">
            Saat pelanggan membayar, Invoice resmi langsung terisi otomatis atas nama <strong>{storeProfile.businessName}</strong> beserta Label Pengiriman QR siap cetak Bluetooth/WiFi.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
            <div className="text-slate-400">Omzet</div>
            <div className="font-bold text-emerald-400">{formatIdr(totalSales)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
            <div className="text-slate-400">Invoice Lunas</div>
            <div className="font-bold text-white">{paidOrdersCount}/{orders.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
            <div className="text-slate-400">Order AI</div>
            <div className="font-bold text-cyan-300">{aiOrdersCount}</div>
          </div>
        </div>
      </div>

      {/* Standard Business CRUD Toolbar */}
      <CrudToolbar
        dark
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari nomor invoice, resi, pelanggan..."
        onAddNew={openCreateSubModule}
        addNewLabel="Tambah Baru (Order POS)"
        hasSelection={Boolean(selectedOrderId)}
        onEditSelected={() => openEditSubModule()}
        onDeleteSelected={() => void handleDeleteOrder()}
        onRefresh={() => void onRefresh()}
      />

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
            <tr>
              <th className="px-4 py-3">Invoice &amp; Resi</th>
              <th className="px-4 py-3">Pelanggan &amp; Alamat Kirim</th>
              <th className="px-4 py-3">Kurir / Bayar</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Invoice &amp; Label QR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Belum ada pesanan POS. Klik <strong>Tambah Baru (Order POS)</strong> untuk membuat transaksi.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`cursor-pointer transition ${
                    selectedOrderId === order.id ? "bg-emerald-500/15" : "hover:bg-slate-800/40"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-300">{order.invoiceNumber}</span>
                      {order.aiGenerated && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {order.trackingCode || `RESI-${order.invoiceNumber.replace(/^INV-/, "")}`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{order.customerName}</div>
                    <div className="max-w-xs truncate text-[11px] text-slate-400">
                      {order.shippingAddress}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{order.shippingCourier || storeProfile.defaultCourier}</div>
                    <div className="text-[11px] text-slate-400">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">
                    {formatIdr(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        order.paymentStatus === "paid"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : order.paymentStatus === "flagged"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {order.paymentStatus === "paid" ? "LUNAS" : order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {order.paymentStatus === "unpaid" && (
                        <button
                          type="button"
                          onClick={() => void handleConfirmPayment(order)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Konfirmasi Lunas
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setStudioTab("invoice");
                          setStudioOrder(order);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700"
                      >
                        <Receipt className="h-3 w-3 text-emerald-400" />
                        Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudioTab("label");
                          setStudioOrder(order);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/30"
                      >
                        <Truck className="h-3 w-3" />
                        Label QR
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Back / Next Pagination */}
      <PaginationBar
        dark
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filteredOrders.length}
        onPageChange={setPage}
      />

      {/* SUB-MODULE MODAL: TAMBAH BARU / UBAH ORDER POS */}
      {formModal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">
                {formModal === "create"
                  ? "Sub-Modul Tambah Order POS Baru"
                  : "Ubah Data Pengiriman & Status Order"}
              </h3>
              <button type="button" onClick={() => setFormModal("none")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="mt-4 space-y-4 text-xs">
              {formModal === "create" && (
                <>
                  {/* Product Picker */}
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-emerald-300">1. Pilih Produk dari Master Barang</span>
                      <input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Filter barang..."
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                      {filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addToCart(p)}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-left hover:border-emerald-500/50"
                        >
                          <div>
                            <div className="font-semibold text-white">{p.name}</div>
                            <div className="text-[11px] text-emerald-400">
                              {formatIdr(p.unitPrice)} · Stok {p.stockQty}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 shrink-0 text-emerald-400" />
                        </button>
                      ))}
                    </div>
                    {cart.length > 0 && (
                      <div className="space-y-1.5 border-t border-slate-800 pt-2">
                        {cart.map((c) => (
                          <div key={c.product.id} className="flex items-center justify-between rounded-lg bg-slate-900 px-2.5 py-1.5">
                            <span>{c.product.name} ({formatIdr(c.product.unitPrice)})</span>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => updateQty(c.product.id, -1)} className="rounded bg-slate-800 p-1"><Minus className="h-3 w-3" /></button>
                              <span className="w-5 text-center font-bold">{c.quantity}</span>
                              <button type="button" onClick={() => updateQty(c.product.id, 1)} className="rounded bg-slate-800 p-1"><Plus className="h-3 w-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      Nama Pelanggan *
                      <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      No. WhatsApp / HP
                      <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+62812..." className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                </>
              )}

              <label className="block">
                Alamat Pengiriman Lengkap *
                <input required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  Ekspedisi / Kurir Pengiriman
                  <select value={shippingCourier} onChange={(e) => setShippingCourier(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                    {couriers.map((c) => (
                      <option key={c.id} value={c.name}>{c.name} ({c.estimatedDays})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Status Pembayaran
                  <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as "paid" | "unpaid")} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                    <option value="paid">Sudah Dibayar / LUNAS (Terbitkan Invoice Otomatis)</option>
                    <option value="unpaid">Menunggu Pembayaran (Unpaid)</option>
                  </select>
                </label>
              </div>

              {formModal === "create" ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    Kanal Sumber
                    <select value={channel} onChange={(e) => setChannel(e.target.value as ChannelType)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook_messenger">Messenger</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </label>
                  <label className="block">
                    Metode Pembayaran
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Diskon (Rp)
                    <input type="number" min={0} value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </div>
              ) : (
                <label className="block">
                  Status Pengiriman / Order
                  <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value as OrderStatus)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                    <option value="confirmed">Dikonfirmasi</option>
                    <option value="packed">Sedang Dikemas</option>
                    <option value="shipped">Dikirim Kurir</option>
                    <option value="completed">Selesai Diterima</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </label>
              )}

              <label className="block">
                Catatan Pesanan / Pengiriman
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>

              {formModal === "create" && (
                <div className="rounded-xl bg-slate-950 p-3">
                  <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatIdr(subtotal)}</span></div>
                  <div className="flex justify-between text-slate-400"><span>PPN 11%</span><span>{formatIdr(tax)}</span></div>
                  <div className="mt-1 flex justify-between border-t border-slate-800 pt-1 text-sm font-bold text-emerald-400">
                    <span>TOTAL TAGIHAN</span><span>{formatIdr(total)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button type="button" onClick={() => setFormModal("none")} className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                  {submitting ? "Menyimpan..." : formModal === "create" ? "Simpan Order & Terbitkan QR" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUAL STUDIO MODAL: AUTO-FILLED PAID INVOICE + SCANNABLE QR SHIPPING LABEL */}
      {studioOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="max-h-[93vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-emerald-500/40 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-emerald-400">{storeProfile.businessName}</div>
                <h3 className="font-mono text-lg font-bold text-white">{studioOrder.invoiceNumber}</h3>
              </div>
              <button type="button" onClick={() => setStudioOrder(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Switcher: Official Paid Invoice vs Shipping Label QR */}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setStudioTab("invoice")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  studioTab === "invoice" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                Invoice Resmi ({studioOrder.paymentStatus === "paid" ? "LUNAS" : "TAGIHAN"})
              </button>
              <button
                type="button"
                onClick={() => setStudioTab("label")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  studioTab === "label" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                Label Pesanan &amp; Pengiriman QR
              </button>
            </div>

            {studioOrder.fraudRiskScore >= 50 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-200">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Skor Risiko AI {studioOrder.fraudRiskScore}/100 — Harap verifikasi pembayaran masuk sebelum paket dikirim.
              </div>
            )}

            {/* WHITE-LABEL PREVIEW CARD */}
            <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 text-slate-900">
              {studioTab === "invoice" ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-3">
                    <div>
                      <div className="text-base font-extrabold text-slate-900">{storeProfile.businessName}</div>
                      {storeProfile.businessTagline && <div className="text-[11px] font-semibold text-emerald-700">{storeProfile.businessTagline}</div>}
                      <div className="text-[11px] text-slate-500">{storeProfile.address}</div>
                      <div className="text-[11px] text-slate-500">{storeProfile.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice Pembayaran</div>
                      <div className="font-mono text-sm font-extrabold">{studioOrder.invoiceNumber}</div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          studioOrder.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {studioOrder.paymentStatus === "paid" ? "LUNAS / TERKONFIRMASI" : "MENUNGGU PEMBAYARAN"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Kepada Pelanggan</div>
                      <div className="text-sm font-bold">{studioOrder.customerName}</div>
                      <div className="text-slate-600">{studioOrder.customerPhone ?? "-"}</div>
                      <div className="text-slate-600">{studioOrder.shippingAddress}</div>
                    </div>
                    {qrDataUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={qrDataUrl} alt="QR Invoice" className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 p-1" />
                    )}
                  </div>

                  <div className="divide-y divide-slate-200 border-y border-slate-200 py-2">
                    {studioOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between py-1">
                        <span>{item.productName} × {item.quantity}</span>
                        <span className="font-bold">{formatIdr(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="text-slate-500">PPN 11%: {formatIdr(studioOrder.taxAmount)}</div>
                    <div className="text-sm font-extrabold text-emerald-700">
                      TOTAL: {formatIdr(studioOrder.totalAmount)} ({PAYMENT_METHOD_LABELS[studioOrder.paymentMethod]})
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2 text-[11px] text-slate-500">
                    {storeProfile.invoiceFooter}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                    <div>
                      <div className="text-sm font-extrabold">{storeProfile.businessName}</div>
                      <div className="text-[11px] text-slate-500">
                        Pengirim: {storeProfile.city || storeProfile.address} · {storeProfile.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
                        {studioOrder.shippingCourier || storeProfile.defaultCourier}
                      </span>
                      <div className="mt-1 font-mono text-[10px] font-bold text-slate-600">
                        {studioOrder.trackingCode || `RESI-${studioOrder.invoiceNumber.replace(/^INV-/, "")}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-300 pb-3">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Penerima / Alamat Pengiriman</div>
                      <div className="text-sm font-extrabold">{studioOrder.customerName}</div>
                      <div className="font-semibold text-slate-700">{studioOrder.customerPhone ?? "-"}</div>
                      <div className="text-slate-700">{studioOrder.shippingAddress}</div>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          studioOrder.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {studioOrder.paymentStatus === "paid"
                          ? "LUNAS · NON-COD"
                          : studioOrder.paymentMethod === "cod"
                            ? `COD ${formatIdr(studioOrder.totalAmount)}`
                            : "BELUM LUNAS"}
                      </span>
                    </div>
                    <div className="shrink-0 text-center">
                      {qrDataUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={qrDataUrl} alt="QR Label Pengiriman" className="h-32 w-32 rounded-lg border border-slate-900 p-1" />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-slate-300">
                          <QrCode className="h-8 w-8 text-slate-400" />
                        </div>
                      )}
                      <div className="mt-1 font-mono text-[10px] font-bold">{studioOrder.invoiceNumber}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Isi Paket ({studioOrder.items.reduce((s, i) => s + i.quantity, 0)} item)
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {studioOrder.items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.productName}</span>
                          <strong>{item.quantity}x</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Print Actions */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={printingMode !== null}
                onClick={() => void handlePrint(studioOrder, studioTab, "bluetooth")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                <Bluetooth className="h-4 w-4" />
                {studioTab === "label" ? "Cetak Label QR (Bluetooth)" : "Cetak Struk Invoice (Bluetooth)"}
              </button>
              <button
                type="button"
                disabled={printingMode !== null}
                onClick={() => void handlePrint(studioOrder, studioTab, "wifi")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                <Wifi className="h-4 w-4" />
                {studioTab === "label" ? "Cetak Label Pengiriman (WiFi)" : "Cetak Invoice Resmi (WiFi)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
