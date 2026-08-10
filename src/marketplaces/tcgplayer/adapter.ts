import type { MarketplaceAdapter } from "../types";
import { extractTcgplayerOrders } from "./extractOrders";

export const tcgplayerAdapter: MarketplaceAdapter = {
  marketplace: "tcgplayer",
  canHandlePage(location) {
    return (
      /(^|\.)tcgplayer\.com$/i.test(location.hostname) &&
      /(?:order|myaccount)/i.test(`${location.pathname}${location.search}`)
    );
  },
  extractOrders(document) {
    return extractTcgplayerOrders(document);
  }
};
