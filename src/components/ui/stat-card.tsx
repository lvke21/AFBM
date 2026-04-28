type StatCardProps = {
  description?: string;
  label: string;
  meta?: string;
  size?: "default" | "hero";
  value: string;
  tone?: "default" | "positive" | "warning" | "danger" | "active";
};

export function StatCard({
  description,
  label,
  meta,
  size = "default",
  value,
  tone = "default",
}: StatCardProps) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : tone === "danger"
          ? "border-red-300/25 bg-red-300/10 text-red-100"
          : tone === "active"
            ? "border-sky-300/25 bg-sky-300/10 text-sky-100"
            : "border-white/10 bg-white/5 text-white";
  const valueClass =
    size === "hero" ? "text-4xl md:text-5xl" : "text-2xl";

  return (
    <div className={`rounded-lg border p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        {meta ? (
          <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            {meta}
          </span>
        ) : null}
      </div>
      <p
        className={`mt-3 font-semibold text-white ${valueClass}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      ) : null}
    </div>
  );
}
