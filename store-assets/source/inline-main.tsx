import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OrderControl } from "../../src/content/OrderControl";
import type { OrderMetadata } from "../../src/types";
import { overdueOrder, partialOrder, previewStorage } from "./demoData";
import { installMockChrome } from "./mockChrome";
import "./showcase.css";

const storage = previewStorage();
installMockChrome(storage.local, storage.sync);

const usePartial = new URLSearchParams(window.location.search).get("state") === "partial";
const order = usePartial ? partialOrder : overdueOrder;

function MarketplaceOrder({ metadata }: { metadata: OrderMetadata }) {
  const quantity = metadata.items.reduce((total, item) => total + item.quantityOrdered, 0);
  return (
    <main className="marketplace-page">
      <header className="marketplace-header">
        <strong>TCGplayer</strong>
        <span>Order History</span>
        <span className="marketplace-account">My Account</span>
      </header>
      <div className="marketplace-breadcrumb">Home / My Account / Order History</div>
      <section className="marketplace-order">
        <div className="marketplace-order-header">
          <div><strong>ORDER DATE</strong><span>{new Date(metadata.orderedAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
          <div><strong>CHANNEL</strong><span>TCG Marketplace</span></div>
          <div><strong>ORDER NUMBER</strong><span>{metadata.orderNumber}</span></div>
          <button type="button">Contact Seller</button>
          <button type="button">Rate Transaction</button>
        </div>
        <div className="marketplace-summary">
          <div><strong>ORDER SUMMARY</strong><span>Quantity: <b>{quantity}</b></span><span>Total: <b>${metadata.total?.toFixed(2)}</b></span></div>
          <div><strong>SHIPPED AND SOLD BY</strong><a>{metadata.seller}</a><span>{metadata.shippingStatus}</span></div>
        </div>
        <table className="marketplace-items">
          <thead><tr><th>ITEMS</th><th>DETAILS</th><th>QUANTITY</th></tr></thead>
          <tbody>
            {metadata.items.map((orderItem, index) => (
              <tr key={orderItem.id}>
                <td><span className={`demo-card-art art-${index % 3}`} /><div><a>{orderItem.name}</a><small>{orderItem.set}</small></div></td>
                <td>Condition: {orderItem.condition}<br />Printing: {orderItem.printing}</td>
                <td>{orderItem.quantityOrdered}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receivd-root"><OrderControl metadata={metadata} /></div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MarketplaceOrder metadata={order} />
  </StrictMode>
);
