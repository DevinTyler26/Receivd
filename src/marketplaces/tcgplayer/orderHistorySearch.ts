import { isLikelyTcgplayerOrderNumber } from "./orderIdentity";
import { selectors } from "./selectors";
import { TCGPLAYER_ORDER_HISTORY_URL } from "./urls";

const ORDER_SEARCH_FRAGMENT_KEY = "receivd-order";

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

export function buildTcgplayerOrderSearchUrl(orderNumber: string): string {
  const url = new URL(TCGPLAYER_ORDER_HISTORY_URL);
  url.hash = new URLSearchParams({ [ORDER_SEARCH_FRAGMENT_KEY]: orderNumber.trim() }).toString();
  return url.href;
}

export function requestedOrderNumber(location: Pick<LocationLike, "hash" | "pathname">): string | undefined {
  if (!/\/myaccount\/orderhistory\/?$/i.test(location.pathname)) return undefined;
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const orderNumber = fragment.get(ORDER_SEARCH_FRAGMENT_KEY)?.trim();
  return orderNumber && isLikelyTcgplayerOrderNumber(orderNumber) ? orderNumber : undefined;
}

export function applyRequestedOrderHistorySearch(
  document: Document,
  location: LocationLike,
  history: HistoryLike
): boolean {
  const orderNumber = requestedOrderNumber(location);
  if (!orderNumber) return false;

  const input = queryFirst<HTMLInputElement>(document, selectors.orderHistorySearchInput);
  const submit = queryFirst<HTMLInputElement | HTMLButtonElement>(
    document,
    selectors.orderHistorySearchSubmit
  );
  if (!input || !submit) return false;

  input.value = orderNumber;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  const cleanUrl = new URL(location.href);
  cleanUrl.hash = "";
  history.replaceState(history.state, "", `${cleanUrl.pathname}${cleanUrl.search}`);
  submit.click();
  return true;
}
