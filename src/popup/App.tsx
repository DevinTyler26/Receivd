import { useCallback, useEffect, useMemo, useState } from "react";
import { TCGPLAYER_ORDER_HISTORY_URL } from "../marketplaces/tcgplayer/urls";
import { getLocalOrders } from "../storage/localOrders";
import { EMPTY_SETTINGS, getSettings } from "../storage/settings";
import { getTrackingStates } from "../storage/tracking";
import type { DisplayOrder, OrderStatus, ReceivdSettings } from "../types";
import { combineOrders, matchesOrderSearch, orderDaysPastEstimate } from "../utils/orders";
import { OrderDetail } from "./components/OrderDetail";
import { OrderSummaryCard } from "./components/OrderSummaryCard";
import { Settings } from "./components/Settings";

type Filter = "attention" | "all" | OrderStatus;

const filters: Array<{ value: Filter; label: string }> = [
  { value: "attention", label: "Attention" },
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "missing", label: "Missing" },
  { value: "refunded", label: "Refunded" },
  { value: "delivered", label: "Delivered" }
];

export function App() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReceivdSettings>(EMPTY_SETTINGS);
  const [filter, setFilter] = useState<Filter>("attention");
  const [search, setSearch] = useState("");
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>();
  const [showSettings, setShowSettings] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [metadata, tracking, nextSettings] = await Promise.all([
        getLocalOrders(),
        getTrackingStates(),
        getSettings()
      ]);
      setSettings(nextSettings);
      setOrders(combineOrders(metadata, tracking, nextSettings));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const counts = useMemo(
    () => ({
      delivered: orders.filter((order) => order.status === "delivered").length,
      pending: orders.filter((order) => order.status === "pending").length,
      partial: orders.filter((order) => order.status === "partial").length,
      missing: orders.filter((order) => order.status === "missing").length,
      refunded: orders.filter((order) => order.status === "refunded").length
    }),
    [orders]
  );
  const attentionCount = counts.pending + counts.partial + counts.missing;
  const overdueCount = orders.filter((order) => orderDaysPastEstimate(order) !== undefined).length;
  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "attention"
            ? order.status !== "delivered" && order.status !== "refunded"
            : order.status === filter);
        return matchesFilter && matchesOrderSearch(order, search);
      }),
    [filter, orders, search]
  );
  const selectedOrder = orders.find((order) => order.orderNumber === selectedOrderNumber);

  if (selectedOrder) {
    return <OrderDetail onBack={() => setSelectedOrderNumber(undefined)} order={selectedOrder} />;
  }

  if (showSettings) {
    return (
      <Settings
        onBack={() => setShowSettings(false)}
        onSettingsChanged={setSettings}
        orders={orders}
        settings={settings}
      />
    );
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="brand-lockup">
          <img aria-hidden="true" className="brand-icon" src="/icon-48.png" />
          <div>
            <h1>Receivd</h1>
            <p>TCG Order Tracker</p>
          </div>
        </div>
        <div className="header-actions">
          <a
            className="coffee-link"
            href="https://www.paypal.com/paypalme/DevinCunningham"
            rel="noopener noreferrer"
            target="_blank"
          >
            Buy me a coffee
          </a>
          <div className="order-total" aria-label={`${orders.length} orders`}>
            <strong>{orders.length}</strong>
            <span>{orders.length === 1 ? "Order" : "Orders"}</span>
          </div>
          <button
            aria-label="Open settings"
            className="header-settings-button"
            onClick={() => setShowSettings(true)}
            title="Settings"
            type="button"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>

      {!loading && orders.length > 0 && (
        <>
          <section aria-label="Order status summary" className="summary-grid">
            <button onClick={() => setFilter("delivered")} type="button">
              <strong>{counts.delivered}</strong><span>Delivered</span>
            </button>
            <button onClick={() => setFilter("pending")} type="button">
              <strong>{counts.pending}</strong><span>Pending</span>
            </button>
            <button onClick={() => setFilter("partial")} type="button">
              <strong>{counts.partial}</strong><span>Partial</span>
            </button>
            <button onClick={() => setFilter("missing")} type="button">
              <strong>{counts.missing}</strong><span>Missing</span>
            </button>
            <button onClick={() => setFilter("refunded")} type="button">
              <strong>{counts.refunded}</strong><span>Refunded</span>
            </button>
          </section>

          <section className="attention-heading">
            <div>
              <h2>{filter === "attention" ? "Needs Attention" : "Your Orders"}</h2>
              <p>
                {filter === "attention"
                  ? `${attentionCount} outstanding order${attentionCount === 1 ? "" : "s"}${
                      overdueCount ? ` · ${overdueCount} past estimate` : ""
                    }`
                  : `${visibleOrders.length} shown`}
              </p>
            </div>
          </section>

          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search orders</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, seller, or card"
              type="search"
              value={search}
            />
          </label>

          <div aria-label="Filter orders" className="filter-scroll" role="group">
            {filters.map((option) => (
              <button
                aria-pressed={filter === option.value}
                className={filter === option.value ? "is-active" : ""}
                key={option.value}
                onClick={() => setFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}

      <section aria-live="polite" className="order-list">
        {loading ? (
          <div className="loading-state"><span /><span /><span /></div>
        ) : orders.length === 0 ? (
          <EmptyOrders />
        ) : visibleOrders.length === 0 ? (
          <div className="empty-state compact">
            <span aria-hidden="true" className="empty-check">✓</span>
            <h2>{search ? "No matching orders." : filter === "attention" ? "You’re all caught up." : "Nothing here yet."}</h2>
            <p>
              {search
                ? "Try another order number, seller, or card name."
                : filter === "attention"
                  ? "No orders currently need attention."
                  : "Choose another filter to see your orders."}
            </p>
          </div>
        ) : (
          visibleOrders.map((order) => (
            <OrderSummaryCard
              key={order.orderNumber}
              onOpen={() => setSelectedOrderNumber(order.orderNumber)}
              order={order}
            />
          ))
        )}
      </section>

      <footer className="popup-footer">
        <span>Delivery tracking can follow you between signed-in browsers when browser sync is enabled.</span>
      </footer>
    </main>
  );
}

function EmptyOrders() {
  const openOrderHistory = () => void chrome.tabs.create({ url: TCGPLAYER_ORDER_HISTORY_URL });
  return (
    <div className="empty-state">
      <span aria-hidden="true" className="empty-mail"><span /></span>
      <h2>No orders found yet.</h2>
      <p>Visit your TCGplayer order history and Receivd will automatically find your orders.</p>
      <button className="primary-button" onClick={openOrderHistory} type="button">
        Open TCGplayer orders
      </button>
    </div>
  );
}
