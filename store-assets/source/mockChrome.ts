type StoredValues = Record<string, unknown>;
type ChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: chrome.storage.AreaName
) => void;

function copyValues(values: StoredValues): StoredValues {
  return structuredClone(values);
}

function selectedValues(values: StoredValues, keys?: null | string | string[] | StoredValues): StoredValues {
  if (keys == null) return copyValues(values);
  if (typeof keys === "string") return keys in values ? { [keys]: structuredClone(values[keys]) } : {};
  if (Array.isArray(keys)) {
    return Object.fromEntries(
      keys.filter((key) => key in values).map((key) => [key, structuredClone(values[key])])
    );
  }
  return Object.fromEntries(
    Object.entries(keys).map(([key, fallback]) => [
      key,
      key in values ? structuredClone(values[key]) : structuredClone(fallback)
    ])
  );
}

function createStorageArea(
  areaName: chrome.storage.AreaName,
  initialValues: StoredValues,
  listeners: Set<ChangeListener>
): chrome.storage.StorageArea {
  const values = copyValues(initialValues);
  return {
    async get(keys?: null | string | string[] | StoredValues) {
      return selectedValues(values, keys);
    },
    async set(items: StoredValues) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: values[key], newValue: structuredClone(value) };
        values[key] = structuredClone(value);
      }
      for (const listener of listeners) listener(changes, areaName);
    },
    async remove(keys: string | string[]) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const key of typeof keys === "string" ? [keys] : keys) {
        if (!(key in values)) continue;
        changes[key] = { oldValue: values[key] };
        delete values[key];
      }
      for (const listener of listeners) listener(changes, areaName);
    },
    async clear() {
      const changes = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, { oldValue: value }])
      );
      for (const key of Object.keys(values)) delete values[key];
      for (const listener of listeners) listener(changes, areaName);
    }
  } as chrome.storage.StorageArea;
}

export function installMockChrome(localValues: StoredValues, syncValues: StoredValues): void {
  const listeners = new Set<ChangeListener>();
  const mockChrome = {
    storage: {
      local: createStorageArea("local", localValues, listeners),
      sync: createStorageArea("sync", syncValues, listeners),
      onChanged: {
        addListener(listener: ChangeListener) {
          listeners.add(listener);
        },
        removeListener(listener: ChangeListener) {
          listeners.delete(listener);
        }
      }
    },
    tabs: {
      async create() {
        return {};
      }
    }
  };

  if (typeof globalThis.chrome === "object") {
    Object.assign(globalThis.chrome, mockChrome);
  } else {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: mockChrome
    });
  }
}
