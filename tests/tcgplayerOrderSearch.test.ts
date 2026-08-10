import { describe, expect, it, vi } from "vitest";
import {
  applyRequestedOrderHistorySearch,
  buildTcgplayerOrderSearchUrl,
  requestedOrderNumber
} from "../src/marketplaces/tcgplayer/orderHistorySearch";

describe("TCGplayer order-history deep search", () => {
  it("builds an order-history URL containing a temporary Receivd search request", () => {
    expect(buildTcgplayerOrderSearchUrl("08D65669-796642-557F3")).toBe(
      "https://store.tcgplayer.com/myaccount/orderhistory#receivd-order=08D65669-796642-557F3"
    );
  });

  it("fills and submits the observed TCGplayer order search form", () => {
    document.body.innerHTML = `
      <form id="OrderHistoryFilterForm">
        <input data-aid="txb-orderhistorysearch-searchstring" id="SearchString" name="SearchString">
        <input data-aid="btn-orderhistorysearch-search" type="submit" value="Search">
      </form>
    `;
    const submitListener = vi.fn((event: Event) => event.preventDefault());
    document.querySelector("form")?.addEventListener("submit", submitListener);
    const replaceState = vi.fn();
    const location = {
      hash: "#receivd-order=08D65669-796642-557F3",
      href: "https://store.tcgplayer.com/myaccount/orderhistory#receivd-order=08D65669-796642-557F3",
      pathname: "/myaccount/orderhistory",
      search: ""
    };

    expect(applyRequestedOrderHistorySearch(document, location, { state: null, replaceState })).toBe(true);
    expect(document.querySelector<HTMLInputElement>("#SearchString")?.value).toBe(
      "08D65669-796642-557F3"
    );
    expect(replaceState).toHaveBeenCalledWith(null, "", "/myaccount/orderhistory");
    expect(submitListener).toHaveBeenCalledOnce();
  });

  it("ignores invalid order identifiers and unrelated pages", () => {
    expect(
      requestedOrderNumber({
        hash: "#receivd-order=TCGGift",
        pathname: "/myaccount/orderhistory"
      })
    ).toBeUndefined();
    expect(
      requestedOrderNumber({
        hash: "#receivd-order=08D65669-796642-557F3",
        pathname: "/product/123"
      })
    ).toBeUndefined();
  });
});
