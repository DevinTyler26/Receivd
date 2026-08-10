import type { OrderMetadata } from "../types";
import { STORAGE_SCHEMA_VERSION } from "../types";
import { isInvalidLegacyOrderMetadata } from "../marketplaces/tcgplayer/orderIdentity";
import { storageGet, storageGetAll, storageRemove, storageSet } from "./chromeStorage";
import { METADATA_PREFIX, SCHEMA_KEY, metadataKey } from "./keys";
import { reconcileOrderMetadata } from "./reconciliation";

const LAST_SEEN_WRITE_INTERVAL = 5 * 60 * 1000;

function isOrderMetadata(value: unknown): value is OrderMetadata {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OrderMetadata>;
  return (
    candidate.marketplace === "tcgplayer" &&
    typeof candidate.orderNumber === "string" &&
    Array.isArray(candidate.items) &&
    typeof candidate.lastSeenAt === "string"
  );
}

function meaningfullyEqual(left: OrderMetadata, right: OrderMetadata): boolean {
  return JSON.stringify({ ...left, lastSeenAt: "" }) === JSON.stringify({ ...right, lastSeenAt: "" });
}

export async function getLocalOrders(): Promise<Record<string, OrderMetadata>> {
  const values = await storageGetAll("local");
  const orders: Record<string, OrderMetadata> = {};
  const invalidLegacyKeys: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!key.startsWith(METADATA_PREFIX) || !isOrderMetadata(value)) continue;
    if (isInvalidLegacyOrderMetadata(value)) {
      invalidLegacyKeys.push(key);
      continue;
    }
    orders[value.orderNumber] = value;
  }
  if (invalidLegacyKeys.length) await storageRemove("local", invalidLegacyKeys);
  return orders;
}

export async function getLocalOrder(orderNumber: string): Promise<OrderMetadata | undefined> {
  const key = metadataKey(orderNumber);
  const values = await storageGet("local", key);
  return isOrderMetadata(values[key]) ? values[key] : undefined;
}

export async function upsertLocalOrder(incoming: OrderMetadata): Promise<OrderMetadata> {
  const key = metadataKey(incoming.orderNumber);
  const existing = await getLocalOrder(incoming.orderNumber);
  const reconciled = reconcileOrderMetadata(existing, incoming);
  const lastWrite = existing ? Date.parse(existing.lastSeenAt) : 0;
  const shouldWrite =
    !existing ||
    !meaningfullyEqual(existing, reconciled) ||
    !Number.isFinite(lastWrite) ||
    Date.now() - lastWrite >= LAST_SEEN_WRITE_INTERVAL;

  if (shouldWrite) {
    await storageSet("local", {
      [SCHEMA_KEY]: { version: STORAGE_SCHEMA_VERSION },
      [key]: reconciled
    });
  }
  return reconciled;
}

export async function upsertLocalOrders(orders: OrderMetadata[]): Promise<OrderMetadata[]> {
  return Promise.all(orders.map(upsertLocalOrder));
}
