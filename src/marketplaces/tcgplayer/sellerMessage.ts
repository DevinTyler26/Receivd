import type { OrderMetadata } from "../../types";
import { formatOrderDate } from "../../utils/dates";
import { isLikelyTcgplayerOrderNumber } from "./orderIdentity";
import { selectors } from "./selectors";

const MESSAGE_ORDER_KEY = "receivd-order";
const MESSAGE_ESTIMATE_KEY = "receivd-estimate";

interface LocationLike {
  hash: string;
  href: string;
  pathname: string;
  search: string;
}

interface HistoryLike {
  state: unknown;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

function queryFirst<T extends Element>(document: Document, candidates: readonly string[]): T | null {
  for (const selector of candidates) {
    const element = document.querySelector<T>(selector);
    if (element) return element;
  }
  return null;
}

function validatedContactUrl(value: string | undefined, orderNumber: string): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const pathMatch = url.pathname.match(/\/myaccount\/messagecenter\/create\/([^/]+)\/?$/i);
    if (
      url.protocol !== "https:" ||
      !/(^|\.)tcgplayer\.com$/i.test(url.hostname) ||
      pathMatch?.[1].toLocaleLowerCase() !== orderNumber.toLocaleLowerCase() ||
      !/^(?:1|4)$/.test(url.searchParams.get("type") ?? "")
    ) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export function cannedSellerMessage(orderNumber: string, estimatedDeliveryAt?: string): string {
  const estimate = formatOrderDate(estimatedDeliveryAt);
  return [
    "Hello,",
    "",
    `I'm checking in about TCGplayer order #${orderNumber}. ${
      estimate
        ? `The estimated delivery date was ${estimate}, but the order has not arrived.`
        : "The order has not arrived yet."
    } Could you please confirm its current shipping status and share any available tracking information?`,
    "",
    "Thank you."
  ].join("\n");
}

export function buildSellerMessageUrl(metadata: OrderMetadata): string | undefined {
  const url = validatedContactUrl(metadata.contactUrl, metadata.orderNumber);
  if (!url) return undefined;
  const fragment = new URLSearchParams({ [MESSAGE_ORDER_KEY]: metadata.orderNumber });
  if (metadata.estimatedDeliveryAt) fragment.set(MESSAGE_ESTIMATE_KEY, metadata.estimatedDeliveryAt);
  url.hash = fragment.toString();
  return url.href;
}

function requestedMessage(location: Pick<LocationLike, "hash" | "pathname">): {
  orderNumber: string;
  estimatedDeliveryAt?: string;
} | undefined {
  const pathMatch = location.pathname.match(/\/myaccount\/messagecenter\/create\/([^/]+)\/?$/i);
  if (!pathMatch) return undefined;
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const orderNumber = fragment.get(MESSAGE_ORDER_KEY)?.trim();
  if (
    !orderNumber ||
    !isLikelyTcgplayerOrderNumber(orderNumber) ||
    pathMatch[1].toLocaleLowerCase() !== orderNumber.toLocaleLowerCase()
  ) {
    return undefined;
  }
  const estimate = fragment.get(MESSAGE_ESTIMATE_KEY)?.trim();
  const parsedEstimate = estimate ? new Date(estimate) : undefined;
  return {
    orderNumber,
    estimatedDeliveryAt:
      parsedEstimate && !Number.isNaN(parsedEstimate.getTime()) ? parsedEstimate.toISOString() : undefined
  };
}

function setFieldValue(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string
): void {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

export function applyRequestedSellerMessage(
  document: Document,
  location: LocationLike,
  history: HistoryLike
): boolean {
  const request = requestedMessage(location);
  if (!request) return false;
  const message = queryFirst<HTMLTextAreaElement>(document, selectors.sellerMessageBody);
  if (!message) return false;

  const subject = queryFirst<HTMLInputElement | HTMLSelectElement>(
    document,
    selectors.sellerMessageSubject
  );
  if (subject) setFieldValue(subject, "Where Is My Order");
  setFieldValue(message, cannedSellerMessage(request.orderNumber, request.estimatedDeliveryAt));

  const cleanUrl = new URL(location.href);
  cleanUrl.hash = "";
  history.replaceState(history.state, "", `${cleanUrl.pathname}${cleanUrl.search}`);
  message.focus();
  return true;
}
