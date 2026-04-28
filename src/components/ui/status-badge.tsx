type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "active";
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
        : tone === "danger"
          ? "border-red-300/30 bg-red-300/10 text-red-100"
          : tone === "active"
            ? "border-sky-300/30 bg-sky-300/10 text-sky-100"
            : "border-white/10 bg-white/5 text-slate-200";

  return (
    <span
      className={`inline-flex min-h-7 w-fit shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${toneClass}`}
    >
      {label}
    </span>
  );
}
