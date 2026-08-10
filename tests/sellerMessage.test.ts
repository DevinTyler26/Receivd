import { describe, expect, it, vi } from "vitest";
import type { OrderMetadata } from "../src/types";
import {
  applyRequestedSellerMessage,
  buildSellerMessageUrl,
  cannedSellerMessage
} from "../src/marketplaces/tcgplayer/sellerMessage";

const metadata: OrderMetadata = {
  marketplace: "tcgplayer",
  orderNumber: "C9591211-B1F551-1D819",
  estimatedDeliveryAt: "2026-07-29T07:00:00.000Z",
  contactUrl:
    "https://store.tcgplayer.com/myaccount/messagecenter/create/c9591211-b1f551-1d819?type=1",
  items: [],
  lastSeenAt: "2026-08-10T00:00:00.000Z"
};

describe("overdue seller message handoff", () => {
  it("generates a courteous message with the order and estimate", () => {
    expect(cannedSellerMessage(metadata.orderNumber, metadata.estimatedDeliveryAt)).toBe(
      [
        "Hello,",
        "",
        "I'm checking in about TCGplayer order #C9591211-B1F551-1D819. The estimated delivery date was Jul 29, 2026, but the order has not arrived. Could you please confirm its current shipping status and share any available tracking information?",
        "",
        "Thank you."
      ].join("\n")
    );
  });

  it("builds the captured TCGplayer compose URL without sending message content to the server", () => {
    const value = buildSellerMessageUrl(metadata);
    const url = new URL(value!);
    expect(`${url.origin}${url.pathname}${url.search}`).toBe(metadata.contactUrl);
    expect(url.hash).toContain("receivd-order=C9591211-B1F551-1D819");
    expect(url.hash).not.toContain("checking+in");
  });

  it("prefills the rendered compose fields but never submits the form", () => {
    document.body.innerHTML = `
      <form>
        <select id="Subject" name="Subject">
          <option value="">* Select a subject below *</option>
          <option value="Where Is My Order">Where Is My Order</option>
        </select>
        <textarea aria-label="Message body" id="Body" name="Body">Reply Here</textarea>
        <button type="submit">Send</button>
      </form>
    `;
    const submitListener = vi.fn((event: Event) => event.preventDefault());
    document.querySelector("form")?.addEventListener("submit", submitListener);
    const url = new URL(buildSellerMessageUrl(metadata)!);
    const replaceState = vi.fn();

    expect(
      applyRequestedSellerMessage(
        document,
        {
          hash: url.hash,
          href: url.href,
          pathname: url.pathname,
          search: url.search
        },
        { state: null, replaceState }
      )
    ).toBe(true);
    expect(document.querySelector<HTMLSelectElement>("#Subject")?.value).toBe(
      "Where Is My Order"
    );
    expect(document.querySelector<HTMLTextAreaElement>("#Body")?.value).toContain(
      "Could you please confirm its current shipping status"
    );
    expect(document.activeElement).toBe(document.querySelector("#Body"));
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/myaccount/messagecenter/create/c9591211-b1f551-1d819?type=1"
    );
    expect(submitListener).not.toHaveBeenCalled();
  });

  it("rejects compose URLs for another host or order", () => {
    expect(buildSellerMessageUrl({ ...metadata, contactUrl: metadata.contactUrl?.replace("tcgplayer.com", "evil.example") })).toBeUndefined();
    expect(buildSellerMessageUrl({ ...metadata, contactUrl: metadata.contactUrl?.replace("c9591211", "aaaa1111") })).toBeUndefined();
  });
});
