import type { OrderItemMetadata, OrderStatus, OrderTrackingState } from "../types";
import { effectiveReceivedQuantity, missingQuantity } from "../utils/quantities";

interface OrderItemChecklistProps {
  items: OrderItemMetadata[];
  tracking?: OrderTrackingState;
  onQuantityChange: (itemId: string, quantity: number) => void | Promise<void>;
  disabled?: boolean;
  dense?: boolean;
  status?: OrderStatus;
}

export function OrderItemChecklist({
  items,
  tracking,
  onQuantityChange,
  disabled,
  dense = false,
  status = tracking?.status ?? "pending"
}: OrderItemChecklistProps) {
  if (!items.length) {
    return <p className="receivd-muted">Visit this order on TCGplayer to load its card checklist.</p>;
  }

  return (
    <div className={`receivd-item-list${dense ? " is-dense" : ""}`}>
      {items.map((item) => {
        const received = effectiveReceivedQuantity(item, tracking);
        const missing = missingQuantity(item, tracking);
        const refunded = status === "refunded";
        return (
          <div className={`receivd-item-row${missing && !refunded ? " is-missing" : ""}`} key={item.id}>
            <div className="receivd-item-copy">
              <span className="receivd-item-name">{item.name}</span>
              {(item.set || item.condition || item.printing || item.seller || item.price !== undefined) && (
                <span className="receivd-item-meta">
                  {[item.set, item.condition, item.printing, item.seller ? `Sold by ${item.seller}` : undefined, item.price !== undefined ? `$${item.price.toFixed(2)}` : undefined]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
              <span className="receivd-item-missing">
                {refunded ? "Refunded" : missing ? `${missing} missing` : "Complete"}
              </span>
            </div>
            <label className="receivd-quantity-field">
              <span className="sr-only">Quantity received for {item.name}</span>
              <input
                aria-label={`Quantity received for ${item.name}`}
                disabled={disabled}
                inputMode="numeric"
                max={item.quantityOrdered}
                min={0}
                onChange={(event) => void onQuantityChange(item.id, Number(event.target.value))}
                type="number"
                value={received}
              />
              <span aria-label={`${received} of ${item.quantityOrdered} received`}>
                / {item.quantityOrdered}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
