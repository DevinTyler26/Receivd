import type { OrderStatus } from "../types";

const labels: Record<OrderStatus, string> = {
  pending: "Pending",
  delivered: "Delivered",
  partial: "Partially Delivered",
  missing: "Missing",
  refunded: "Refunded"
};

export function orderStatusLabel(status: OrderStatus): string {
  return labels[status];
}

export function OrderStatusBadge({ status, compact = false }: { status: OrderStatus; compact?: boolean }) {
  return (
    <span className={`receivd-status-badge receivd-status-${status}${compact ? " is-compact" : ""}`}>
      <span aria-hidden="true" className="receivd-status-dot" />
      {compact && status === "partial" ? "Partial" : labels[status]}
    </span>
  );
}
