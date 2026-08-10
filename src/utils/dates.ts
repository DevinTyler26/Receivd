export function daysSince(dateValue: string | undefined, now = new Date()): number | undefined {
  if (!dateValue) return undefined;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return undefined;
  const elapsed = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

export function orderAgeLabel(dateValue: string | undefined, now = new Date()): string | undefined {
  const days = daysSince(dateValue, now);
  if (days === undefined) return undefined;
  if (days === 0) return "Ordered today";
  if (days === 1) return "Ordered yesterday";
  return `Ordered ${days} days ago`;
}

export function formatOrderDate(dateValue: string | undefined): string | undefined {
  if (!dateValue) return undefined;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatUpdatedAt(timestamp: number): string {
  if (!timestamp) return "Not updated yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function calendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function daysPastEstimatedDelivery(
  estimatedDeliveryAt: string | undefined,
  now = new Date()
): number | undefined {
  if (!estimatedDeliveryAt) return undefined;
  const estimate = new Date(estimatedDeliveryAt);
  if (Number.isNaN(estimate.getTime())) return undefined;
  const elapsedDays = calendarDayNumber(now) - calendarDayNumber(estimate);
  return elapsedDays > 0 ? elapsedDays : undefined;
}

export function pastEstimateLabel(days: number): string {
  return `${days} day${days === 1 ? "" : "s"} past estimate`;
}
