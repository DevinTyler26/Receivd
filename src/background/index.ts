import { getLocalOrders } from "../storage/localOrders";
import { getTrackingStates, reconcileTrackingStores } from "../storage/tracking";
import { combineOrders } from "../utils/orders";

let updateTimer: ReturnType<typeof setTimeout> | undefined;

async function updateActionBadge(): Promise<void> {
  try {
    const [metadata, tracking] = await Promise.all([getLocalOrders(), getTrackingStates()]);
    const needsAttention = combineOrders(metadata, tracking).filter(
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
  void reconcileTrackingStores().finally(updateActionBadge);
});

chrome.runtime.onStartup.addListener(() => {
  void reconcileTrackingStores().finally(updateActionBadge);
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "sync") void reconcileTrackingStores();
  scheduleBadgeUpdate();
});

void updateActionBadge();
