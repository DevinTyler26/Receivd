import type { ExtractedMarketplaceOrder } from "../types";
import type { OrderItemMetadata, OrderMetadata, OrderRefundMetadata } from "../../types";
import { createStableItemId } from "../../utils/itemIdentity";
import { cleanText, parseFirstInteger, parseMoney } from "../../utils/text";
import { safeExternalUrl } from "../../utils/urls";
import { isLikelyTcgplayerOrderNumber } from "./orderIdentity";
import { selectors } from "./selectors";

function queryFirst(root: ParentNode, candidates: readonly string[]): Element | null {
  for (const selector of candidates) {
    const element = root.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function elementsMatching(root: ParentNode, candidates: readonly string[]): Element[] {
  const result = new Set<Element>();
  for (const selector of candidates) {
    root.querySelectorAll(selector).forEach((element) => result.add(element));
  }
  return [...result];
}

function attributeOrText(element: Element | null, attributes: string[] = []): string | undefined {
  if (!element) return undefined;
  for (const attribute of attributes) {
    const value = cleanText(element.getAttribute(attribute));
    if (value) return value;
  }
  return cleanText(element.textContent);
}

function stripLabel(value: string | undefined, labels: RegExp): string | undefined {
  return cleanText(value?.replace(labels, ""));
}

function orderNumberFromHref(href: string | null): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, window.location.href);
    for (const key of ["orderNumber", "orderId", "orderID"]) {
      const value = cleanText(url.searchParams.get(key));
      if (value) return value;
    }
    const pathMatch = url.pathname.match(/\/(?:order\/details|orderdetails|Order\/Details)\/([a-z0-9-]{5,})/i);
    return pathMatch?.[1];
  } catch {
    return undefined;
  }
}

function extractOrderNumber(container: Element): string | undefined {
  const transactionElement = container.querySelector(
    '[data-aid^="btn-ratetransaction-transactionnumber_"]'
  );
  const transactionNumber = cleanText(transactionElement?.getAttribute("data-aid"))?.replace(
    /^btn-ratetransaction-transactionnumber_/i,
    ""
  );
  const direct = attributeOrText(container.matches(selectors.orderNumber.join(",")) ? container : null, [
    "data-aid",
    "data-order-number",
    "data-order-id",
    "aria-label"
  ]);
  const nestedElement = queryFirst(container, selectors.orderNumber);
  const nested = attributeOrText(nestedElement, ["data-order-number", "data-order-id", "aria-label"]);
  const linked = selectors.orderLinks
    .map((selector) => container.querySelector<HTMLAnchorElement>(selector))
    .find(Boolean);
  const fromHref = orderNumberFromHref(linked?.getAttribute("href") ?? null);
  const headerText = cleanText(container.querySelector(".orderHeader")?.textContent);
  const headerMatch = headerText?.match(
    /(?:order\s+number|tcgplayer\s+direct\s*#)\s*([a-z0-9][a-z0-9-]{4,})/i
  );
  const textMatch = cleanText(container.textContent)?.match(
    /\border\s*(?:number|no\.?|#)?\s*:?[\s#]*([a-z0-9][a-z0-9-]{4,})/i
  );
  const candidate = transactionNumber ?? direct ?? nested ?? fromHref ?? headerMatch?.[1] ?? textMatch?.[1];
  return stripLabel(candidate, /^order\s*(?:number|no\.?|#)?\s*:?[\s#]*/i);
}

function extractActualItemSet(itemElement: Element): string | undefined {
  const itemCell = itemElement.querySelector("td.orderHistoryItems");
  const content = itemCell?.querySelector(":scope > span");
  if (!content) return undefined;
  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("a, .orderSoldby, br").forEach((element) => element.remove());
  return cleanText(clone.textContent);
}

function extractConditionAndPrinting(itemElement: Element): {
  condition?: string;
  printing?: string;
} {
  const explicitCondition = attributeOrText(queryFirst(itemElement, selectors.itemCondition), ["data-condition"]);
  const explicitPrinting = attributeOrText(queryFirst(itemElement, selectors.itemPrinting), ["data-printing"]);
  if (explicitCondition || explicitPrinting) return { condition: explicitCondition, printing: explicitPrinting };

  const detailText = attributeOrText(queryFirst(itemElement, selectors.itemDetails));
  const combined = cleanText(detailText?.match(/Condition:\s*(.+)$/i)?.[1]);
  if (!combined) return {};
  const printingMatch = combined.match(
    /\s+((?:1st Edition|Unlimited)\s+(?:Holofoil|Normal)|Reverse Holofoil|Holofoil|Non-Holofoil|Non-Holo|Foil|Normal|1st Edition|Unlimited)$/i
  );
  if (!printingMatch) return { condition: combined };
  return {
    condition: cleanText(combined.slice(0, printingMatch.index)),
    printing: printingMatch[1]
  };
}

function normalizeDate(value: string | undefined): string | undefined {
  const stripped = stripLabel(value, /^(?:order(?:ed)?\s*)?date\s*:?\s*/i);
  if (!stripped) return undefined;
  const parsed = new Date(stripped);
  return Number.isNaN(parsed.getTime()) ? stripped : parsed.toISOString();
}

function extractItem(itemElement: Element): OrderItemMetadata | undefined {
  const nameElement = queryFirst(itemElement, selectors.itemName);
  const name = attributeOrText(nameElement, ["data-product-name", "aria-label", "alt"]);
  if (!name) return undefined;

  const quantityElement = queryFirst(itemElement, selectors.itemQuantity);
  const quantityText = attributeOrText(quantityElement, ["data-quantity", "aria-label"]);
  const quantityFromContainer = cleanText(itemElement.textContent)?.match(/(?:qty|quantity)\s*:?\s*(\d+)/i)?.[1];
  const quantityOrdered = Math.max(
    1,
    parseFirstInteger(itemElement.getAttribute("data-quantity")) ??
      parseFirstInteger(quantityText) ??
      parseFirstInteger(quantityFromContainer) ??
      1
  );
  const productAnchor = queryFirst(itemElement, selectors.itemProductLink) as HTMLAnchorElement | null;
  const productUrl = productAnchor?.href;
  const thumbnail = queryFirst(itemElement, selectors.itemThumbnail) as HTMLImageElement | null;
  const productId =
    cleanText(itemElement.getAttribute("data-product-id")) ??
    cleanText(productAnchor?.getAttribute("data-product-id")) ??
    productUrl?.match(/\/product\/(\d+)/i)?.[1] ??
    thumbnail?.src.match(/\/product\/(\d+)(?:_|\b)/i)?.[1];
  const orderLineId = cleanText(itemElement.getAttribute("data-order-line-id"));
  const set =
    attributeOrText(queryFirst(itemElement, selectors.itemSet), ["data-set-name"]) ??
    extractActualItemSet(itemElement);
  const { condition, printing } = extractConditionAndPrinting(itemElement);
  const seller = stripLabel(
    attributeOrText(queryFirst(itemElement, selectors.itemSeller)),
    /^sold\s+by\s*/i
  );
  const price = parseMoney(attributeOrText(queryFirst(itemElement, selectors.itemPrice)));
  const id = createStableItemId({
    orderLineId,
    productId,
    name,
    set,
    condition,
    printing,
    seller,
    productUrl,
    quantityOrdered
  });

  return {
    id,
    name,
    quantityOrdered,
    set,
    condition,
    printing,
    seller,
    price,
    productUrl,
    productId,
    orderLineId
  };
}

function findItemContainers(container: Element): Element[] {
  const explicit = elementsMatching(container, selectors.itemContainers);
  if (explicit.length) return explicit;

  const inferred = new Set<Element>();
  container.querySelectorAll('a[href*="/product/"]').forEach((anchor) => {
    const item = anchor.closest(
      "tr, li, [role=listitem], [data-product-id], [data-testid*=item], article, section"
    );
    if (item && item !== container && container.contains(item)) inferred.add(item);
  });
  return [...inferred];
}

function extractItems(container: Element): OrderItemMetadata[] {
  const items = new Map<string, OrderItemMetadata>();
  for (const itemElement of findItemContainers(container)) {
    const item = extractItem(itemElement);
    if (item) items.set(item.id, item);
  }
  return [...items.values()];
}

function textFromSelector(
  container: Element,
  candidates: readonly string[],
  attributes: string[] = []
): string | undefined {
  return attributeOrText(queryFirst(container, candidates), attributes);
}

function summaryValue(container: Element, label: string): string | undefined {
  const table = queryFirst(container, selectors.orderSummary);
  if (!(table instanceof HTMLTableElement)) return undefined;
  for (const row of [...table.rows]) {
    const cells = [...row.cells];
    if (cleanText(cells[0]?.textContent)?.replace(/:$/, "").toLocaleLowerCase() === label.toLocaleLowerCase()) {
      return cleanText(cells[1]?.textContent);
    }
  }
  return undefined;
}

function trackingDetails(container: Element): {
  trackingNumber?: string;
  trackingUrl?: string;
  shippingStatus?: string;
} {
  const trackingElement = queryFirst(container, selectors.tracking);
  const dataValue = cleanText(trackingElement?.getAttribute("data-tracking-number"));
  const label = attributeOrText(trackingElement, ["aria-label"]);
  if (!trackingElement) return {};

  if (/^(?:shipped|cancell?ed)\b/i.test(label ?? "")) {
    const followingTrackingLink = [...(trackingElement.parentElement?.querySelectorAll<HTMLAnchorElement>("a") ?? [])]
      .filter(
        (anchor) =>
          Boolean(trackingElement.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          (/track|shipment|usps|ups|fedex/i.test(anchor.href) || /^\d[A-Z0-9-]{7,}$/i.test(cleanText(anchor.textContent) ?? ""))
      )
      .at(0);
    return {
      trackingNumber: cleanText(followingTrackingLink?.textContent),
      trackingUrl: safeExternalUrl(followingTrackingLink?.getAttribute("href") ?? undefined, window.location.href),
      shippingStatus: cleanText(label?.replace(/:$/, ""))
    };
  }

  const trackingLink =
    trackingElement.closest<HTMLAnchorElement>("a[href]") ??
    trackingElement.querySelector<HTMLAnchorElement>("a[href]");
  return {
    trackingNumber: stripLabel(dataValue ?? label, /^tracking(?:\s+number)?\s*:?\s*/i),
    trackingUrl: safeExternalUrl(
      trackingLink?.getAttribute("href") ?? trackingElement.getAttribute("data-tracking-url") ?? undefined,
      window.location.href
    ),
    shippingStatus: stripLabel(
      textFromSelector(container, selectors.shippingStatus, ["data-shipping-status", "aria-label"]),
      /^(?:shipping\s+)?status\s*:?\s*/i
    )
  };
}

function refundDetails(container: Element): OrderRefundMetadata | undefined {
  const notice = queryFirst(container, selectors.refundNotice);
  const text = cleanText(notice?.textContent);
  if (!text || !/\brefund\b/i.test(text)) return undefined;

  const amountMatch = text.match(/\$([\d,]+(?:\.\d{1,2})?)/);
  const issuedDateMatch = text.match(/\bissued\s+on\s+(.+?)\s+for\s+the\s+amount\b/i);
  return {
    kind: /\bfull\s+refund\b/i.test(text) ? "full" : "partial",
    amount: amountMatch ? Number.parseFloat(amountMatch[1].replace(/,/g, "")) : undefined,
    issuedAt: normalizeDate(cleanText(issuedDateMatch?.[1]))
  };
}

function estimatedDeliveryDate(container: Element): string | undefined {
  const trackingElement = queryFirst(container, selectors.tracking);
  const shippingText = cleanText((trackingElement?.parentElement ?? container).textContent);
  const match = shippingText?.match(
    /\best\.?\s*delivery\s+by\s+([a-z]+\s+\d{1,2},\s+\d{4})\b/i
  );
  return normalizeDate(cleanText(match?.[1]));
}

function contactSellerUrl(
  container: Element,
  sourceUrl: string,
  orderNumber: string
): string | undefined {
  const contact = queryFirst(container, selectors.contactSeller);
  if (!contact) return undefined;
  const onclick = contact.getAttribute("onclick") ?? "";
  const onclickUrl = onclick.match(
    /(?:document|window)\.location(?:\.href)?\s*=\s*(["'])([^"']+)\1/i
  )?.[2];
  const candidate =
    contact.getAttribute("href") ?? contact.getAttribute("data-contact-url") ?? onclickUrl;
  const normalized = safeExternalUrl(candidate ?? undefined, sourceUrl);
  if (!normalized) return undefined;

  const url = new URL(normalized);
  const pathMatch = url.pathname.match(/\/myaccount\/messagecenter\/create\/([^/]+)\/?$/i);
  if (
    url.protocol !== "https:" ||
    !/(^|\.)tcgplayer\.com$/i.test(url.hostname) ||
    pathMatch?.[1].toLocaleLowerCase() !== orderNumber.toLocaleLowerCase() ||
    !/^(?:1|4)$/.test(url.searchParams.get("type") ?? "")
  ) {
    return undefined;
  }
  return url.href;
}

function extractMetadata(container: Element, sourceUrl: string, now: Date): OrderMetadata | undefined {
  const orderNumber = extractOrderNumber(container);
  if (!orderNumber || !isLikelyTcgplayerOrderNumber(orderNumber)) return undefined;

  const dateElement = queryFirst(container, selectors.orderDate);
  const orderedAt = normalizeDate(attributeOrText(dateElement, ["datetime", "data-order-date", "aria-label"]));
  const extractedSeller = stripLabel(
    textFromSelector(container, selectors.seller, ["data-seller-name", "aria-label"]),
    /^seller\s*:?\s*/i
  );
  const seller =
    extractedSeller ?? (/TCGPLAYER\s+DIRECT\s*#/i.test(cleanText(container.querySelector(".orderHeader")?.textContent) ?? "")
      ? "TCGplayer Direct"
      : undefined);
  const totalText =
    summaryValue(container, "Total") ??
    textFromSelector(container, selectors.total, ["data-order-total", "aria-label"]);
  const { trackingNumber, trackingUrl, shippingStatus } = trackingDetails(container);
  const estimatedDeliveryAt = estimatedDeliveryDate(container);
  const refund = refundDetails(container);
  const contactUrl = contactSellerUrl(container, sourceUrl, orderNumber);

  return {
    marketplace: "tcgplayer",
    orderNumber,
    orderedAt,
    seller,
    total: parseMoney(totalText),
    currency: totalText?.includes("$") ? "USD" : undefined,
    trackingNumber,
    trackingUrl,
    contactUrl,
    shippingStatus,
    estimatedDeliveryAt,
    refund,
    items: extractItems(container),
    sourceUrl,
    lastSeenAt: now.toISOString()
  };
}

function candidateOrderContainers(document: Document): HTMLElement[] {
  const candidates = new Set<HTMLElement>();
  for (const element of elementsMatching(document, selectors.orderContainers)) {
    if (element instanceof HTMLElement) candidates.add(element);
  }
  for (const link of elementsMatching(document, selectors.orderLinks)) {
    const container = link.closest<HTMLElement>(
      "[data-order-number], [data-order-id], [data-testid*=order], article, li, section"
    );
    if (container) candidates.add(container);
  }

  if (!candidates.size && /order(?:details?|history)/i.test(window.location.pathname)) {
    const main = document.querySelector<HTMLElement>("main, [role=main]") ?? document.body;
    if (main) candidates.add(main);
  }
  return [...candidates].filter((candidate) => !candidate.closest("[data-receivd-root]"));
}

export function extractTcgplayerOrders(
  document: Document,
  options: { now?: Date; sourceUrl?: string } = {}
): ExtractedMarketplaceOrder[] {
  const now = options.now ?? new Date();
  const sourceUrl = options.sourceUrl ?? window.location.href;
  const orders = new Map<string, ExtractedMarketplaceOrder>();

  for (const hostElement of candidateOrderContainers(document)) {
    const metadata = extractMetadata(hostElement, sourceUrl, now);
    if (!metadata) continue;
    const existing = orders.get(metadata.orderNumber);
    if (!existing || metadata.items.length > existing.metadata.items.length) {
      orders.set(metadata.orderNumber, { metadata, hostElement });
    }
  }
  return [...orders.values()];
}
