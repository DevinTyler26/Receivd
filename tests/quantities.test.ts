import { describe, expect, it } from "vitest";
import type { ItemReceiptState, OrderItemMetadata, OrderTrackingState } from "../src/types";
import { deriveStatusFromQuantities, missingQuantity, totalMissingQuantity } from "../src/utils/quantities";

const items: OrderItemMetadata[] = [
  { id: "pikachu", name: "Pikachu", quantityOrdered: 4 },
  { id: "mew", name: "Mew", quantityOrdered: 1 }
];

function receipt(quantityReceived: number): ItemReceiptState {
  return { quantityReceived, updatedAt: 100 };
}

describe("quantity tracking", () => {
  it("calculates one missing when four were ordered and three received", () => {
    const tracking: OrderTrackingState = {
      schemaVersion: 1,
      orderNumber: "123",
      status: "partial",
      items: { pikachu: receipt(3) },
      updatedAt: 100
    };
    expect(missingQuantity(items[0], tracking)).toBe(1);
    expect(totalMissingQuantity(items, tracking)).toBe(2);
  });

  it("derives delivered only when every ordered quantity arrived", () => {
    expect(deriveStatusFromQuantities(items, { pikachu: receipt(4), mew: receipt(1) }, "partial")).toBe(
      "delivered"
    );
  });

  it("derives partial when some but not all cards arrived", () => {
    expect(deriveStatusFromQuantities(items, { pikachu: receipt(3), mew: receipt(0) }, "pending")).toBe(
      "partial"
    );
  });

  it("does not override an explicit missing status when all quantities are zero", () => {
    expect(deriveStatusFromQuantities(items, {}, "missing")).toBe("missing");
  });
});
