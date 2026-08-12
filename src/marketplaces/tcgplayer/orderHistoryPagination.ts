import type { OrderMetadata } from "../../types";
import { extractTcgplayerOrders } from "./extractOrders";
import { selectors } from "./selectors";

const MAX_HISTORY_PAGES = 100;
const PAGE_PARAMETER = "PageNumber";

interface LocationLike {
  href: string;
  hostname: string;
  pathname: string;
}

function isOrderHistoryUrl(url: URL, location: Pick<LocationLike, "hostname" | "pathname">): boolean {
  return (
    url.protocol === "https:" &&
    url.hostname.toLocaleLowerCase() === location.hostname.toLocaleLowerCase() &&
    url.pathname.replace(/\/$/, "").toLocaleLowerCase() ===
      location.pathname.replace(/\/$/, "").toLocaleLowerCase() &&
    /\/myaccount\/orderhistory\/?$/i.test(url.pathname)
  );
}

function pageNumber(url: URL): number | undefined {
  const raw = url.searchParams.get(PAGE_PARAMETER);
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const value = Number.parseInt(raw, 10);
  return value >= 1 && value <= MAX_HISTORY_PAGES ? value : undefined;
}

function queryFirst<T extends Element>(document: Document, candidates: readonly string[]): T | null {
  for (const selector of candidates) {
    const element = document.querySelector<T>(selector);
    if (element) return element;
  }
  return null;
}

export function orderHistoryDateRange(document: Document): string | undefined {
  const select = queryFirst<HTMLSelectElement>(document, selectors.orderHistoryDateRange);
  if (!select) return undefined;
  const selected = select.selectedOptions.item(0);
  return selected?.textContent?.trim() || select.value || undefined;
}

/**
 * Builds the complete set of page URLs from TCGplayer's rendered pagination links.
 * The "Last" link exposes the upper bound even when not every page number is shown.
 */
export function orderHistoryPageUrls(document: Document, location: LocationLike): string[] {
  let currentUrl: URL;
  try {
    currentUrl = new URL(location.href);
  } catch {
    return [];
  }
  if (!isOrderHistoryUrl(currentUrl, location)) return [];

  const candidates = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .map((anchor) => {
      try {
        return new URL(anchor.getAttribute("href") ?? "", currentUrl);
      } catch {
        return undefined;
      }
    })
    .filter((url): url is URL => Boolean(url && isOrderHistoryUrl(url, location) && pageNumber(url)));

  const currentPage = pageNumber(currentUrl) ?? 1;
  const lastPage = Math.max(currentPage, ...candidates.map((url) => pageNumber(url) ?? 1));
  if (lastPage <= 1) return [];

  // Start with a real pagination href so any non-page filters TCGplayer includes are retained.
  const template = candidates.find((url) => pageNumber(url) === lastPage) ?? currentUrl;
  const urls: string[] = [];
  for (let page = 1; page <= lastPage; page += 1) {
    if (page === currentPage) continue;
    const url = new URL(template.href);
    url.searchParams.set(PAGE_PARAMETER, String(page));
    url.hash = "";
    urls.push(url.href);
  }
  return urls;
}

async function fetchOrderHistoryPage(
  pageUrl: string,
  location: LocationLike,
  fetchPage: typeof fetch
): Promise<OrderMetadata[]> {
  const response = await fetchPage(pageUrl, {
    cache: "no-store",
    credentials: "include",
    redirect: "follow"
  });
  if (!response.ok) return [];

  const finalUrl = new URL(response.url || pageUrl);
  if (!isOrderHistoryUrl(finalUrl, location)) return [];
  const html = await response.text();
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return extractTcgplayerOrders(parsed, { sourceUrl: pageUrl }).map(({ metadata }) => metadata);
}

export async function importPaginatedOrderHistory(
  document: Document,
  location: LocationLike,
  fetchPage: typeof fetch = fetch
): Promise<OrderMetadata[]> {
  const pageUrls = orderHistoryPageUrls(document, location);
  const imported = new Map<string, OrderMetadata>();

  // Keep request pressure low while avoiding a long serial import for established accounts.
  const workers = Array.from({ length: Math.min(3, pageUrls.length) }, async () => {
    while (pageUrls.length) {
      const pageUrl = pageUrls.shift();
      if (!pageUrl) return;
      try {
        for (const metadata of await fetchOrderHistoryPage(pageUrl, location, fetchPage)) {
          const existing = imported.get(metadata.orderNumber);
          if (!existing || metadata.items.length > existing.items.length) {
            imported.set(metadata.orderNumber, metadata);
          }
        }
      } catch (error) {
        console.info(`Receivd: could not import ${pageUrl}.`, error);
      }
    }
  });
  await Promise.all(workers);
  return [...imported.values()];
}
