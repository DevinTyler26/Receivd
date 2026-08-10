import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTcgplayerOrders } from "../src/marketplaces/tcgplayer/extractOrders";

const fixture = readFileSync(resolve(process.cwd(), "tests/fixtures/tcgplayer-order-history.html"), "utf8");

describe("TCGplayer order history extraction", () => {
  it("extracts order metadata and line items from a stable fixture", () => {
    document.documentElement.innerHTML = fixture;
    const orders = extractTcgplayerOrders(document, {
      now: new Date("2026-08-10T12:00:00.000Z"),
      sourceUrl: "https://store.tcgplayer.com/myaccount/orderhistory"
    });

    expect(orders).toHaveLength(3);
    expect(orders[0].metadata).toMatchObject({
      orderNumber: "AAAA1111-BBBB22-CC333",
      seller: "Card Castle",
      total: 13.57,
      contactUrl:
        "https://store.tcgplayer.com/myaccount/messagecenter/create/aaaa1111-bbbb22-cc333?type=1",
      shippingStatus: "Shipped Without Tracking",
      estimatedDeliveryAt: expect.stringContaining("2026-08-07"),
      lastSeenAt: "2026-08-10T12:00:00.000Z"
    });
    expect(orders[0].metadata.items).toEqual([
      expect.objectContaining({
        name: "Pikachu - 025/102",
        quantityOrdered: 4,
        productId: "111",
        set: "Base Set",
        condition: "Near Mint",
        printing: "Reverse Holofoil",
        price: 0.4
      }),
      expect.objectContaining({ name: "Mew - 009", quantityOrdered: 1, productId: "222" })
    ]);
    expect(orders[0].metadata.items[0].id).toMatch(/^fingerprint:/);

    expect(orders[1].metadata).toMatchObject({
      orderNumber: "260803-ABCD",
      seller: "TCGplayer Direct",
      total: 27.25,
      trackingNumber: "999999999999",
      trackingUrl: "https://tools.usps.com/go/TrackConfirmAction.action?tLabels=999999999999",
      contactUrl: "https://store.tcgplayer.com/myaccount/messagecenter/create/260803-abcd?type=4",
      shippingStatus: "Shipped With Tracking"
    });
    expect(orders[1].metadata.items[0]).toMatchObject({
      name: "Charizard - 4/102",
      seller: "Holo Haven",
      quantityOrdered: 2,
      productId: "333"
    });

    expect(orders[2].metadata).toMatchObject({
      orderNumber: "REFUND01-AAAA22-BB333",
      seller: "Refunded Seller",
      total: 49.03,
      shippingStatus: "Canceled",
      refund: {
        kind: "full",
        amount: 49.03
      }
    });
    expect(orders[2].metadata.trackingNumber).toBeUndefined();
    expect(orders[2].metadata.refund?.issuedAt).toContain("2026-08-03");
  });

  it("falls back to the observed header when a transaction button is absent", () => {
    document.documentElement.innerHTML = fixture;
    document
      .querySelectorAll('[data-aid^="btn-ratetransaction-transactionnumber_"]')
      .forEach((element) => element.remove());

    const orders = extractTcgplayerOrders(document, {
      sourceUrl: "https://store.tcgplayer.com/myaccount/orderhistory"
    });
    expect(orders.map((order) => order.metadata.orderNumber)).toEqual([
      "AAAA1111-BBBB22-CC333",
      "260803-ABCD",
      "REFUND01-AAAA22-BB333"
    ]);
  });

  it("does not retain an unsafe tracking link", () => {
    document.documentElement.innerHTML = fixture;
    const trackingLink = document.querySelector<HTMLAnchorElement>(
      'a[href*="TrackConfirmAction"]'
    );
    trackingLink?.setAttribute("href", "javascript:alert('unsafe')");

    const orders = extractTcgplayerOrders(document, {
      sourceUrl: "https://store.tcgplayer.com/myaccount/orderhistory"
    });
    expect(orders[1].metadata.trackingNumber).toBe("999999999999");
    expect(orders[1].metadata.trackingUrl).toBeUndefined();
  });

  it("does not execute or retain an untrusted contact action", () => {
    document.documentElement.innerHTML = fixture;
    document
      .querySelector('[data-aid="btn-sellerorderwidget-contact"]')
      ?.setAttribute(
        "onclick",
        "document.location = 'https://evil.example/myaccount/messagecenter/create/aaaa1111-bbbb22-cc333?type=1'"
      );

    const orders = extractTcgplayerOrders(document, {
      sourceUrl: "https://store.tcgplayer.com/myaccount/orderhistory"
    });
    expect(orders[0].metadata.contactUrl).toBeUndefined();
  });
});
