import { describe, expect, it } from "vitest";
import { createStableItemId } from "../src/utils/itemIdentity";

describe("stable item identity", () => {
  it("prefers a marketplace order-line identifier", () => {
    expect(createStableItemId({ orderLineId: "ABC-123", name: "Pikachu" })).toBe("line:abc-123");
  });

  it("keeps quantities attached after display order changes", () => {
    const displayedFirst = [
      { orderLineId: "line-pikachu", name: "Pikachu" },
      { orderLineId: "line-mew", name: "Mew" }
    ];
    const tracking = new Map([
      [createStableItemId(displayedFirst[0]), 3],
      [createStableItemId(displayedFirst[1]), 0]
    ]);
    const displayedLater = [...displayedFirst].reverse();

    expect(tracking.get(createStableItemId(displayedLater[0]))).toBe(0);
    expect(tracking.get(createStableItemId(displayedLater[1]))).toBe(3);
  });

  it("creates the same fallback fingerprint from stable product properties", () => {
    const item = {
      productId: "111",
      name: "Pikachu",
      condition: "Near Mint",
      printing: "Unlimited",
      quantityOrdered: 4
    };
    expect(createStableItemId(item)).toBe(createStableItemId({ ...item }));
  });

  it("separates identical TCGplayer Direct cards sold by different sellers", () => {
    const shared = {
      productId: "333",
      condition: "Near Mint",
      printing: "Holofoil",
      quantityOrdered: 1
    };
    expect(createStableItemId({ ...shared, seller: "Holo Haven" })).not.toBe(
      createStableItemId({ ...shared, seller: "Card Castle" })
    );
  });

  it("does not change a product-based identity when display copy or URL changes", () => {
    const shared = {
      productId: "333",
      condition: "Near Mint",
      printing: "Holofoil",
      seller: "Holo Haven",
      quantityOrdered: 1
    };
    expect(createStableItemId({ ...shared, name: "Old title", productUrl: "/old-slug" })).toBe(
      createStableItemId({ ...shared, name: "Updated title", productUrl: "/updated-slug" })
    );
  });
});
