import {
  NOTE_MAX_LENGTH,
  STORAGE_SCHEMA_VERSION,
  type ItemReceiptState,
  type OrderMetadata,
  type OrderStatus,
  type OrderTrackingState
} from "../types";
import { deriveStatusFromQuantities, effectiveReceivedQuantity } from "../utils/quantities";
import { storageGetAll, storageSet } from "./chromeStorage";
import { SCHEMA_KEY, TRACKING_PREFIX, trackingKey } from "./keys";
import { chooseNewerTrackingState, trackingStatesEqual } from "./reconciliation";

function isTrackingState(value: unknown): value is OrderTrackingState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OrderTrackingState>;
  return (
    candidate.schemaVersion === STORAGE_SCHEMA_VERSION &&
    typeof candidate.orderNumber === "string" &&
    ["pending", "delivered", "partial", "missing", "refunded"].includes(candidate.status ?? "") &&
    typeof candidate.updatedAt === "number"
  );
}

function trackingFromValues(values: Record<string, unknown>): Record<string, OrderTrackingState> {
  const tracking: Record<string, OrderTrackingState> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith(TRACKING_PREFIX) && isTrackingState(value)) tracking[value.orderNumber] = value;
  }
  return tracking;
}

async function safelyGetArea(area: "local" | "sync"): Promise<Record<string, unknown>> {
  try {
    return await storageGetAll(area);
  } catch {
    return {};
  }
}

export async function getTrackingStates(): Promise<Record<string, OrderTrackingState>> {
  const [localValues, syncValues] = await Promise.all([safelyGetArea("local"), safelyGetArea("sync")]);
  const local = trackingFromValues(localValues);
  const synced = trackingFromValues(syncValues);
  const orderNumbers = new Set([...Object.keys(local), ...Object.keys(synced)]);
  const result: Record<string, OrderTrackingState> = {};

  for (const orderNumber of orderNumbers) {
    const chosen = chooseNewerTrackingState(local[orderNumber], synced[orderNumber]);
    if (chosen) result[orderNumber] = chosen;
  }
  return result;
}

export async function writeTrackingState(state: OrderTrackingState): Promise<OrderTrackingState> {
  const key = trackingKey(state.orderNumber);
  const payload = {
    [SCHEMA_KEY]: { version: STORAGE_SCHEMA_VERSION },
    [key]: state
  };

  // The local mirror is the offline/no-Sync fallback. Sync is best effort and
  // contains only the compact, user-created tracking record.
  await storageSet("local", payload);
  try {
    await storageSet("sync", payload);
  } catch (error) {
    console.info("Receivd: Chrome Sync unavailable; saved tracking locally.", error);
  }
  return state;
}

export async function reconcileTrackingStores(): Promise<void> {
  const [localValues, syncValues] = await Promise.all([safelyGetArea("local"), safelyGetArea("sync")]);
  const local = trackingFromValues(localValues);
  const synced = trackingFromValues(syncValues);
  const orderNumbers = new Set([...Object.keys(local), ...Object.keys(synced)]);
  const localUpdates: Record<string, unknown> = {};
  const syncUpdates: Record<string, unknown> = {};

  for (const orderNumber of orderNumbers) {
    const chosen = chooseNewerTrackingState(local[orderNumber], synced[orderNumber]);
    if (!chosen) continue;
    const key = trackingKey(orderNumber);
    if (!trackingStatesEqual(local[orderNumber], chosen)) localUpdates[key] = chosen;
    if (!trackingStatesEqual(synced[orderNumber], chosen)) syncUpdates[key] = chosen;
  }

  if (Object.keys(localUpdates).length) await storageSet("local", localUpdates);
  if (Object.keys(syncUpdates).length) {
    try {
      await storageSet("sync", syncUpdates);
    } catch {
      // Local tracking remains authoritative on this device until Sync returns.
    }
  }
}

async function updateTracking(
  orderNumber: string,
  updater: (current: OrderTrackingState | undefined, now: number) => OrderTrackingState
): Promise<OrderTrackingState> {
  const current = (await getTrackingStates())[orderNumber];
  const now = Date.now();
  return writeTrackingState(updater(current, now));
}

export async function setOrderStatus(orderNumber: string, status: OrderStatus): Promise<OrderTrackingState> {
  return updateTracking(orderNumber, (current, now) => ({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    orderNumber,
    status,
    items: current?.items,
    note: current?.note,
    updatedAt: now
  }));
}

export async function setOrderNote(orderNumber: string, note: string): Promise<OrderTrackingState> {
  const normalized = note.trim().slice(0, NOTE_MAX_LENGTH);
  return updateTracking(orderNumber, (current, now) => ({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    orderNumber,
    status: current?.status ?? "pending",
    items: current?.items,
    note: normalized || undefined,
    updatedAt: now
  }));
}

export async function setItemReceivedQuantity(
  orderNumber: string,
  itemId: string,
  quantityReceived: number,
  metadata: OrderMetadata
): Promise<OrderTrackingState> {
  return updateTracking(orderNumber, (current, now) => {
    const nextItems: Record<string, ItemReceiptState> = {};
    for (const item of metadata.items) {
      nextItems[item.id] = {
        quantityReceived:
          item.id === itemId
            ? Math.max(0, Math.min(item.quantityOrdered, Math.floor(quantityReceived)))
            : effectiveReceivedQuantity(item, current),
        updatedAt: item.id === itemId ? now : current?.items?.[item.id]?.updatedAt ?? now
      };
    }

    const derivedStatus = deriveStatusFromQuantities(metadata.items, nextItems, current?.status ?? "pending");
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      orderNumber,
      status: derivedStatus,
      items: derivedStatus === "delivered" ? undefined : nextItems,
      note: current?.note,
      updatedAt: now
    };
  });
}
