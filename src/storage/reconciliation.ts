import type { OrderItemMetadata, OrderMetadata, OrderTrackingState } from "../types";

function defined<T>(newValue: T | undefined, existingValue: T | undefined): T | undefined {
  return newValue ?? existingValue;
}

function mergeItemMetadata(existing: OrderItemMetadata, incoming: OrderItemMetadata): OrderItemMetadata {
  return {
    id: incoming.id,
    name: incoming.name || existing.name,
    quantityOrdered: incoming.quantityOrdered || existing.quantityOrdered,
    set: defined(incoming.set, existing.set),
    condition: defined(incoming.condition, existing.condition),
    printing: defined(incoming.printing, existing.printing),
    seller: defined(incoming.seller, existing.seller),
    price: defined(incoming.price, existing.price),
    productUrl: defined(incoming.productUrl, existing.productUrl),
    productId: defined(incoming.productId, existing.productId),
    orderLineId: defined(incoming.orderLineId, existing.orderLineId)
  };
}

export function reconcileOrderMetadata(existing: OrderMetadata | undefined, incoming: OrderMetadata): OrderMetadata {
  if (!existing) return incoming;

  const items = new Map(existing.items.map((item) => [item.id, item]));
  for (const item of incoming.items) {
    const previous = items.get(item.id);
    items.set(item.id, previous ? mergeItemMetadata(previous, item) : item);
  }

  return {
    marketplace: incoming.marketplace,
    orderNumber: incoming.orderNumber,
    orderedAt: defined(incoming.orderedAt, existing.orderedAt),
    seller: defined(incoming.seller, existing.seller),
    total: defined(incoming.total, existing.total),
    currency: defined(incoming.currency, existing.currency),
    trackingNumber: defined(incoming.trackingNumber, existing.trackingNumber),
    trackingUrl: defined(incoming.trackingUrl, existing.trackingUrl),
    contactUrl: defined(incoming.contactUrl, existing.contactUrl),
    shippingStatus: defined(incoming.shippingStatus, existing.shippingStatus),
    estimatedDeliveryAt: defined(incoming.estimatedDeliveryAt, existing.estimatedDeliveryAt),
    refund: defined(incoming.refund, existing.refund),
    sourceUrl: defined(incoming.sourceUrl, existing.sourceUrl),
    items: [...items.values()],
    lastSeenAt: incoming.lastSeenAt
  };
}

function canonicalTrackingState(state: OrderTrackingState): string {
  const sortedItems = Object.fromEntries(
    Object.entries(state.items ?? {}).sort(([left], [right]) => left.localeCompare(right))
  );
  return JSON.stringify({ ...state, items: sortedItems });
}

export function trackingStatesEqual(
  left: OrderTrackingState | undefined,
  right: OrderTrackingState | undefined
): boolean {
  if (!left || !right) return left === right;
  return canonicalTrackingState(left) === canonicalTrackingState(right);
}

export function chooseNewerTrackingState(
  left: OrderTrackingState | undefined,
  right: OrderTrackingState | undefined
): OrderTrackingState | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? left : right;

  // A lexical tie-break makes the result deterministic even if two devices create
  // different changes in the same millisecond.
  return canonicalTrackingState(left) >= canonicalTrackingState(right) ? left : right;
}
