import { describe, expect, it } from "vitest";
import { isExtensionContextInvalidated } from "../src/utils/errors";

describe("extension lifecycle errors", () => {
  it("recognizes Chrome's invalidated-context error", () => {
    expect(isExtensionContextInvalidated(new Error("Extension context invalidated."))).toBe(true);
  });

  it("does not hide unrelated errors", () => {
    expect(isExtensionContextInvalidated(new Error("Storage quota exceeded"))).toBe(false);
  });
});
