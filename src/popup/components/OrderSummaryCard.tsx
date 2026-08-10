import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import type { DisplayOrder } from "../../types";
import { orderAgeLabel, pastEstimateLabel } from "../../utils/dates";
import { orderDaysPastEstimate } from "../../utils/orders";
import { totalMissingQuantity } from "../../utils/quantities";

export function OrderSummaryCard({ order, onOpen }: { order: DisplayOrder; onOpen: () => void }) {
  const metadata = order.metadata;
  const missing = metadata ? totalMissingQuantity(metadata.items, order.tracking) : 0;
  const itemCount = metadata?.items.reduce((total, item) => total + item.quantityOrdered, 0) ?? 0;
  const age = orderAgeLabel(metadata?.orderedAt);
  const overdueDays = orderDaysPastEstimate(order);

  return (
    <button
      className={`order-card status-edge-${order.status}${overdueDays ? " is-overdue" : ""}`}
      onClick={onOpen}
      type="button"
    >
      <div className="order-card-topline">
        <div>
          <strong>Order #{order.orderNumber}</strong>
          <span>{metadata?.seller ?? "TCGplayer order"}</span>
        </div>
        <OrderStatusBadge compact status={order.status} />
      </div>
      <div className="order-card-meta">
        {metadata ? (
          <>
            <span>{itemCount} card{itemCount === 1 ? "" : "s"}</span>
            {order.status === "partial" && missing > 0 ? (
              <span className="missing-copy">{missing} missing</span>
            ) : order.status === "refunded" && metadata.refund?.amount !== undefined ? (
              <span className="refund-copy">
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: metadata.currency ?? "USD"
                }).format(metadata.refund.amount)} refunded
              </span>
            ) : overdueDays ? (
              <span className="overdue-copy">⚠ {pastEstimateLabel(overdueDays)}</span>
            ) : age ? (
              <span>{age}</span>
            ) : null}
          </>
        ) : (
          <span>Metadata not yet loaded on this device</span>
        )}
        <span aria-hidden="true" className="card-arrow">›</span>
      </div>
    </button>
  );
}
