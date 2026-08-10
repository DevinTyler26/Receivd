import { useCallback, useEffect, useState } from "react";
import { OrderItemChecklist } from "../components/OrderItemChecklist";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { OrderStatusMenu } from "../components/OrderStatusMenu";
import { getTrackingStates, setItemReceivedQuantity, setOrderStatus } from "../storage/tracking";
import type { OrderMetadata, OrderStatus, OrderTrackingState } from "../types";
import { daysPastEstimatedDelivery, orderAgeLabel, pastEstimateLabel } from "../utils/dates";
import { effectiveOrderStatus } from "../utils/orders";
import { missingLineCount, totalMissingQuantity } from "../utils/quantities";

export function OrderControl({ metadata }: { metadata: OrderMetadata }) {
  const [tracking, setTracking] = useState<OrderTrackingState>();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const status = effectiveOrderStatus(metadata, tracking);

  const refresh = useCallback(async () => {
    const allTracking = await getTrackingStates();
    setTracking(allTracking[metadata.orderNumber]);
  }, [metadata.orderNumber]);

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const changeStatus = async (nextStatus: OrderStatus) => {
    setExpanded(false);
    setSaving(true);
    try {
      setTracking(await setOrderStatus(metadata.orderNumber, nextStatus));
      window.dispatchEvent(new Event("receivd:rescan"));
    } finally {
      setSaving(false);
    }
  };

  const changeQuantity = async (itemId: string, quantity: number) => {
    setSaving(true);
    try {
      setTracking(await setItemReceivedQuantity(metadata.orderNumber, itemId, quantity, metadata));
    } finally {
      setSaving(false);
    }
  };

  const missingLines = missingLineCount(metadata.items, tracking);
  const missingCards = totalMissingQuantity(metadata.items, tracking);
  const age = orderAgeLabel(metadata.orderedAt);
  const overdueDays =
    status === "pending" ? daysPastEstimatedDelivery(metadata.estimatedDeliveryAt) : undefined;

  return (
    <section
      aria-label={`Receivd tracking for order ${metadata.orderNumber}`}
      className={`receivd-inline${overdueDays ? " is-overdue" : ""}`}
    >
      <div className="receivd-inline-bar">
        <button
          aria-expanded={expanded}
          className="receivd-inline-toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <OrderStatusBadge compact status={status} />
          <span className={`receivd-inline-context${overdueDays ? " is-overdue" : ""}`}>
            {status === "partial" && missingCards > 0
              ? `${missingCards} card${missingCards === 1 ? "" : "s"} missing`
              : overdueDays
                ? `⚠ Past estimated delivery · ${pastEstimateLabel(overdueDays)}`
                : age}
          </span>
          <span aria-hidden="true" className="receivd-chevron">{expanded ? "−" : "+"}</span>
        </button>
      </div>
      {expanded && (
        <div className="receivd-inline-panel">
          <OrderStatusMenu disabled={saving} onChange={changeStatus} value={status} />
          {status === "partial" && (
            <div className="receivd-inline-checklist">
              <p className="receivd-inline-help">
                {missingLines
                  ? `${missingLines} line item${missingLines === 1 ? "" : "s"} still incomplete.`
                  : "Set the quantities that arrived."}
              </p>
              <OrderItemChecklist
                dense
                disabled={saving}
                items={metadata.items}
                onQuantityChange={changeQuantity}
                status={status}
                tracking={tracking}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
