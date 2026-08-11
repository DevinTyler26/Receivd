import { STORAGE_SCHEMA_VERSION, type ReceivdSettings } from "../types";
import { storageGet, storageSet } from "./chromeStorage";
import { SCHEMA_KEY, SETTINGS_KEY } from "./keys";

export const EMPTY_SETTINGS: ReceivdSettings = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  updatedAt: 0
};

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isSettings(value: unknown): value is ReceivdSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReceivdSettings>;
  return (
    candidate.schemaVersion === STORAGE_SCHEMA_VERSION &&
    typeof candidate.updatedAt === "number" &&
    (candidate.receivedThroughDate === undefined || isDateOnly(candidate.receivedThroughDate)) &&
    (candidate.receivedThroughUpdatedAt === undefined ||
      typeof candidate.receivedThroughUpdatedAt === "number")
  );
}

function chooseNewerSettings(
  left: ReceivdSettings | undefined,
  right: ReceivdSettings | undefined
): ReceivdSettings | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? left : right;
  return JSON.stringify(left) >= JSON.stringify(right) ? left : right;
}

function settingsEqual(
  left: ReceivdSettings | undefined,
  right: ReceivdSettings | undefined
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function safelyRead(area: "local" | "sync"): Promise<ReceivdSettings | undefined> {
  try {
    const result = await storageGet(area, SETTINGS_KEY);
    return isSettings(result[SETTINGS_KEY]) ? result[SETTINGS_KEY] : undefined;
  } catch {
    return undefined;
  }
}

export async function getSettings(): Promise<ReceivdSettings> {
  const [local, synced] = await Promise.all([safelyRead("local"), safelyRead("sync")]);
  return chooseNewerSettings(local, synced) ?? EMPTY_SETTINGS;
}

export async function reconcileSettingsStores(): Promise<void> {
  const [local, synced] = await Promise.all([safelyRead("local"), safelyRead("sync")]);
  const chosen = chooseNewerSettings(local, synced);
  if (!chosen) return;
  const payload = {
    [SCHEMA_KEY]: { version: STORAGE_SCHEMA_VERSION },
    [SETTINGS_KEY]: chosen
  };
  if (!settingsEqual(local, chosen)) await storageSet("local", payload);
  if (!settingsEqual(synced, chosen)) {
    try {
      await storageSet("sync", payload);
    } catch {
      // The local settings mirror remains usable until Chrome Sync returns.
    }
  }
}

export async function setReceivedThroughDate(date?: string): Promise<ReceivdSettings> {
  if (date !== undefined && !isDateOnly(date)) throw new Error("Choose a valid received-through date.");

  const current = await getSettings();
  const now = Date.now();
  const next: ReceivdSettings = {
    ...current,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    receivedThroughDate: date,
    receivedThroughUpdatedAt: now,
    updatedAt: now
  };
  const payload = {
    [SCHEMA_KEY]: { version: STORAGE_SCHEMA_VERSION },
    [SETTINGS_KEY]: next
  };

  await storageSet("local", payload);
  try {
    await storageSet("sync", payload);
  } catch (error) {
    console.info("Receivd: Chrome Sync unavailable; saved settings locally.", error);
  }
  return next;
}
