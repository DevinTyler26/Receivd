import type { Marketplace, OrderMetadata } from "../types";

export interface ExtractedMarketplaceOrder {
  metadata: OrderMetadata;
  hostElement: HTMLElement;
}

export interface MarketplaceAdapter {
  marketplace: Marketplace;
  canHandlePage(location: Location): boolean;
  extractOrders(document: Document): ExtractedMarketplaceOrder[];
}
