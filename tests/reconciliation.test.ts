import { describe, expect, it } from "vitest";
import type { OrderMetadata, OrderTrackingState } from "../src/types";
import { chooseNewerTrackingState, reconcileOrderMetadata } from "../src/storage/reconciliation";

const original: OrderMetadata = {
  marketplace: "tcgplayer",
  orderNumber: "12345678",
  seller: "Card Castle",
  estimatedDeliveryAt: "2026-08-07T07:00:00.000Z",
  items: [{ id: "line:1", name: "Pikachu", quantityOrdered: 4, condition: "Near Mint" }],
  lastSeenAt: "2026-08-01T00:00:00.000Z"
};

describe("order reconciliation", () => {
  it("enriches marketplace metadata without touching user tracking state", () => {
    const tracking: OrderTrackingState = {
      schemaVersion: 1,
      orderNumber: "12345678",
      status: "partial",
      items: { "line:1": { quantityReceived: 3, updatedAt: 25 } },
      note: "Missing one Pikachu",
      updatedAt: 25
    };
    const refreshed = reconcileOrderMetadata(original, {
      marketplace: "tcgplayer",
      orderNumber: "12345678",
      total: 18.42,
      items: [
        { id: "line:1", name: "Pikachu", quantityOrdered: 4 },
        { id: "line:2", name: "Mew", quantityOrdered: 1 }
      ],
      lastSeenAt: "2026-08-02T00:00:00.000Z"
    });

    expect(refreshed.items).toHaveLength(2);
    expect(refreshed.items[0].condition).toBe("Near Mint");
    expect(refreshed.estimatedDeliveryAt).toBe("2026-08-07T07:00:00.000Z");
    expect(tracking).toMatchObject({
      status: "partial",
      note: "Missing one Pikachu",
      items: { "line:1": { quantityReceived: 3 } }
    });
  });
});

describe("sync conflict handling", () => {
  const older: OrderTrackingState = {
    schemaVersion: 1,
    orderNumber: "12345678",
    status: "pending",
    updatedAt: 100
  };
  const newer: OrderTrackingState = {
    schemaVersion: 1,
    orderNumber: "12345678",
    status: "delivered",
    updatedAt: 200
  };

  it("selects the state with the newer user timestamp", () => {
    expect(chooseNewerTrackingState(older, newer)).toBe(newer);
    expect(chooseNewerTrackingState(newer, older)).toBe(newer);
  });

  it("uses a deterministic tie-break for equal timestamps", () => {
    const tied = { ...older, status: "missing" as const };
    expect(chooseNewerTrackingState(older, tied)).toEqual(chooseNewerTrackingState(tied, older));
  });
});
