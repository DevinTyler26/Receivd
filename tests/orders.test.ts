import { describe, expect, it } from "vitest";
import type { OrderMetadata, OrderTrackingState, ReceivdSettings } from "../src/types";
import { combineOrders, effectiveOrderStatus, orderDaysPastEstimate } from "../src/utils/orders";

const refundedMetadata: OrderMetadata = {
  marketplace: "tcgplayer",
  orderNumber: "REFUND-1",
  refund: { kind: "full", amount: 49.03 },
  items: [],
  lastSeenAt: "2026-08-10T12:00:00.000Z"
};

describe("effective order status", () => {
  const cutoffSettings: ReceivdSettings = {
    schemaVersion: 1,
    receivedThroughDate: "2026-08-01",
    receivedThroughUpdatedAt: 200,
    updatedAt: 200
  };

  it("recognizes a marketplace-confirmed full refund", () => {
    expect(effectiveOrderStatus(refundedMetadata, undefined)).toBe("refunded");
  });

  it("does not automatically resolve a partial refund", () => {
    expect(
      effectiveOrderStatus({ ...refundedMetadata, refund: { kind: "partial", amount: 5 } }, undefined)
    ).toBe("pending");
  });

  it("lets an explicit Receivd status override marketplace metadata", () => {
    const tracking: OrderTrackingState = {
      schemaVersion: 1,
      orderNumber: refundedMetadata.orderNumber,
      status: "missing",
      updatedAt: 100
    };
    expect(effectiveOrderStatus(refundedMetadata, tracking)).toBe("missing");
  });

  it("treats orders on or before the received-through date as delivered", () => {
    const metadata = { ...refundedMetadata, refund: undefined, orderedAt: "2026-08-01T07:00:00.000Z" };
    expect(effectiveOrderStatus(metadata, undefined, cutoffSettings)).toBe("delivered");
  });

  it("keeps full refunds refunded and treats partial refunds as delivered within the cutoff", () => {
    const metadata = { ...refundedMetadata, orderedAt: "2026-07-31T07:00:00.000Z" };
    expect(effectiveOrderStatus(metadata, undefined, cutoffSettings)).toBe("refunded");
    expect(
      effectiveOrderStatus(
        { ...metadata, refund: { kind: "partial", amount: 5 } },
        undefined,
        cutoffSettings
      )
    ).toBe("delivered");
  });

  it("lets the cutoff replace older state but preserves a later manual status change", () => {
    const metadata = { ...refundedMetadata, refund: undefined, orderedAt: "2026-07-31T07:00:00.000Z" };
    const tracking: OrderTrackingState = {
      schemaVersion: 1,
      orderNumber: metadata.orderNumber,
      status: "missing",
      updatedAt: 100
    };
    expect(effectiveOrderStatus(metadata, tracking, cutoffSettings)).toBe("delivered");
    expect(effectiveOrderStatus(metadata, { ...tracking, updatedAt: 201 }, cutoffSettings)).toBe("missing");
  });

  it("does not apply the cutoff to newer orders", () => {
    const metadata = { ...refundedMetadata, refund: undefined, orderedAt: "2026-08-02T07:00:00.000Z" };
    expect(effectiveOrderStatus(metadata, undefined, cutoffSettings)).toBe("pending");
  });

  it("only treats pending orders past their estimate as overdue", () => {
    const metadata = {
      ...refundedMetadata,
      refund: undefined,
      estimatedDeliveryAt: "2026-08-01T07:00:00.000Z"
    };
    const pending = combineOrders({ [metadata.orderNumber]: metadata }, {})[0];
    const delivered = { ...pending, status: "delivered" as const };
    expect(orderDaysPastEstimate(pending, new Date("2026-08-10T12:00:00.000Z"))).toBe(9);
    expect(orderDaysPastEstimate(delivered, new Date("2026-08-10T12:00:00.000Z"))).toBeUndefined();
  });

  it("sorts overdue pending orders ahead of ordinary pending orders", () => {
    const orders = combineOrders(
      {
        overdue: {
          ...refundedMetadata,
          orderNumber: "overdue",
          refund: undefined,
          estimatedDeliveryAt: "2020-01-01T00:00:00.000Z"
        },
        ordinary: { ...refundedMetadata, orderNumber: "ordinary", refund: undefined }
      },
      {}
    );
    expect(orders.map((order) => order.orderNumber)).toEqual(["overdue", "ordinary"]);
  });
});
