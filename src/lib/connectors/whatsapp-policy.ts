export const WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Free-form replies are permitted only within the 24-hour window after the latest inbound message. */
export function canSendFreeformReply(
  lastInboundAt: Date | string | number | null | undefined,
  now = Date.now(),
): boolean {
  if (lastInboundAt === null || lastInboundAt === undefined) return false;
  const timestamp = lastInboundAt instanceof Date
    ? lastInboundAt.getTime()
    : typeof lastInboundAt === "number"
      ? lastInboundAt
      : Date.parse(lastInboundAt);
  if (!Number.isFinite(timestamp) || timestamp > now) return false;
  return now - timestamp < WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS;
}

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
