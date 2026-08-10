import type {
  ItemReceiptState,
  OrderItemMetadata,
  OrderStatus,
  OrderTrackingState
} from "../types";

export function effectiveReceivedQuantity(
  item: OrderItemMetadata,
  tracking: OrderTrackingState | undefined
): number {
  if (tracking?.status === "delivered") return item.quantityOrdered;
  const received = tracking?.items?.[item.id]?.quantityReceived ?? 0;
  return Math.max(0, Math.min(item.quantityOrdered, received));
}

export function missingQuantity(item: OrderItemMetadata, tracking: OrderTrackingState | undefined): number {
  return Math.max(0, item.quantityOrdered - effectiveReceivedQuantity(item, tracking));
}

export function totalMissingQuantity(
  items: OrderItemMetadata[],
  tracking: OrderTrackingState | undefined
): number {
  return items.reduce((total, item) => total + missingQuantity(item, tracking), 0);
}

export function missingLineCount(items: OrderItemMetadata[], tracking: OrderTrackingState | undefined): number {
  return items.filter((item) => missingQuantity(item, tracking) > 0).length;
}

export function deriveStatusFromQuantities(
  items: OrderItemMetadata[],
  receiptStates: Record<string, ItemReceiptState>,
  explicitStatus: OrderStatus
): OrderStatus {
  if (!items.length) return explicitStatus;
  const ordered = items.reduce((total, item) => total + item.quantityOrdered, 0);
  const received = items.reduce(
    (total, item) => total + Math.min(item.quantityOrdered, receiptStates[item.id]?.quantityReceived ?? 0),
    0
  );
  if (received === ordered) return "delivered";
  if (received > 0) return "partial";
  return explicitStatus === "missing" ? "missing" : explicitStatus;
}
