/**
 * Commercial Security Hardening Helpers
 * - Safe image/URL sanitization (prevents javascript: and SVG XSS)
 * - Password strength evaluation
 * - Sliding-window in-memory rate limiter for auth & verification APIs
 */

export function sanitizeImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 750_000) return null;

  // Allow safe raster data URLs only (strictly NO svg+xml or text/html)
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  // Allow local relative paths without protocol smuggling
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  // Allow http(s) URLs only
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function sanitizePhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function sanitizeTrackingUrl(template: string | null | undefined, trackingCode: string): string | null {
  if (!template) return null;
  const candidate = template.replace(
    /\{(resi|awb|tracking)\}/gi,
    encodeURIComponent(trackingCode.trim()),
  );
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Sangat Lemah" | "Lemah" | "Cukup" | "Kuat" | "Sangat Kuat";
  isCommercialReady: boolean;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigit: boolean;
    hasSymbol: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  let points = 0;
  if (password.length >= 8) points += 1;
  if (checks.minLength) points += 1;
  if (checks.hasUpper && checks.hasLower) points += 1;
  if (checks.hasDigit) points += 1;
  if (checks.hasSymbol) points += 1;

  const score = Math.min(4, points) as 0 | 1 | 2 | 3 | 4;
  const labels: Record<PasswordStrengthResult["score"], PasswordStrengthResult["label"]> = {
    0: "Sangat Lemah",
    1: "Lemah",
    2: "Cukup",
    3: "Kuat",
    4: "Sangat Kuat",
  };

  return {
    score,
    label: labels[score],
    isCommercialReady: checks.minLength && checks.hasLower && (checks.hasUpper || checks.hasDigit),
    checks,
  };
}

const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = (rateBuckets.get(key) ?? []).filter((ts) => ts > cutoff);

  if (existing.length >= maxRequests) {
    const oldest = existing[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateBuckets.set(key, existing);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  existing.push(now);
  rateBuckets.set(key, existing);

  // Prevent unbounded memory growth across long server lifetimes
  if (rateBuckets.size > 2000) {
    for (const [k, list] of rateBuckets.entries()) {
      if (list.every((ts) => ts <= cutoff)) {
        rateBuckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitBucketsForTest(): void {
  rateBuckets.clear();
}

export function getClientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
