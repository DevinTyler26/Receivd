import { createRoot, type Root } from "react-dom/client";
import { tcgplayerAdapter } from "../marketplaces/tcgplayer/adapter";
import { upsertLocalOrders } from "../storage/localOrders";
import type { OrderMetadata } from "../types";
import { OrderControl } from "./OrderControl";

interface MountedControl {
  host: HTMLElement;
  container: HTMLDivElement;
  root: Root;
}

const mounted = new Map<string, MountedControl>();
let scanTimer: number | undefined;
let scanInProgress = false;

function mountControl(metadata: OrderMetadata, host: HTMLElement): void {
  const current = mounted.get(metadata.orderNumber);
  if (current?.host === host && current.container.isConnected) {
    current.root.render(<OrderControl metadata={metadata} />);
    return;
  }
  if (current) {
    current.root.unmount();
    current.container.remove();
    mounted.delete(metadata.orderNumber);
  }

  const container = document.createElement("div");
  container.dataset.receivdRoot = metadata.orderNumber;
  container.className = "receivd-root";
  const root = createRoot(container);
  host.append(container);
  root.render(<OrderControl metadata={metadata} />);
  mounted.set(metadata.orderNumber, { host, container, root });
}

async function scanPage(): Promise<void> {
  if (scanInProgress || !tcgplayerAdapter.canHandlePage(window.location)) return;
  scanInProgress = true;
  try {
    const extracted = tcgplayerAdapter.extractOrders(document);
    if (!extracted.length) return;
    const reconciled = await upsertLocalOrders(extracted.map(({ metadata }) => metadata));
    const metadataByOrder = new Map(reconciled.map((metadata) => [metadata.orderNumber, metadata]));
    for (const order of extracted) {
      const metadata = metadataByOrder.get(order.metadata.orderNumber) ?? order.metadata;
      try {
        mountControl(metadata, order.hostElement);
      } catch (error) {
        console.warn(`Receivd: could not mount order ${metadata.orderNumber}.`, error);
      }
    }
    for (const [orderNumber, control] of mounted) {
      if (!control.host.isConnected) {
        control.root.unmount();
        mounted.delete(orderNumber);
      }
    }
  } catch (error) {
    console.warn("Receivd: TCGplayer page extraction failed safely.", error);
  } finally {
    scanInProgress = false;
  }
}

function scheduleScan(delay = 250): void {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => void scanPage(), delay);
}

function installNavigationHooks(): void {
  const notify = () => window.dispatchEvent(new Event("receivd:navigation"));
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      notify();
      return result;
    };
  }
  window.addEventListener("popstate", notify);
  window.addEventListener("receivd:navigation", () => scheduleScan(100));
  window.addEventListener("receivd:rescan", () => scheduleScan(0));
}

function start(): void {
  if (!tcgplayerAdapter.canHandlePage(window.location)) return;
  installNavigationHooks();
  const observer = new MutationObserver((mutations) => {
    const hasMarketplaceMutation = mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      return !target?.closest("[data-receivd-root]");
    });
    if (hasMarketplaceMutation) scheduleScan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan(0);
}

try {
  start();
} catch (error) {
  console.warn("Receivd: content integration did not start.", error);
}
