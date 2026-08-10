import { describe, expect, it } from "vitest";
import type { OrderMetadata, OrderTrackingState } from "../src/types";
import { combineOrders, effectiveOrderStatus, orderDaysPastEstimate } from "../src/utils/orders";

const refundedMetadata: OrderMetadata = {
  marketplace: "tcgplayer",
  orderNumber: "REFUND-1",
  refund: { kind: "full", amount: 49.03 },
  items: [],
  lastSeenAt: "2026-08-10T12:00:00.000Z"
};

describe("effective order status", () => {
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
