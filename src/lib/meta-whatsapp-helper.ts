export interface ParsedMetaWhatsAppPaste {
  wabaId: string | null;
  phoneNumberId: string | null;
  accessToken: string | null;
  extractedFields: Array<"wabaId" | "phoneNumberId" | "accessToken">;
  summary: string;
}

export interface MetaWhatsAppDraftDiagnosis {
  cleanedToken: string;
  warnings: string[];
  ready: boolean;
}

export const META_QUICK_LINKS = {
  developersApps: "https://developers.facebook.com/apps/",
  whatsappBusinessAccounts: "https://business.facebook.com/settings/whatsapp-business-accounts",
  systemUsers: "https://business.facebook.com/settings/system-users",
} as const;

/**
 * Strips accidental "Bearer " prefix and surrounding quotes/whitespace from Meta tokens.
 */
export function cleanMetaAccessToken(raw: string): string {
  return raw
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/^Authorization:\s*/i, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

/**
 * Extracts Phone Number ID, WABA ID, and Access Token automatically from any text
 * copied from Meta Developers ("API Setup" curl snippet, JSON, or Business Manager notes).
 */
export function parseMetaWhatsAppPaste(rawText: string): ParsedMetaWhatsAppPaste {
  const text = rawText.trim();
  if (!text) {
    return {
      wabaId: null,
      phoneNumberId: null,
      accessToken: null,
      extractedFields: [],
      summary: "Tempel kode cURL atau catatan dari Meta API Setup untuk mengisi otomatis.",
    };
  }

  let phoneNumberId: string | null = null;
  let wabaId: string | null = null;
  let accessToken: string | null = null;

  // 1. Phone Number ID from Meta Graph cURL endpoint: https://graph.facebook.com/v22.0/<PHONE_NUMBER_ID>/messages
  const curlPhoneMatch = text.match(/graph\.facebook\.com\/v\d+\.\d+\/(\d{8,25})\/messages/i);
  if (curlPhoneMatch) {
    phoneNumberId = curlPhoneMatch[1];
  }

  // 2. Phone Number ID from labeled text or JSON ("phone_number_id": "...", "Phone number ID: ...")
  if (!phoneNumberId) {
    const labeledPhone = text.match(
      /(?:phone[_\s-]*number[_\s-]*id|id\s*nomor\s*(?:telepon|hp|wa))\s*[:="']+\s*['"]?(\d{8,25})/i,
    );
    if (labeledPhone) {
      phoneNumberId = labeledPhone[1];
    }
  }

  // 3. WABA ID from labeled text, JSON, or URL query (?waba_id=..., "WhatsApp Business Account ID: ...")
  const wabaPatterns = [
    /(?:whatsapp[_\s-]*business[_\s-]*account[_\s-]*id|waba[_\s-]*id|business[_\s-]*account[_\s-]*id|id\s*akun\s*whatsapp\s*business)\s*[:="']+\s*['"]?(\d{8,25})/i,
    /[?&]waba_id=(\d{8,25})/i,
    /graph\.facebook\.com\/v\d+\.\d+\/(\d{8,25})\/(?:phone_numbers|message_templates)/i,
  ];
  for (const rx of wabaPatterns) {
    const m = text.match(rx);
    if (m) {
      wabaId = m[1];
      break;
    }
  }

  // 4. Access Token from Authorization: Bearer EAA... or standalone EAA... Meta token
  const bearerMatch = text.match(/Bearer\s+([A-Za-z0-9._-]{24,})/i);
  if (bearerMatch) {
    accessToken = bearerMatch[1].replace(/['"`\\,;]+$/g, "");
  } else {
    const eaaMatch = text.match(/\b(EAA[A-Za-z0-9_-]{25,})\b/);
    if (eaaMatch) {
      accessToken = eaaMatch[1];
    }
  }

  const extractedFields: Array<"wabaId" | "phoneNumberId" | "accessToken"> = [];
  if (wabaId) extractedFields.push("wabaId");
  if (phoneNumberId) extractedFields.push("phoneNumberId");
  if (accessToken) extractedFields.push("accessToken");

  const labelMap: Record<"wabaId" | "phoneNumberId" | "accessToken", string> = {
    wabaId: "WABA ID",
    phoneNumberId: "Phone Number ID",
    accessToken: "Access Token",
  };

  let summary: string;
  if (extractedFields.length === 3) {
    summary = "Mantap! Semua 3 data (WABA ID, Phone Number ID & Access Token) terisi otomatis.";
  } else if (extractedFields.length > 0) {
    const found = extractedFields.map((f) => labelMap[f]).join(" & ");
    const missing = (["wabaId", "phoneNumberId", "accessToken"] as const)
      .filter((f) => !extractedFields.includes(f))
      .map((f) => labelMap[f])
      .join(", ");
    summary = `Terisi otomatis: ${found}. Tinggal lengkapi: ${missing}.`;
  } else {
    summary = "Belum terdeteksi format cURL/token Meta. Anda bisa langsung isi 3 kolom di bawah.";
  }

  return {
    wabaId,
    phoneNumberId,
    accessToken,
    extractedFields,
    summary,
  };
}

/**
 * Provides real-time friendly Indonesian validation before submitting Meta credentials.
 */
export function diagnoseMetaWhatsAppDraft(input: {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
}): MetaWhatsAppDraftDiagnosis {
  const waba = input.wabaId.replace(/\s+/g, "");
  const phoneId = input.phoneNumberId.replace(/\s+/g, "");
  const cleanedToken = cleanMetaAccessToken(input.accessToken);
  const warnings: string[] = [];

  if (phoneId && /^(?:08|\+?628)/.test(phoneId)) {
    warnings.push(
      "Phone Number ID bukan nomor HP biasa (08xx/628xx). Salin angka 'Phone number ID' (15 digit) dari halaman Meta API Setup.",
    );
  }
  if (waba && /^(?:08|\+?628)/.test(waba)) {
    warnings.push(
      "WABA ID bukan nomor HP. Salin angka 'WhatsApp Business Account ID' (15 digit) di sebelah kanan Phone Number ID pada Meta.",
    );
  }
  if (waba && phoneId && waba === phoneId) {
    warnings.push(
      "WABA ID dan Phone Number ID tidak boleh sama — keduanya adalah 2 ID berbeda yang tampil berdampingan di Meta API Setup.",
    );
  }
  if (cleanedToken && cleanedToken.length < 20) {
    warnings.push("Access Token Meta biasanya panjang (dimulai dengan EAA...). Pastikan tidak terpotong.");
  }

  const ready =
    /^\d{5,30}$/.test(waba) &&
    /^\d{5,30}$/.test(phoneId) &&
    waba !== phoneId &&
    cleanedToken.length >= 10 &&
    warnings.length === 0;

  return { cleanedToken, warnings, ready };
}

/**
 * Normalizes an Indonesian phone number (e.g. "0812-3456-7890" -> "6281234567890")
 * for the Quick WhatsApp onboarding mode.
 */
export function normalizeWhatsAppPhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }
  return digits;
}
