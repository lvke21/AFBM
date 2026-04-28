type RatingBadgeProps = {
  label: string;
  value: number | string;
};

export function RatingBadge({ label, value }: RatingBadgeProps) {
  const numericValue = Number(value);
  const toneClass =
    numericValue >= 85
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : numericValue >= 75
        ? "border-sky-300/25 bg-sky-300/10 text-sky-100"
        : numericValue >= 65
          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
          : "border-rose-300/25 bg-rose-300/10 text-rose-100";

  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs font-semibold ${toneClass}`}>
      {label} {value}
    </span>
  );
}
