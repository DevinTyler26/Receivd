import type { DisplayOrder, OrderMetadata, OrderStatus, OrderTrackingState } from "../types";
import { daysPastEstimatedDelivery } from "./dates";

export function effectiveOrderStatus(
  metadata: OrderMetadata | undefined,
  tracking: OrderTrackingState | undefined
): OrderStatus {
  if (tracking) return tracking.status;
  return metadata?.refund?.kind === "full" ? "refunded" : "pending";
}

export function combineOrders(
  metadataByOrder: Record<string, OrderMetadata>,
  trackingByOrder: Record<string, OrderTrackingState>
): DisplayOrder[] {
  const orderNumbers = new Set([...Object.keys(metadataByOrder), ...Object.keys(trackingByOrder)]);

  return [...orderNumbers]
    .map((orderNumber) => ({
      orderNumber,
      metadata: metadataByOrder[orderNumber],
      tracking: trackingByOrder[orderNumber],
      status: effectiveOrderStatus(metadataByOrder[orderNumber], trackingByOrder[orderNumber])
    }))
    .sort(compareDisplayOrders);
}

const statusPriority: Record<OrderStatus, number> = {
  missing: 0,
  partial: 1,
  pending: 2,
  refunded: 3,
  delivered: 4
};

function compareDisplayOrders(left: DisplayOrder, right: DisplayOrder): number {
  const statusDifference = statusPriority[left.status] - statusPriority[right.status];
  if (statusDifference !== 0) return statusDifference;

  if (left.status === "pending") {
    const leftOverdue = daysPastEstimatedDelivery(left.metadata?.estimatedDeliveryAt) ?? 0;
    const rightOverdue = daysPastEstimatedDelivery(right.metadata?.estimatedDeliveryAt) ?? 0;
    if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue;
  }

  const leftDate = Date.parse(left.metadata?.orderedAt ?? "") || left.tracking?.updatedAt || 0;
  const rightDate = Date.parse(right.metadata?.orderedAt ?? "") || right.tracking?.updatedAt || 0;
  return rightDate - leftDate || left.orderNumber.localeCompare(right.orderNumber);
}

export function orderDaysPastEstimate(order: DisplayOrder, now = new Date()): number | undefined {
  return order.status === "pending"
    ? daysPastEstimatedDelivery(order.metadata?.estimatedDeliveryAt, now)
    : undefined;
}

export function matchesOrderSearch(order: DisplayOrder, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  const metadata = order.metadata;
  return [
    order.orderNumber,
    metadata?.seller,
    metadata?.trackingNumber,
    ...(metadata?.items.flatMap((item) => [item.name, item.seller]) ?? [])
  ].some((value) => value?.toLocaleLowerCase().includes(normalized));
}
