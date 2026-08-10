import type { ExtractedMarketplaceOrder } from "../types";
import { extractTcgplayerOrders } from "./extractOrders";

export function extractTcgplayerOrderDetails(document: Document): ExtractedMarketplaceOrder | undefined {
  return extractTcgplayerOrders(document).sort(
    (left, right) => right.metadata.items.length - left.metadata.items.length
  )[0];
}
