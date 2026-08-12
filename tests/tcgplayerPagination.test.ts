import { describe, expect, it, vi } from "vitest";
import {
  importPaginatedOrderHistory,
  orderHistoryDateRange,
  orderHistoryPageUrls
} from "../src/marketplaces/tcgplayer/orderHistoryPagination";

const location = {
  href: "https://store.tcgplayer.com/myaccount/orderhistory?PageNumber=1",
  hostname: "store.tcgplayer.com",
  pathname: "/myaccount/orderhistory"
};

function orderPage(orderNumber: string): string {
  return `
    <main>
      <section class="orderWrap">
        <span data-aid="spn-sellerorderwidget-orderdate">August 1, 2026</span>
        <button data-aid="btn-ratetransaction-transactionnumber_${orderNumber}">Rate</button>
      </section>
    </main>
  `;
}

describe("TCGplayer paginated order-history import", () => {
  it("observes the user-selected date range without changing the form", () => {
    document.body.innerHTML = `
      <form>
        <select name="DateRange">
          <option>Last 30 Days</option>
          <option selected>Last 120 Days</option>
        </select>
      </form>
    `;
    const select = document.querySelector<HTMLSelectElement>('select[name="DateRange"]');

    expect(orderHistoryDateRange(document)).toBe("Last 120 Days");
    expect(select?.value).toBe("Last 120 Days");
    expect(select?.selectedIndex).toBe(1);
  });

  it("expands the rendered Last-page link into every other history page", () => {
    document.body.innerHTML = `
      <a href="?PageNumber=2">2</a>
      <a href="/myaccount/orderhistory?PageNumber=4">Last</a>
    `;

    expect(orderHistoryPageUrls(document, location)).toEqual([
      "https://store.tcgplayer.com/myaccount/orderhistory?PageNumber=2",
      "https://store.tcgplayer.com/myaccount/orderhistory?PageNumber=3",
      "https://store.tcgplayer.com/myaccount/orderhistory?PageNumber=4"
    ]);
  });

  it("fetches and extracts orders from pages that are not currently rendered", async () => {
    document.body.innerHTML = `
      <a href="?PageNumber=2">2</a>
      <a href="?PageNumber=3">Last</a>
    `;
    const fetchPage = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const orderNumber = url.endsWith("PageNumber=2")
        ? "AAAABBBB-123456-ABCDE"
        : "CCCCDDDD-654321-FGHIJ";
      return {
        ok: true,
        url,
        text: async () => orderPage(orderNumber)
      };
    }) as unknown as typeof fetch;

    const imported = await importPaginatedOrderHistory(document, location, fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(imported.map((order) => order.orderNumber).sort()).toEqual([
      "AAAABBBB-123456-ABCDE",
      "CCCCDDDD-654321-FGHIJ"
    ]);
  });

  it("ignores pagination links that leave the authenticated order-history route", () => {
    document.body.innerHTML = `
      <a href="https://example.com/myaccount/orderhistory?PageNumber=50">Elsewhere</a>
      <a href="/product/123?PageNumber=20">Product</a>
    `;

    expect(orderHistoryPageUrls(document, location)).toEqual([]);
  });
});
