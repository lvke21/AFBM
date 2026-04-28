export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatRecord(wins: number, losses: number, ties: number) {
  return `${wins}-${losses}${ties > 0 ? `-${ties}` : ""}`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
