export const STORAGE_SCHEMA_VERSION = 1 as const;
export const NOTE_MAX_LENGTH = 500;

export type Marketplace = "tcgplayer";

export type OrderStatus = "pending" | "delivered" | "partial" | "missing" | "refunded";

export interface OrderRefundMetadata {
  kind: "full" | "partial";
  amount?: number;
  issuedAt?: string;
}

export interface OrderItemMetadata {
  id: string;
  name: string;
  quantityOrdered: number;
  set?: string;
  condition?: string;
  printing?: string;
  seller?: string;
  price?: number;
  productUrl?: string;
  productId?: string;
  orderLineId?: string;
}

export interface OrderMetadata {
  marketplace: Marketplace;
  orderNumber: string;
  orderedAt?: string;
  seller?: string;
  total?: number;
  currency?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  contactUrl?: string;
  shippingStatus?: string;
  estimatedDeliveryAt?: string;
  refund?: OrderRefundMetadata;
  items: OrderItemMetadata[];
  sourceUrl?: string;
  lastSeenAt: string;
}

export interface ItemReceiptState {
  quantityReceived: number;
  updatedAt: number;
}

export interface OrderTrackingState {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  orderNumber: string;
  status: OrderStatus;
  items?: Record<string, ItemReceiptState>;
  note?: string;
  updatedAt: number;
}

export interface ReceivdSettings {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  /** Inclusive marketplace order-date cutoff, formatted as YYYY-MM-DD. */
  receivedThroughDate?: string;
  /** Timestamp for this specific preference so later manual status edits can win. */
  receivedThroughUpdatedAt?: number;
  updatedAt: number;
}

export interface DisplayOrder {
  orderNumber: string;
  metadata?: OrderMetadata;
  tracking?: OrderTrackingState;
  status: OrderStatus;
}
