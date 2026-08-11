export const METADATA_PREFIX = "receivd:metadata:v1:";
export const TRACKING_PREFIX = "receivd:tracking:v1:";
export const SCHEMA_KEY = "receivd:schema";
export const SETTINGS_KEY = "receivd:settings:v1";

function orderStorageSuffix(orderNumber: string): string {
  return encodeURIComponent(orderNumber.trim());
}

export function metadataKey(orderNumber: string): string {
  return `${METADATA_PREFIX}${orderStorageSuffix(orderNumber)}`;
}

export function trackingKey(orderNumber: string): string {
  return `${TRACKING_PREFIX}${orderStorageSuffix(orderNumber)}`;
}
