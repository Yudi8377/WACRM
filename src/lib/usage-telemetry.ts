import type { AppEditionId } from "@/lib/crm-types";

export interface UsageTelemetryPayload {
  tenantEmail: string;
  businessName?: string;
  editionId: AppEditionId;
  platform: "web" | "android";
  region: string;
  featureKey: string;
  durationSeconds: number;
  sessionId: string;
}

export interface MarketTelemetryPayload {
  tenantEmail?: string;
  region?: string;
  productCategory: string;
  productName?: string;
  avgPriceIdr: number;
  unitsSold: number;
  orderValueIdr: number;
  paymentMethod?: "qris" | "transfer" | "cod" | "cash" | "edc";
  channel?: "whatsapp" | "instagram" | "tiktok" | "facebook" | "youtube" | "pos";
  repeatBuyer?: boolean;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr-session";
  const key = "wacrm_telemetry_session_id";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const next = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `sess-${Date.now().toString(36)}`;
  }
}

export function detectUserRegionHint(addressOrCity?: string | null): string {
  const clean = (addressOrCity || "").trim();
  if (clean && !/^indonesia$/i.test(clean)) return clean;
  if (typeof Intl !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (/makassar/i.test(tz)) return "Bali & Sulawesi (WITA)";
      if (/jayapura/i.test(tz)) return "Indonesia Timur (WIT)";
      if (/jakarta/i.test(tz)) return "Jawa / Indonesia Barat (WIB)";
    } catch {
      // ignore
    }
  }
  return "Indonesia";
}

export function sendUsageTelemetry(payload: UsageTelemetryPayload, useBeacon = false): void {
  if (typeof window === "undefined") return;
  if (payload.durationSeconds < 3) return;
  const body = JSON.stringify({
    type: "usage",
    ...payload,
    localHour: new Date().getHours(),
  });

  if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/telemetry", blob);
      return;
    } catch {
      // fall through to fetch
    }
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function sendMarketSignalTelemetry(payload: MarketTelemetryPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    type: "market",
    ...payload,
    buyerHour: new Date().getHours(),
  });

  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
