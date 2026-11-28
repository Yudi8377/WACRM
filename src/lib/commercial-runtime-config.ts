import { decryptConnectorToken, encryptConnectorToken, type EncryptedToken } from "@/lib/connectors/token-crypto";
import { getDbPool, isDatabaseConfigured } from "@/lib/db";

export interface CommercialRuntimeConfig {
  // Email OTP (Resend / Brevo / Webhook)
  resendApiKey: string;
  brevoApiKey: string;
  emailWebhookUrl: string;
  emailWebhookSecret: string;
  emailFromAddress: string;
  emailFromName: string;

  // Mode Transfer Manual Rp 0,-
  manualBankName: string;
  manualBankAccount: string;
  manualBankHolder: string;
  manualBillingWa: string;

  // Payment Gateway Otomatis (Midtrans / Xendit / Tripay)
  paymentProvider: "manual_transfer" | "midtrans" | "xendit" | "tripay";
  midtransServerKey: string;
  midtransIsProduction: boolean;
  xenditSecretKey: string;
  xenditWebhookToken: string;
  tripayApiKey: string;
  tripayPrivateKey: string;
  tripayMerchantCode: string;
  tripayIsProduction: boolean;
}

export type CommercialRuntimeConfigPatch = Partial<CommercialRuntimeConfig>;

export interface MaskedCommercialRuntimeConfig {
  sources: {
    databaseStoreAvailable: boolean;
    activeEmailProvider: "resend" | "brevo" | "webhook" | "none";
    activePaymentProvider: "manual_transfer" | "midtrans" | "xendit" | "tripay";
    configuredPaymentProviders: Array<"midtrans" | "xendit" | "tripay">;
  };
  email: {
    resendConfigured: boolean;
    resendMasked: string;
    brevoConfigured: boolean;
    brevoMasked: string;
    webhookConfigured: boolean;
    emailFromAddress: string;
    emailFromName: string;
  };
  manualTransfer: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    billingWa: string;
    configured: boolean;
  };
  paymentGateway: {
    preferredProvider: "manual_transfer" | "midtrans" | "xendit" | "tripay";
    midtransConfigured: boolean;
    midtransServerKeyMasked: string;
    midtransIsProduction: boolean;
    xenditConfigured: boolean;
    xenditSecretKeyMasked: string;
    xenditWebhookTokenConfigured: boolean;
    tripayConfigured: boolean;
    tripayApiKeyMasked: string;
    tripayMerchantCode: string;
    tripayIsProduction: boolean;
  };
}

const SECRET_KEYS = new Set<keyof CommercialRuntimeConfig>([
  "resendApiKey",
  "brevoApiKey",
  "emailWebhookSecret",
  "midtransServerKey",
  "xenditSecretKey",
  "xenditWebhookToken",
  "tripayApiKey",
  "tripayPrivateKey",
]);

interface StoredDbRow {
  config_key: string;
  plain_value: string | null;
  encrypted_payload: string | null;
}

const CACHE_TTL_MS = 60_000;
const globalCfgCache = globalThis as unknown as {
  __wacrmRuntimeCfg?: { overrides: Partial<CommercialRuntimeConfig>; loadedAt: number };
};

export function maskSecret(val: string): string {
  const s = val.trim();
  if (!s) return "";
  if (s.length <= 8) return "••••••••";
  return `${s.slice(0, 4)}••••••${s.slice(-4)}`;
}

export function getEnvCommercialConfig(): CommercialRuntimeConfig {
  const providerRaw = (process.env.PAYMENT_PROVIDER || "").trim().toLowerCase();
  const paymentProvider: CommercialRuntimeConfig["paymentProvider"] =
    providerRaw === "midtrans" || providerRaw === "xendit" || providerRaw === "tripay"
      ? providerRaw
      : "manual_transfer";

  return {
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    brevoApiKey: process.env.BREVO_API_KEY?.trim() || "",
    emailWebhookUrl: process.env.EMAIL_WEBHOOK_URL?.trim() || "",
    emailWebhookSecret: process.env.EMAIL_WEBHOOK_SECRET?.trim() || "",
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() || "no-reply@wacrm.id",
    emailFromName: process.env.EMAIL_FROM_NAME?.trim() || "WACRM Commercial OS",

    manualBankName: process.env.MANUAL_BANK_NAME?.trim() || "Bank BCA / QRIS Resmi WACRM",
    manualBankAccount: process.env.MANUAL_BANK_ACCOUNT?.trim() || "",
    manualBankHolder: process.env.MANUAL_BANK_HOLDER?.trim() || "PT WACRM Digital Nusantara",
    manualBillingWa: process.env.MANUAL_BILLING_WA?.trim() || "",

    paymentProvider,
    midtransServerKey: process.env.MIDTRANS_SERVER_KEY?.trim() || "",
    midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    xenditSecretKey: process.env.XENDIT_SECRET_KEY?.trim() || "",
    xenditWebhookToken: process.env.XENDIT_WEBHOOK_TOKEN?.trim() || "",
    tripayApiKey: process.env.TRIPAY_API_KEY?.trim() || "",
    tripayPrivateKey: process.env.TRIPAY_PRIVATE_KEY?.trim() || "",
    tripayMerchantCode: process.env.TRIPAY_MERCHANT_CODE?.trim() || "",
    tripayIsProduction: process.env.TRIPAY_IS_PRODUCTION === "true",
  };
}

async function ensureConfigTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commercial_runtime_settings (
        config_key TEXT PRIMARY KEY,
        plain_value TEXT,
        encrypted_payload TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    return true;
  } catch {
    return false;
  }
}

export function invalidateCommercialRuntimeConfigCache(): void {
  globalCfgCache.__wacrmRuntimeCfg = undefined;
}

async function loadDbOverrides(forceRefresh = false): Promise<Partial<CommercialRuntimeConfig>> {
  const now = Date.now();
  if (
    !forceRefresh &&
    globalCfgCache.__wacrmRuntimeCfg &&
    now - globalCfgCache.__wacrmRuntimeCfg.loadedAt < CACHE_TTL_MS
  ) {
    return globalCfgCache.__wacrmRuntimeCfg.overrides;
  }

  const overrides: Partial<CommercialRuntimeConfig> = {};
  if (!isDatabaseConfigured()) {
    globalCfgCache.__wacrmRuntimeCfg = { overrides, loadedAt: now };
    return overrides;
  }

  try {
    const ready = await ensureConfigTable();
    if (!ready) {
      globalCfgCache.__wacrmRuntimeCfg = { overrides, loadedAt: now };
      return overrides;
    }
    const pool = getDbPool();
    const res = await pool.query<StoredDbRow>(
      `SELECT config_key, plain_value, encrypted_payload FROM commercial_runtime_settings`,
    );
    for (const row of res.rows) {
      const k = row.config_key as keyof CommercialRuntimeConfig;
      let rawVal = row.plain_value ?? "";
      if (row.encrypted_payload) {
        try {
          const parsed = JSON.parse(row.encrypted_payload) as EncryptedToken;
          rawVal = decryptConnectorToken(parsed);
        } catch {
          rawVal = "";
        }
      }
      if (k === "midtransIsProduction" || k === "tripayIsProduction") {
        overrides[k] = rawVal === "true";
      } else if (k === "paymentProvider") {
        if (
          rawVal === "manual_transfer" ||
          rawVal === "midtrans" ||
          rawVal === "xendit" ||
          rawVal === "tripay"
        ) {
          overrides.paymentProvider = rawVal;
        }
      } else if (rawVal) {
        (overrides as Record<string, string>)[k] = rawVal;
      }
    }
  } catch {
    // Non-fatal fallback to environment variables
  }

  globalCfgCache.__wacrmRuntimeCfg = { overrides, loadedAt: now };
  return overrides;
}

/**
 * Returns the effective commercial runtime configuration by merging
 * process.env defaults with AES-256-GCM encrypted DB runtime overrides.
 * DB overrides take precedence when non-empty, allowing zero-code / zero-redeploy activation.
 */
export async function getEffectiveCommercialConfig(
  forceRefresh = false,
): Promise<CommercialRuntimeConfig> {
  const envCfg = getEnvCommercialConfig();
  const dbOverrides = await loadDbOverrides(forceRefresh);

  return {
    resendApiKey: dbOverrides.resendApiKey || envCfg.resendApiKey,
    brevoApiKey: dbOverrides.brevoApiKey || envCfg.brevoApiKey,
    emailWebhookUrl: dbOverrides.emailWebhookUrl || envCfg.emailWebhookUrl,
    emailWebhookSecret: dbOverrides.emailWebhookSecret || envCfg.emailWebhookSecret,
    emailFromAddress: dbOverrides.emailFromAddress || envCfg.emailFromAddress,
    emailFromName: dbOverrides.emailFromName || envCfg.emailFromName,

    manualBankName: dbOverrides.manualBankName || envCfg.manualBankName,
    manualBankAccount: dbOverrides.manualBankAccount || envCfg.manualBankAccount,
    manualBankHolder: dbOverrides.manualBankHolder || envCfg.manualBankHolder,
    manualBillingWa: dbOverrides.manualBillingWa || envCfg.manualBillingWa,

    paymentProvider: dbOverrides.paymentProvider ?? envCfg.paymentProvider,
    midtransServerKey: dbOverrides.midtransServerKey || envCfg.midtransServerKey,
    midtransIsProduction: dbOverrides.midtransIsProduction ?? envCfg.midtransIsProduction,
    xenditSecretKey: dbOverrides.xenditSecretKey || envCfg.xenditSecretKey,
    xenditWebhookToken: dbOverrides.xenditWebhookToken || envCfg.xenditWebhookToken,
    tripayApiKey: dbOverrides.tripayApiKey || envCfg.tripayApiKey,
    tripayPrivateKey: dbOverrides.tripayPrivateKey || envCfg.tripayPrivateKey,
    tripayMerchantCode: dbOverrides.tripayMerchantCode || envCfg.tripayMerchantCode,
    tripayIsProduction: dbOverrides.tripayIsProduction ?? envCfg.tripayIsProduction,
  };
}

/**
 * Persists a partial configuration update into PostgreSQL.
 * All API keys / webhook tokens are encrypted at rest with AES-256-GCM (APP_ENCRYPTION_KEY).
 */
export async function saveCommercialRuntimeConfigPatch(
  patch: CommercialRuntimeConfigPatch,
): Promise<{ savedKeys: string[]; encryptedKeys: string[] }> {
  const ready = await ensureConfigTable();
  if (!ready) {
    throw new Error(
      "Database PostgreSQL belum terhubung. Pasang DATABASE_URL atau isi langsung melalui Environment Variables hosting.",
    );
  }

  const pool = getDbPool();
  const savedKeys: string[] = [];
  const encryptedKeys: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const typedKey = key as keyof CommercialRuntimeConfig;
    const strVal = typeof value === "boolean" ? String(value) : String(value).trim();

    if (!strVal && typeof value !== "boolean") {
      // Allow clearing an override cleanly
      await pool.query(`DELETE FROM commercial_runtime_settings WHERE config_key = $1`, [typedKey]);
      savedKeys.push(typedKey);
      continue;
    }

    if (SECRET_KEYS.has(typedKey)) {
      const enc = encryptConnectorToken(strVal);
      await pool.query(
        `INSERT INTO commercial_runtime_settings (config_key, plain_value, encrypted_payload, updated_at)
         VALUES ($1, NULL, $2, now())
         ON CONFLICT (config_key) DO UPDATE
           SET plain_value = NULL, encrypted_payload = EXCLUDED.encrypted_payload, updated_at = now()`,
        [typedKey, JSON.stringify(enc)],
      );
      savedKeys.push(typedKey);
      encryptedKeys.push(typedKey);
    } else {
      await pool.query(
        `INSERT INTO commercial_runtime_settings (config_key, plain_value, encrypted_payload, updated_at)
         VALUES ($1, $2, NULL, now())
         ON CONFLICT (config_key) DO UPDATE
           SET plain_value = EXCLUDED.plain_value, encrypted_payload = NULL, updated_at = now()`,
        [typedKey, strVal],
      );
      savedKeys.push(typedKey);
    }
  }

  invalidateCommercialRuntimeConfigCache();
  return { savedKeys, encryptedKeys };
}

export function buildMaskedCommercialConfig(
  cfg: CommercialRuntimeConfig,
): MaskedCommercialRuntimeConfig {
  const activeEmailProvider: "resend" | "brevo" | "webhook" | "none" = cfg.resendApiKey
    ? "resend"
    : cfg.brevoApiKey
      ? "brevo"
      : cfg.emailWebhookUrl
        ? "webhook"
        : "none";

  const configuredPaymentProviders: Array<"midtrans" | "xendit" | "tripay"> = [];
  if (cfg.midtransServerKey) configuredPaymentProviders.push("midtrans");
  if (cfg.xenditSecretKey) configuredPaymentProviders.push("xendit");
  if (cfg.tripayApiKey && cfg.tripayPrivateKey && cfg.tripayMerchantCode) {
    configuredPaymentProviders.push("tripay");
  }

  const activePaymentProvider: "manual_transfer" | "midtrans" | "xendit" | "tripay" =
    cfg.paymentProvider !== "manual_transfer" &&
    configuredPaymentProviders.includes(cfg.paymentProvider)
      ? cfg.paymentProvider
      : configuredPaymentProviders[0] ?? "manual_transfer";

  return {
    sources: {
      databaseStoreAvailable: isDatabaseConfigured(),
      activeEmailProvider,
      activePaymentProvider,
      configuredPaymentProviders,
    },
    email: {
      resendConfigured: Boolean(cfg.resendApiKey),
      resendMasked: maskSecret(cfg.resendApiKey),
      brevoConfigured: Boolean(cfg.brevoApiKey),
      brevoMasked: maskSecret(cfg.brevoApiKey),
      webhookConfigured: Boolean(cfg.emailWebhookUrl),
      emailFromAddress: cfg.emailFromAddress,
      emailFromName: cfg.emailFromName,
    },
    manualTransfer: {
      bankName: cfg.manualBankName,
      accountNumber: cfg.manualBankAccount,
      accountHolder: cfg.manualBankHolder,
      billingWa: cfg.manualBillingWa,
      configured: Boolean(cfg.manualBankAccount && cfg.manualBillingWa),
    },
    paymentGateway: {
      preferredProvider: cfg.paymentProvider,
      midtransConfigured: Boolean(cfg.midtransServerKey),
      midtransServerKeyMasked: maskSecret(cfg.midtransServerKey),
      midtransIsProduction: cfg.midtransIsProduction,
      xenditConfigured: Boolean(cfg.xenditSecretKey),
      xenditSecretKeyMasked: maskSecret(cfg.xenditSecretKey),
      xenditWebhookTokenConfigured: Boolean(cfg.xenditWebhookToken),
      tripayConfigured: Boolean(cfg.tripayApiKey && cfg.tripayPrivateKey && cfg.tripayMerchantCode),
      tripayApiKeyMasked: maskSecret(cfg.tripayApiKey),
      tripayMerchantCode: cfg.tripayMerchantCode,
      tripayIsProduction: cfg.tripayIsProduction,
    },
  };
}
