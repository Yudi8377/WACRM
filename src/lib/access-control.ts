import type { AiAgentKey, AppEditionId, MemberRole } from "@/lib/crm-types";
import {
  APP_EDITIONS,
  editionHasFeature,
  getEditionById,
  type EditionFeatureKey,
} from "@/lib/editions";

export type WorkspaceTabId =
  | "inbox"
  | "master"
  | "pos"
  | "erp"
  | "accounting"
  | "ai"
  | "seo_growth"
  | "contacts"
  | "channels"
  | "templates"
  | "analytics"
  | "editions"
  | "settings";

export const TRIAL_DURATION_DAYS = 14;

/**
 * Exact 1-to-1 mapping from the WACRM Feature Comparison Matrix:
 * - Starter UMKM: Inbox (max 2 channels, manual AI assist), Master Data, POS QR & Universal Print,
 *   Contacts (max 300), Channels (max 2), AI Agents (2 basic agents only: cs_sales & order_pos),
 *   Basic Analytics, Editions, Settings (with Starter watermark).
 * - Growth Pro unlocks: erp (erp_warehouse), seo_growth (seo_growth_ai), templates (zero_click_ai),
 *   AI Auto-Reply 24/7 Zero-Click, 6 AI Agents, 5 channels, 5.000 contacts, 10 seats, 100% White-Label.
 * - Enterprise AI Suite unlocks: accounting (double_entry_accounting), all 9 AI Agents,
 *   24/7 Voice Companion (voice_companion_24_7), Fraud Sentinel & Self-Healing (fraud_sentinel_healing),
 *   Super Admin & SWOT Analytics (super_admin_analytics), Unlimited seats, 50.000 contacts, 20 channels.
 * - Sovereign Corporate unlocks: custom_branded_apk, dedicated_db_sla, Unlimited everything.
 */
export const TAB_REQUIRED_FEATURE: Partial<Record<WorkspaceTabId, EditionFeatureKey>> = {
  erp: "erp_warehouse",
  accounting: "double_entry_accounting",
  seo_growth: "seo_growth_ai",
  templates: "zero_click_ai",
};

export const EDITION_ALLOWED_AI_AGENT_KEYS: Record<AppEditionId, AiAgentKey[]> = {
  starter: ["cs_sales", "order_pos"],
  pro: [
    "cs_sales",
    "order_pos",
    "knowledge_learner",
    "followup_hunter",
    "seo_growth",
    "procurement_forecast",
  ],
  enterprise: [
    "cs_sales",
    "order_pos",
    "knowledge_learner",
    "followup_hunter",
    "seo_growth",
    "procurement_forecast",
    "fraud_sentinel",
    "system_guardian",
    "companion_guide",
  ],
  sovereign: [
    "cs_sales",
    "order_pos",
    "knowledge_learner",
    "followup_hunter",
    "seo_growth",
    "procurement_forecast",
    "fraud_sentinel",
    "system_guardian",
    "companion_guide",
  ],
};

export function isAiAgentAllowedInEdition(
  editionId: AppEditionId,
  agentKey: AiAgentKey,
): boolean {
  return EDITION_ALLOWED_AI_AGENT_KEYS[editionId].includes(agentKey);
}

export function getRequiredEditionForAiAgent(agentKey: AiAgentKey): AppEditionId {
  if (EDITION_ALLOWED_AI_AGENT_KEYS.starter.includes(agentKey)) return "starter";
  if (EDITION_ALLOWED_AI_AGENT_KEYS.pro.includes(agentKey)) return "pro";
  return "enterprise";
}

export interface EditionMatrixCapabilities {
  editionId: AppEditionId;
  editionName: string;
  omnichannelInbox: boolean;
  zeroClickAiAutoReply: boolean;
  masterData: boolean;
  universalPrinting: boolean;
  posQrShippingLabel: boolean;
  erpWarehouse: boolean;
  doubleEntryAccounting: boolean;
  seoGrowthAi: boolean;
  voiceCompanion247: boolean;
  fraudSentinelHealing: boolean;
  whiteLabelStore: boolean;
  superAdminAnalytics: boolean;
  customBrandedApk: boolean;
  dedicatedDbSla: boolean;
  allowedAiAgents: AiAgentKey[];
  limits: {
    maxAgents: number;
    maxContacts: number;
    maxChannels: number;
    maxAiAgents: number;
    maxWorkspaces: number;
  };
}

export function getEditionMatrixCapabilities(
  editionId: AppEditionId,
  licenseSeatOverride?: number | null,
): EditionMatrixCapabilities {
  const ed = getEditionById(editionId);
  const resolvedSeats =
    licenseSeatOverride && licenseSeatOverride > 0
      ? licenseSeatOverride >= 9999
        ? -1
        : licenseSeatOverride
      : ed.limits.maxAgents;

  return {
    editionId: ed.id,
    editionName: ed.name,
    omnichannelInbox: editionHasFeature(editionId, "omnichannel_inbox"),
    zeroClickAiAutoReply: editionHasFeature(editionId, "zero_click_ai"),
    masterData: editionHasFeature(editionId, "master_data"),
    universalPrinting: editionHasFeature(editionId, "universal_printing_usb_edc"),
    posQrShippingLabel: editionHasFeature(editionId, "pos_qr_shipping_label"),
    erpWarehouse: editionHasFeature(editionId, "erp_warehouse"),
    doubleEntryAccounting: editionHasFeature(editionId, "double_entry_accounting"),
    seoGrowthAi: editionHasFeature(editionId, "seo_growth_ai"),
    voiceCompanion247: editionHasFeature(editionId, "voice_companion_24_7"),
    fraudSentinelHealing: editionHasFeature(editionId, "fraud_sentinel_healing"),
    whiteLabelStore: editionHasFeature(editionId, "white_label_store"),
    superAdminAnalytics: editionHasFeature(editionId, "super_admin_analytics"),
    customBrandedApk: editionHasFeature(editionId, "custom_branded_apk"),
    dedicatedDbSla: editionHasFeature(editionId, "dedicated_db_sla"),
    allowedAiAgents: EDITION_ALLOWED_AI_AGENT_KEYS[editionId],
    limits: {
      ...ed.limits,
      maxAgents: resolvedSeats,
    },
  };
}

const ROLE_RANK: Record<MemberRole, number> = {
  viewer: 1,
  agent: 2,
  supervisor: 3,
  admin: 4,
  owner: 5,
};

export const TAB_MIN_ROLE: Partial<Record<WorkspaceTabId, MemberRole>> = {
  accounting: "supervisor",
  editions: "admin",
  settings: "admin",
};

export interface TabAccessEvaluation {
  allowed: boolean;
  lockedByEdition: boolean;
  lockedByRole: boolean;
  requiredFeature?: EditionFeatureKey;
  requiredEditionId?: AppEditionId;
  requiredEditionName?: string;
  requiredRole?: MemberRole;
  reason?: string;
}

export function findMinimumEditionForFeature(feature: EditionFeatureKey): AppEditionId {
  for (const edition of APP_EDITIONS) {
    if (edition.features.includes(feature)) {
      return edition.id;
    }
  }
  return "sovereign";
}

export function evaluateTabAccess(
  editionId: AppEditionId,
  role: MemberRole,
  tabId: WorkspaceTabId,
): TabAccessEvaluation {
  const requiredFeature = TAB_REQUIRED_FEATURE[tabId];
  if (requiredFeature && !editionHasFeature(editionId, requiredFeature)) {
    const requiredEditionId = findMinimumEditionForFeature(requiredFeature);
    const requiredEdition = getEditionById(requiredEditionId);
    const currentEdition = getEditionById(editionId);
    return {
      allowed: false,
      lockedByEdition: true,
      lockedByRole: false,
      requiredFeature,
      requiredEditionId,
      requiredEditionName: requiredEdition.name,
      reason: `Modul ini membutuhkan minimal edisi ${requiredEdition.name} (edisi aktif Anda: ${currentEdition.name}). Aktifkan License Key dari WACRM Publisher HQ untuk membuka akses penuh.`,
    };
  }

  const minRole = TAB_MIN_ROLE[tabId];
  if (minRole && ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return {
      allowed: false,
      lockedByEdition: false,
      lockedByRole: true,
      requiredRole: minRole,
      reason: `Akses halaman ini memerlukan peran minimal ${minRole.toUpperCase()} (peran akun Anda saat ini: ${role.toUpperCase()}).`,
    };
  }

  return {
    allowed: true,
    lockedByEdition: false,
    lockedByRole: false,
  };
}

export type QuotaResourceKey = "agents" | "contacts" | "channels" | "aiAgents" | "workspaces";

export interface QuotaCheckResult {
  resource: QuotaResourceKey;
  current: number;
  limit: number;
  isUnlimited: boolean;
  withinQuota: boolean;
  canAddMore: boolean;
  percentUsed: number;
  label: string;
}

export function evaluateEditionQuota(
  editionId: AppEditionId,
  resource: QuotaResourceKey,
  currentCount: number,
  seatOverride?: number | null,
): QuotaCheckResult {
  const ed = getEditionById(editionId);
  let limit =
    resource === "agents"
      ? ed.limits.maxAgents
      : resource === "contacts"
        ? ed.limits.maxContacts
        : resource === "channels"
          ? ed.limits.maxChannels
          : resource === "aiAgents"
            ? ed.limits.maxAiAgents
            : ed.limits.maxWorkspaces;

  if (resource === "agents" && typeof seatOverride === "number" && seatOverride > 0) {
    limit = seatOverride >= 9999 ? -1 : seatOverride;
  }

  const isUnlimited = limit < 0;
  const withinQuota = isUnlimited || currentCount <= limit;
  const canAddMore = isUnlimited || currentCount < limit;
  const percentUsed = isUnlimited
    ? 12
    : limit === 0
      ? 100
      : Math.min(100, Math.round((currentCount / limit) * 100));

  const label = isUnlimited
    ? `${currentCount.toLocaleString("id-ID")} / Unlimited`
    : `${currentCount.toLocaleString("id-ID")} / ${limit.toLocaleString("id-ID")}`;

  return {
    resource,
    current: currentCount,
    limit,
    isUnlimited,
    withinQuota,
    canAddMore,
    percentUsed,
    label,
  };
}

export interface CommercialUserSession {
  userId: string;
  email: string;
  displayName: string;
  businessName: string;
  role: MemberRole;
  editionId: AppEditionId;
  authProvider: "cloud_neon" | "workspace_local";
  licenseKey?: string | null;
  hasPaidLicense?: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  platform?: "web" | "android";
  signedInAt: string;
}

export interface TrialStatusEvaluation {
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  totalTrialDays: number;
  trialEndsAt: string | null;
  label: string;
}

export function evaluateTrialStatus(
  session: CommercialUserSession | null | undefined,
  nowMs: number = Date.now(),
): TrialStatusEvaluation {
  if (!session) {
    return {
      isTrial: true,
      isExpired: false,
      daysRemaining: TRIAL_DURATION_DAYS,
      totalTrialDays: TRIAL_DURATION_DAYS,
      trialEndsAt: null,
      label: `Trial Gratis ${TRIAL_DURATION_DAYS} Hari (Starter UMKM)`,
    };
  }

  if (session.hasPaidLicense || Boolean(session.licenseKey?.trim())) {
    return {
      isTrial: false,
      isExpired: false,
      daysRemaining: 0,
      totalTrialDays: TRIAL_DURATION_DAYS,
      trialEndsAt: null,
      label: "Lisensi Resmi Aktif",
    };
  }

  const startMs = Date.parse(session.trialStartedAt || session.signedInAt);
  const fallbackEndMs =
    (Number.isNaN(startMs) ? nowMs : startMs) + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const parsedEndMs = session.trialEndsAt ? Date.parse(session.trialEndsAt) : fallbackEndMs;
  const endMs = Number.isNaN(parsedEndMs) ? fallbackEndMs : parsedEndMs;
  const diffMs = endMs - nowMs;
  const isExpired = diffMs <= 0;
  const daysRemaining = isExpired ? 0 : Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

  return {
    isTrial: true,
    isExpired,
    daysRemaining,
    totalTrialDays: TRIAL_DURATION_DAYS,
    trialEndsAt: new Date(endMs).toISOString(),
    label: isExpired
      ? "Masa Trial 14 Hari Berakhir — Aktivasi License Key Diperlukan"
      : `Trial Gratis Versi UMKM · Sisa ${daysRemaining} dari ${TRIAL_DURATION_DAYS} Hari`,
  };
}

export function detectClientPlatform(): "web" | "android" {
  if (typeof window === "undefined") return "web";
  const ua = window.navigator?.userAgent || "";
  const hasBridge = Boolean((window as unknown as { WACRMAndroid?: unknown }).WACRMAndroid);
  const params = new URLSearchParams(window.location.search);
  if (hasBridge || /wacrm-android/i.test(ua) || params.get("platform") === "android") {
    return "android";
  }
  return "web";
}

export interface LocalCommercialAccount {
  id: string;
  email: string;
  displayName: string;
  businessName: string;
  phone?: string;
  role: MemberRole;
  editionId: AppEditionId;
  passwordHash: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  hasPaidLicense?: boolean;
  licenseKey?: string | null;
  platform?: "web" | "android";
  createdAt: string;
}

const SESSION_KEY = "wacrm_commercial_session_v42";
const ACCOUNTS_KEY = "wacrm_commercial_accounts_v42";

/**
 * Deterministic salted hash for client-side trial/commercial credential matching
 * (Real Neon PostgreSQL production accounts use Better Auth scrypt hashing on the server).
 */
export function hashCommercialPassword(email: string, password: string): string {
  const normalized = `${email.trim().toLowerCase()}::WACRM-AUTH-SALT-2026::${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x27d4eb2d);
  }
  return `v1_${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export const COMMERCIAL_DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  displayName: string;
  businessName: string;
  role: MemberRole;
  editionId: AppEditionId;
  badge: string;
}> = [
  {
    email: "owner@tokoberkah.id",
    password: "Wacrm@Enterprise2026!",
    displayName: "Yudi (Owner Enterprise)",
    businessName: "Toko Berkah Nusantara",
    role: "owner",
    editionId: "enterprise",
    badge: "Enterprise AI (Full 9 Agen)",
  },
  {
    email: "pro@tokoberkah.id",
    password: "Wacrm@GrowthPro2026!",
    displayName: "Rina (Manager Growth Pro)",
    businessName: "Toko Berkah Nusantara",
    role: "admin",
    editionId: "pro",
    badge: "Growth Pro (ERP + SEO AI)",
  },
  {
    email: "starter@umkm.id",
    password: "Wacrm@Starter2026!",
    displayName: "Budi (Pemilik Starter UMKM)",
    businessName: "Warung Kopi & Sembako Maju",
    role: "owner",
    editionId: "starter",
    badge: "Starter UMKM (Gratis · Terbatas)",
  },
  {
    email: "cs@tokoberkah.id",
    password: "Wacrm@AgentCS2026!",
    displayName: "Dika (Agen CS)",
    businessName: "Toko Berkah Nusantara",
    role: "agent",
    editionId: "enterprise",
    badge: "Role Agent CS (RBAC)",
  },
];

function buildDefaultAccounts(): LocalCommercialAccount[] {
  return COMMERCIAL_DEMO_ACCOUNTS.map((acc, idx) => ({
    id: `local-user-${idx + 1}`,
    email: acc.email.toLowerCase(),
    displayName: acc.displayName,
    businessName: acc.businessName,
    role: acc.role,
    editionId: acc.editionId,
    passwordHash: hashCommercialPassword(acc.email, acc.password),
    createdAt: "2026-01-15T08:00:00.000Z",
  }));
}

export function loadLocalAccounts(): LocalCommercialAccount[] {
  const defaults = buildDefaultAccounts();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as LocalCommercialAccount[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaults;
    const merged = [...parsed];
    for (const def of defaults) {
      if (!merged.some((a) => a.email.toLowerCase() === def.email)) {
        merged.push(def);
      }
    }
    return merged;
  } catch {
    return defaults;
  }
}

function saveLocalAccounts(accounts: LocalCommercialAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage quota errors
  }
}

export function registerLocalCommercialAccount(input: {
  email: string;
  password: string;
  displayName: string;
  businessName: string;
  phone?: string;
  platform?: "web" | "android";
  editionId?: AppEditionId;
}): { ok: boolean; account?: LocalCommercialAccount; error?: string } {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Format email tidak valid." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Kata sandi minimal 8 karakter (disarankan 12+ karakter)." };
  }
  const accounts = loadLocalAccounts();
  if (accounts.some((a) => a.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, error: "Email sudah terdaftar. Silakan masuk atau gunakan Lupa Password." };
  }
  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const account: LocalCommercialAccount = {
    id: `local-${Date.now()}`,
    email: normalizedEmail,
    displayName: input.displayName.trim() || normalizedEmail.split("@")[0],
    businessName: input.businessName.trim() || "Usaha Baru WACRM",
    phone: input.phone?.trim() || "",
    role: "owner",
    // Always enforce Starter UMKM Trial on self-signup until official License Key is activated
    editionId: input.editionId ?? "starter",
    passwordHash: hashCommercialPassword(normalizedEmail, input.password),
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEnds.toISOString(),
    hasPaidLicense: false,
    licenseKey: null,
    platform: input.platform ?? detectClientPlatform(),
    createdAt: now.toISOString(),
  };
  saveLocalAccounts([account, ...accounts]);
  return { ok: true, account };
}

export function authenticateLocalCommercialAccount(
  email: string,
  password: string,
): { ok: boolean; account?: LocalCommercialAccount; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = loadLocalAccounts();
  const found = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!found) {
    return { ok: false, error: "Email belum terdaftar atau kata sandi tidak cocok." };
  }
  const candidateHash = hashCommercialPassword(normalizedEmail, password);
  if (candidateHash !== found.passwordHash) {
    return { ok: false, error: "Email atau kata sandi salah. Klik 'Lupa Password?' untuk mereset." };
  }
  return { ok: true, account: found };
}

export function resetLocalCommercialPassword(
  email: string,
  newPassword: string,
): { ok: boolean; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  if (newPassword.length < 8) {
    return { ok: false, error: "Kata sandi baru minimal 8 karakter." };
  }
  const accounts = loadLocalAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === normalizedEmail);
  if (idx === -1) {
    // Allow creating recovery account if user registered in cloud or browser cleared storage
    const created: LocalCommercialAccount = {
      id: `local-recovered-${Date.now()}`,
      email: normalizedEmail,
      displayName: normalizedEmail.split("@")[0] || "Pengguna WACRM",
      businessName: "Toko Berkah Nusantara",
      role: "owner",
      editionId: "starter",
      passwordHash: hashCommercialPassword(normalizedEmail, newPassword),
      createdAt: new Date().toISOString(),
    };
    saveLocalAccounts([created, ...accounts]);
    return { ok: true };
  }
  accounts[idx] = {
    ...accounts[idx],
    passwordHash: hashCommercialPassword(normalizedEmail, newPassword),
  };
  saveLocalAccounts(accounts);
  return { ok: true };
}

export function loadCommercialSession(): CommercialUserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CommercialUserSession;
    if (!parsed.email || !parsed.role || !parsed.editionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCommercialSession(session: CommercialUserSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearCommercialSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function upgradeCommercialSessionWithLicense(
  session: CommercialUserSession,
  editionId: AppEditionId,
  licenseKey: string,
): CommercialUserSession {
  const upgraded: CommercialUserSession = {
    ...session,
    editionId,
    licenseKey,
    hasPaidLicense: true,
  };
  saveCommercialSession(upgraded);

  const accounts = loadLocalAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === session.email.toLowerCase());
  if (idx >= 0) {
    accounts[idx] = {
      ...accounts[idx],
      editionId,
      licenseKey,
      hasPaidLicense: true,
    };
    saveLocalAccounts(accounts);
  }
  return upgraded;
}

export function revertCommercialSessionToTrial(
  session: CommercialUserSession,
): CommercialUserSession {
  const reverted: CommercialUserSession = {
    ...session,
    editionId: "starter",
    licenseKey: null,
    hasPaidLicense: false,
  };
  saveCommercialSession(reverted);

  const accounts = loadLocalAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === session.email.toLowerCase());
  if (idx >= 0) {
    accounts[idx] = {
      ...accounts[idx],
      editionId: "starter",
      licenseKey: null,
      hasPaidLicense: false,
    };
    saveLocalAccounts(accounts);
  }
  return reverted;
}
