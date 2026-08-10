import { describe, expect, it } from "vitest";
import { daysPastEstimatedDelivery, pastEstimateLabel } from "../src/utils/dates";

describe("estimated delivery dates", () => {
  it("counts calendar days after the marketplace estimate", () => {
    expect(
      daysPastEstimatedDelivery("2026-07-29T07:00:00.000Z", new Date("2026-08-10T12:00:00.000Z"))
    ).toBe(12);
  });

  it("does not flag the estimate date or a future estimate", () => {
    expect(
      daysPastEstimatedDelivery("2026-08-10T07:00:00.000Z", new Date("2026-08-10T23:00:00.000Z"))
    ).toBeUndefined();
    expect(
      daysPastEstimatedDelivery("2026-08-11T07:00:00.000Z", new Date("2026-08-10T23:00:00.000Z"))
    ).toBeUndefined();
  });

  it("formats singular and plural warning labels", () => {
    expect(pastEstimateLabel(1)).toBe("1 day past estimate");
    expect(pastEstimateLabel(12)).toBe("12 days past estimate");
  });
});
