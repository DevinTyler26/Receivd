import type { OrderStatus } from "../types";

interface OrderStatusMenuProps {
  value: OrderStatus;
  onChange: (status: OrderStatus) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
}

export function OrderStatusMenu({ value, onChange, disabled, label = "Delivery status" }: OrderStatusMenuProps) {
  return (
    <label className="receivd-status-field">
      <span>{label}</span>
      <select
        aria-label={label}
        disabled={disabled}
        onChange={(event) => void onChange(event.target.value as OrderStatus)}
        value={value}
      >
        <option value="pending">Pending</option>
        <option value="delivered">Delivered</option>
        <option value="partial">Partially Delivered</option>
        <option value="missing">Missing / Never Arrived</option>
        <option value="refunded">Refunded</option>
      </select>
    </label>
  );
}
