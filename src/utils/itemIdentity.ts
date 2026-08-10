import type { OrderItemMetadata } from "../types";
import { normalizeIdentityPart } from "./text";

export interface ItemIdentityInput {
  orderLineId?: string;
  productId?: string;
  name?: string;
  set?: string;
  condition?: string;
  printing?: string;
  seller?: string;
  productUrl?: string;
  quantityOrdered?: number;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function createStableItemId(input: ItemIdentityInput): string {
  if (input.orderLineId) return `line:${normalizeIdentityPart(input.orderLineId)}`;

  const stableParts = [
    input.productId ? `product:${normalizeIdentityPart(input.productId)}` : `name:${normalizeIdentityPart(input.name)}`,
    input.productId ? "" : `set:${normalizeIdentityPart(input.set)}`,
    `condition:${normalizeIdentityPart(input.condition)}`,
    `printing:${normalizeIdentityPart(input.printing)}`,
    `seller:${normalizeIdentityPart(input.seller)}`,
    input.productId ? "" : `url:${normalizeIdentityPart(input.productUrl)}`,
    `quantity:${Math.max(1, input.quantityOrdered ?? 1)}`
  ].filter(Boolean);

  return `fingerprint:${fnv1a(stableParts.join("|"))}`;
}

export function withStableItemId(item: Omit<OrderItemMetadata, "id">): OrderItemMetadata {
  return { ...item, id: createStableItemId(item) };
}
