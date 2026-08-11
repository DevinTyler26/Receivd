import { getLocalOrders } from "../storage/localOrders";
import { getSettings, reconcileSettingsStores } from "../storage/settings";
import { getTrackingStates, reconcileTrackingStores } from "../storage/tracking";
import { combineOrders } from "../utils/orders";

let updateTimer: ReturnType<typeof setTimeout> | undefined;

async function reconcileStores(): Promise<void> {
  await Promise.all([reconcileTrackingStores(), reconcileSettingsStores()]);
}

async function updateActionBadge(): Promise<void> {
  try {
    const [metadata, tracking, settings] = await Promise.all([
      getLocalOrders(),
      getTrackingStates(),
      getSettings()
    ]);
    const needsAttention = combineOrders(metadata, tracking, settings).filter(
      (order) => order.status !== "delivered" && order.status !== "refunded"
    ).length;
    await chrome.action.setBadgeBackgroundColor({ color: "#3153a4" });
    await chrome.action.setBadgeText({ text: needsAttention ? (needsAttention > 999 ? "999+" : String(needsAttention)) : "" });
    await chrome.action.setTitle({
      title: needsAttention ? `Receivd · ${needsAttention} order${needsAttention === 1 ? "" : "s"} need attention` : "Receivd · All caught up"
    });
  } catch (error) {
    console.info("Receivd: badge update skipped.", error);
  }
}

function scheduleBadgeUpdate(): void {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => void updateActionBadge(), 150);
}

chrome.runtime.onInstalled.addListener(() => {
  void reconcileStores().finally(updateActionBadge);
});

chrome.runtime.onStartup.addListener(() => {
  void reconcileStores().finally(updateActionBadge);
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "sync") void reconcileStores();
  scheduleBadgeUpdate();
});

void updateActionBadge();
