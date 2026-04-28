type RatingGroupItem = {
  label: string;
  value: number | string;
};

type RatingGroupProps = {
  description?: string;
  emptyMessage?: string;
  items: RatingGroupItem[];
  title: string;
};

function ratingTone(value: number | string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "border-white/10 bg-white/5 text-white";
  }

  if (numericValue >= 85) {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (numericValue >= 75) {
    return "border-sky-300/25 bg-sky-300/10 text-sky-100";
  }

  if (numericValue >= 65) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-rose-300/25 bg-rose-300/10 text-rose-100";
}

export function RatingGroup({
  description,
  emptyMessage = "Keine Ratings vorhanden.",
  items,
  title,
}: RatingGroupProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Ratings
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-300">{description}</p> : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border p-4 ${ratingTone(item.value)}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
