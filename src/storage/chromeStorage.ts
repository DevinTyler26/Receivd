export type StorageAreaName = "local" | "sync";

function storageArea(name: StorageAreaName): chrome.storage.StorageArea {
  if (typeof chrome === "undefined" || !chrome.storage?.[name]) {
    throw new Error(`Browser ${name} extension storage is unavailable`);
  }
  return chrome.storage[name];
}

export async function storageGetAll(name: StorageAreaName): Promise<Record<string, unknown>> {
  return (await storageArea(name).get(null)) as Record<string, unknown>;
}

export async function storageGet(
  name: StorageAreaName,
  keys: string | string[]
): Promise<Record<string, unknown>> {
  return (await storageArea(name).get(keys)) as Record<string, unknown>;
}

export async function storageSet(name: StorageAreaName, values: Record<string, unknown>): Promise<void> {
  await storageArea(name).set(values);
}

export async function storageRemove(name: StorageAreaName, keys: string | string[]): Promise<void> {
  await storageArea(name).remove(keys);
}
