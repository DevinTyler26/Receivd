import { describe, expect, it } from "vitest";
import { isInvalidLegacyOrderMetadata, isLikelyTcgplayerOrderNumber } from "../src/marketplaces/tcgplayer/orderIdentity";

describe("TCGplayer order identity validation", () => {
  it("accepts observed marketplace and Direct order formats", () => {
    expect(isLikelyTcgplayerOrderNumber("C9591211-B1F551-1D819")).toBe(true);
    expect(isLikelyTcgplayerOrderNumber("260803-ABCD")).toBe(true);
    expect(isLikelyTcgplayerOrderNumber("12345678")).toBe(true);
  });

  it("rejects navigation copy previously mistaken for an order", () => {
    expect(isLikelyTcgplayerOrderNumber("TCGGift")).toBe(false);
  });

  it("identifies empty invalid legacy metadata for cleanup", () => {
    expect(
      isInvalidLegacyOrderMetadata({
        marketplace: "tcgplayer",
        orderNumber: "TCGGift",
        seller: "Find a Seller",
        items: [],
        lastSeenAt: "2026-08-10T00:00:00.000Z"
      })
    ).toBe(true);
  });
});
