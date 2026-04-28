import type { PlayerValueView } from "./player-value-model";

type PlayerValueBadgeProps = {
  value: PlayerValueView;
  compact?: boolean;
};

const toneClasses: Record<PlayerValueView["tone"], string> = {
  negative: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  neutral: "border-white/10 bg-white/5 text-slate-200",
  positive: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  warning: "border-amber-300/25 bg-amber-300/10 text-amber-100",
};

export function PlayerValueBadge({ compact = false, value }: PlayerValueBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-lg border font-semibold",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        toneClasses[value.tone],
      ].join(" ")}
      title={[value.reason, ...value.reasons].join(" · ")}
    >
      {value.label}
    </span>
  );
}
