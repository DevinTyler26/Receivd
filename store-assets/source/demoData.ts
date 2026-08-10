import { metadataKey, SCHEMA_KEY, trackingKey } from "../../src/storage/keys";
import {
  STORAGE_SCHEMA_VERSION,
  type OrderItemMetadata,
  type OrderMetadata,
  type OrderTrackingState
} from "../../src/types";

const now = Date.now();

function daysFromToday(days: number): string {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + days);
  return value.toISOString();
}

function item(
  id: string,
  name: string,
  quantityOrdered: number,
  set: string,
  condition = "Near Mint"
): OrderItemMetadata {
  return { id, name, quantityOrdered, set, condition, printing: "Holofoil" };
}

function metadata(
  orderNumber: string,
  seller: string,
  orderedDaysAgo: number,
  items: OrderItemMetadata[],
  extra: Partial<OrderMetadata> = {}
): OrderMetadata {
  return {
    marketplace: "tcgplayer",
    orderNumber,
    orderedAt: daysFromToday(-orderedDaysAgo),
    seller,
    total: 24.68,
    currency: "USD",
    shippingStatus: "Shipped without tracking",
    items,
    sourceUrl: "https://store.tcgplayer.com/myaccount/orderhistory",
    lastSeenAt: new Date().toISOString(),
    ...extra
  };
}

export const overdueOrder = metadata(
  "DEMO0001-ABCD22-EF333",
  "Card Castle",
  18,
  [
    item("demo-pikachu", "Pikachu - 025/102", 4, "Base Set"),
    item("demo-mew", "Mew - 009", 1, "Black Star Promos", "Lightly Played")
  ],
  {
    contactUrl: "https://store.tcgplayer.com/myaccount/messagecenter/create/demo0001-abcd22-ef333?type=1",
    estimatedDeliveryAt: daysFromToday(-4),
    total: 13.57
  }
);

export const partialOrder = metadata(
  "DEMO0002-HIJK44-LM555",
  "Holo Haven",
  9,
  [
    item("demo-charizard", "Charizard - 4/102", 1, "Base Set"),
    item("demo-pikachu-2", "Pikachu - 025/102", 4, "Base Set"),
    item("demo-mew-2", "Mew - 009", 1, "Black Star Promos")
  ],
  {
    trackingNumber: "DEMO-TRACKING-2048",
    trackingUrl: "https://tools.usps.com/go/TrackConfirmAction.action?tLabels=DEMO-TRACKING-2048",
    shippingStatus: "Shipped with tracking",
    total: 58.42
  }
);

const missingOrder = metadata(
  "DEMO0003-NOPQ66-RS777",
  "Rare Finds TCG",
  24,
  [item("demo-squirtle", "Squirtle - 131", 1, "Expedition")],
  { total: 55.91 }
);

const deliveredOrder = metadata(
  "DEMO0004-TUVW88-XY999",
  "Mana Market",
  6,
  [item("demo-eevee", "Eevee - 188/167", 3, "Twilight Masquerade")],
  { total: 17.25 }
);

const refundedOrder = metadata(
  "DEMO0005-ZABC00-DE111",
  "Collector Corner",
  27,
  [item("demo-chikorita", "Chikorita - 1/111", 1, "Neo Genesis")],
  {
    total: 49.03,
    shippingStatus: "Canceled",
    refund: { kind: "full", amount: 49.03, issuedAt: daysFromToday(-7) }
  }
);

export const partialTracking: OrderTrackingState = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  orderNumber: partialOrder.orderNumber,
  status: "partial",
  items: {
    "demo-charizard": { quantityReceived: 1, updatedAt: now - 3_000 },
    "demo-pikachu-2": { quantityReceived: 3, updatedAt: now - 2_000 },
    "demo-mew-2": { quantityReceived: 0, updatedAt: now - 1_000 }
  },
  note: "Envelope arrived safely; two cards are still missing.",
  updatedAt: now - 1_000
};

const tracking: OrderTrackingState[] = [
  partialTracking,
  {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    orderNumber: missingOrder.orderNumber,
    status: "missing",
    note: "Seller contacted about a replacement.",
    updatedAt: now - 5_000
  },
  {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    orderNumber: deliveredOrder.orderNumber,
    status: "delivered",
    updatedAt: now - 8_000
  }
];

export const previewOrders = [overdueOrder, partialOrder, missingOrder, deliveredOrder, refundedOrder];

export function previewStorage(): {
  local: Record<string, unknown>;
  sync: Record<string, unknown>;
} {
  const local: Record<string, unknown> = { [SCHEMA_KEY]: { version: STORAGE_SCHEMA_VERSION } };
  const sync: Record<string, unknown> = { [SCHEMA_KEY]: { version: STORAGE_SCHEMA_VERSION } };
  for (const order of previewOrders) local[metadataKey(order.orderNumber)] = order;
  for (const state of tracking) {
    local[trackingKey(state.orderNumber)] = state;
    sync[trackingKey(state.orderNumber)] = state;
  }
  return { local, sync };
}
