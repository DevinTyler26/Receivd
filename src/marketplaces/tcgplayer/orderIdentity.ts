import type { OrderMetadata } from "../../types";

// Observed TCGplayer marketplace orders use 8-6-5 alphanumeric segments;
// Direct uses YYMMDD-XXXX. Keep legacy long-numeric IDs as a cautious fallback.
const ORDER_NUMBER_PATTERN = /^(?:[A-Z0-9]{8}-[A-Z0-9]{6}-[A-Z0-9]{5}|\d{6}-[A-Z0-9]{4}|\d{8,})$/i;

export function isLikelyTcgplayerOrderNumber(orderNumber: string): boolean {
  return ORDER_NUMBER_PATTERN.test(orderNumber.trim());
}

export function isInvalidLegacyOrderMetadata(metadata: OrderMetadata): boolean {
  return !isLikelyTcgplayerOrderNumber(metadata.orderNumber) && metadata.items.length === 0;
}
