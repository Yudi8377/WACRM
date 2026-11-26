"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bluetooth,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import {
  formatIdr,
  PAYMENT_METHOD_LABELS,
  type ChannelType,
  type ErpProductRecord,
  type PaymentMethod,
  type PosOrderRecord,
} from "@/lib/crm-types";
import {
  buildEscPosReceipt,
  printViaBluetooth,
  printViaWifiHtml,
  renderInvoicePrintHtml,
} from "@/lib/printer";
import { generateQrDataUrl } from "@/lib/qr-generator";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface PosViewProps {
  adapter: WorkspaceAdapter;
  workspaceName: string;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

interface CartItem {
  product: ErpProductRecord;
  quantity: number;
}

const PAYMENT_LABELS = PAYMENT_METHOD_LABELS;

export function PosView({
  adapter,
  workspaceName,
  products,
  orders,
  onRefresh,
  onToast,
}: PosViewProps) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [channel, setChannel] = useState<ChannelType>("whatsapp");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Selected invoice modal & scannable QR data URL
  const [selectedOrder, setSelectedOrder] = useState<PosOrderRecord | null>(null);
  const [qrState, setQrState] = useState<{ payload: string; url: string }>({ payload: "", url: "" });
  const [printingMode, setPrintingMode] = useState<"wifi" | "bluetooth" | null>(null);

  useEffect(() => {
    let active = true;
    const payload = selectedOrder?.qrPayload;
    if (!payload) return;
    void generateQrDataUrl(payload, 260).then((url) => {
      if (active) setQrState({ payload, url });
    });
    return () => {
      active = false;
    };
  }, [selectedOrder?.qrPayload]);

  const qrDataUrl =
    selectedOrder && qrState.payload === selectedOrder.qrPayload ? qrState.url : "";

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.isActive &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const subtotal = cart.reduce((s, c) => s + c.product.unitPrice * c.quantity, 0);
  const effectiveDiscount = Math.min(subtotal, Math.max(0, discountAmount));
  const taxable = Math.max(0, subtotal - effectiveDiscount);
  const tax = Math.round(taxable * 0.11);
  const total = taxable + tax;

  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const aiOrdersCount = orders.filter((o) => o.aiGenerated).length;

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

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      onToast("Pilih minimal 1 produk untuk membuat order POS.", "error");
      return;
    }
    if (!customerName.trim() || !shippingAddress.trim()) {
      onToast("Nama pelanggan dan alamat pengiriman wajib diisi.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const created = await adapter.createPosOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        shippingAddress: shippingAddress.trim(),
        channel,
        paymentMethod,
        paymentStatus,
        discountAmount: effectiveDiscount,
        taxRate: 0.11,
        items: cart.map((c) => ({
          productId: c.product.id,
          sku: c.product.sku,
          productName: c.product.name,
          quantity: c.quantity,
          unitPrice: c.product.unitPrice,
          costPrice: c.product.costPrice,
        })),
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setShippingAddress("");
      setDiscountAmount(0);
      await onRefresh();
      setSelectedOrder(created);
      onToast(
        `Invoice ${created.invoiceNumber} + QR Code berhasil dibuat! Stok ERP & jurnal akuntansi diperbarui otomatis.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal membuat transaksi POS.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkPaid(order: PosOrderRecord) {
    try {
      await adapter.updatePosOrder(order.id, { paymentStatus: "paid" });
      await onRefresh();
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...order, paymentStatus: "paid" });
      }
      onToast(`Invoice ${order.invoiceNumber} ditandai LUNAS.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui status pembayaran.", "error");
    }
  }

  async function handlePrintWifi(order: PosOrderRecord) {
    setPrintingMode("wifi");
    try {
      const qr = qrDataUrl || (await generateQrDataUrl(order.qrPayload, 240));
      const html = renderInvoicePrintHtml(order, workspaceName, qr);
      const res = printViaWifiHtml(`Invoice ${order.invoiceNumber}`, html);
      onToast(res.message, res.ok ? "ok" : "error");
    } finally {
      setPrintingMode(null);
    }
  }

  async function handlePrintBluetooth(order: PosOrderRecord) {
    setPrintingMode("bluetooth");
    try {
      const escpos = buildEscPosReceipt(order, workspaceName);
      const res = await printViaBluetooth(escpos);
      onToast(res.message, res.ok ? "ok" : "error");
    } finally {
      setPrintingMode(null);
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header & Printer Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Receipt className="h-3.5 w-3.5" />
            POS Kasir Terpadu · Auto-Invoice AI · QR Code · Cetak Bluetooth &amp; WiFi
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Point of Sale (POS) &amp; Generator Invoice QR
          </h2>
          <p className="text-xs text-slate-400">
            Order dari AI Chat maupun kasir langsung terhubung ke stok gudang ERP dan buku besar akuntansi secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200">
            <Bluetooth className="h-4 w-4" />
            Bluetooth ESC/POS &amp; WiFi Siap
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
            Total Omzet: <strong className="text-emerald-400">{formatIdr(totalSales)}</strong> ·{" "}
            <span className="text-cyan-300">{aiOrdersCount} order dari AI</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left POS Cashier, Right Invoices */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* Left: Product Picker + Cart */}
        <div className="space-y-4 xl:col-span-7">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-white">Katalog Produk ERP (Stok Live)</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari SKU / nama produk..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-3 pl-9 text-xs text-white focus:border-emerald-500 focus:outline-none sm:w-56"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-left transition hover:border-emerald-500/50 hover:bg-slate-900"
                >
                  <div>
                    <div className="text-[11px] font-semibold text-cyan-400">{p.sku}</div>
                    <div className="mt-0.5 text-xs font-bold text-white">{p.name}</div>
                    <div className="mt-1 text-xs font-semibold text-emerald-400">
                      {formatIdr(p.unitPrice)} <span className="text-slate-500">/{p.unit}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.stockQty <= p.minStock
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      Stok: {p.stockQty}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      <Plus className="h-3 w-3" /> Tambah
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Form */}
          <form
            onSubmit={handleCheckout}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ShoppingCart className="h-4 w-4 text-emerald-400" />
                Keranjang Kasir ({cart.length} item)
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-400">
                Klik produk di atas untuk memasukkan ke keranjang transaksi POS.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div
                    key={c.product.id}
                    className="flex items-center justify-between rounded-xl bg-slate-950 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{c.product.name}</div>
                      <div className="text-slate-400">
                        {formatIdr(c.product.unitPrice)} × {c.quantity} ={" "}
                        <strong className="text-emerald-300">
                          {formatIdr(c.product.unitPrice * c.quantity)}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(c.product.id, -1)}
                        className="rounded-lg bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-white">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.product.id, 1)}
                        className="rounded-lg bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400">Nama Pelanggan *</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">No. WhatsApp / HP</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+62812..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400">Alamat Pengiriman *</label>
                <input
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Jl. Merdeka No. 15, Kediri, Jawa Timur"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Kanal Sumber</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ChannelType)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="qris">QRIS (Auto QR)</option>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="cod">COD</option>
                  <option value="credit">Tempo / Invoice</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Status Pembayaran</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as "paid" | "unpaid")}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="paid">Lunas (Paid)</option>
                  <option value="unpaid">Menunggu Bayar (Unpaid)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Diskon (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 rounded-xl bg-slate-950 p-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatIdr(subtotal)}</span>
              </div>
              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Diskon</span>
                  <span>-{formatIdr(effectiveDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>PPN 11%</span>
                <span>{formatIdr(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-bold text-emerald-400">
                <span>TOTAL TAGIHAN</span>
                <span>{formatIdr(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <QrCode className="h-4 w-4" />
              {submitting ? "Membuat Invoice & QR..." : "Buat Transaksi POS + Generate QR Invoice"}
            </button>
          </form>
        </div>

        {/* Right: Recent POS Orders & Invoice QR List */}
        <div className="space-y-3 xl:col-span-5">
          <h3 className="text-sm font-bold text-white">
            Daftar Invoice &amp; Order POS ({orders.length})
          </h3>
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-emerald-500/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      {order.invoiceNumber}
                    </span>
                    {order.aiGenerated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                        <Sparkles className="h-2.5 w-2.5" /> AI Auto-Order
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        order.paymentStatus === "paid"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : order.paymentStatus === "flagged"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-white">{order.customerName}</div>
                  <div className="text-[11px] text-slate-400">{order.shippingAddress}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">
                    {formatIdr(order.totalAmount)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
                <span className="text-[11px] text-slate-400">
                  {order.items.length} item · Risiko AI: {order.fraudRiskScore}/100
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {order.paymentStatus === "unpaid" && (
                    <button
                      type="button"
                      onClick={() => handleMarkPaid(order)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Lunas
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/30"
                  >
                    <QrCode className="h-3 w-3" /> QR &amp; Cetak
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await adapter.deletePosOrder(order.id);
                      await onRefresh();
                      onToast(`Invoice ${order.invoiceNumber} dihapus.`);
                    }}
                    className="rounded-lg p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                    title="Hapus order"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice QR + Bluetooth/WiFi Print Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/40 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-400">
                  INVOICE RESMI &amp; QR VERIFIKASI
                </div>
                <h3 className="font-mono text-lg font-bold text-white">
                  {selectedOrder.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedOrder.fraudRiskScore >= 50 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-200">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Skor Risiko AI {selectedOrder.fraudRiskScore}/100 — Harap verifikasi pembayaran masuk sebelum pengiriman.
              </div>
            )}

            <div className="mt-4 grid gap-3 rounded-xl bg-slate-950 p-4 text-xs sm:grid-cols-2">
              <div>
                <div className="text-slate-500">Pelanggan</div>
                <div className="font-bold text-white">{selectedOrder.customerName}</div>
                <div className="text-slate-400">{selectedOrder.customerPhone ?? "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Alamat Pengiriman</div>
                <div className="text-slate-200">{selectedOrder.shippingAddress}</div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 rounded-xl bg-slate-950 p-4 text-xs">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-slate-200">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-semibold text-white">{formatIdr(item.lineTotal)}</span>
                </div>
              ))}
              <div className="mt-2 border-t border-slate-800 pt-2">
                <div className="flex justify-between text-slate-400">
                  <span>PPN 11%</span>
                  <span>{formatIdr(selectedOrder.taxAmount)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm font-bold text-emerald-400">
                  <span>TOTAL ({PAYMENT_LABELS[selectedOrder.paymentMethod]})</span>
                  <span>{formatIdr(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Real Scannable QR Code */}
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-slate-700 bg-white p-4 text-slate-950">
              {qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrDataUrl}
                  alt={`QR Invoice ${selectedOrder.invoiceNumber}`}
                  className="h-48 w-48"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-xs text-slate-500">
                  Membuat QR Code...
                </div>
              )}
              <div className="mt-2 text-center text-xs font-bold">
                Pindai QR untuk Pembayaran &amp; Verifikasi Invoice
              </div>
              <div className="mt-0.5 max-w-full truncate font-mono text-[10px] text-slate-600">
                {selectedOrder.qrPayload}
              </div>
            </div>

            {/* Print Actions: Bluetooth Thermal + WiFi Print */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={printingMode !== null}
                onClick={() => handlePrintBluetooth(selectedOrder)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                <Bluetooth className="h-4 w-4" />
                {printingMode === "bluetooth" ? "Mencetak BT..." : "Cetak Thermal Bluetooth"}
              </button>
              <button
                type="button"
                disabled={printingMode !== null}
                onClick={() => handlePrintWifi(selectedOrder)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <Wifi className="h-4 w-4" />
                {printingMode === "wifi" ? "Membuka Print..." : "Cetak Invoice via WiFi"}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Printer className="h-3.5 w-3.5" /> Mendukung ESC/POS 58mm/80mm &amp; AirPrint/Android Print
              </span>
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" /> {selectedOrder.paymentStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
