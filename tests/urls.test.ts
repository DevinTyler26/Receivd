import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "../src/utils/urls";

describe("safe external URLs", () => {
  it("accepts HTTP(S) tracking links and resolves relative links with an explicit base", () => {
    expect(safeExternalUrl("https://tools.usps.com/track/123")).toBe(
      "https://tools.usps.com/track/123"
    );
    expect(safeExternalUrl("/track/123", "https://carrier.example/orders")).toBe(
      "https://carrier.example/track/123"
    );
  });

  it("rejects executable and malformed URLs", () => {
    expect(safeExternalUrl("javascript:alert('unsafe')")).toBeUndefined();
    expect(safeExternalUrl("data:text/html,unsafe")).toBeUndefined();
    expect(safeExternalUrl("not a url")).toBeUndefined();
  });
});
