import type { PlayerRoleView } from "./player-role-model";

type PlayerRoleBadgeProps = {
  role: PlayerRoleView;
  compact?: boolean;
};

const toneClasses: Record<PlayerRoleView["tone"], string> = {
  accent: "border-sky-300/25 bg-sky-300/10 text-sky-100",
  neutral: "border-white/10 bg-white/5 text-slate-200",
  positive: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  special: "border-amber-300/25 bg-amber-300/10 text-amber-100",
};

export function PlayerRoleBadge({ compact = false, role }: PlayerRoleBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-lg border font-semibold",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        toneClasses[role.tone],
      ].join(" ")}
      aria-label={`${role.label}: ${role.description}`}
      title={[role.description, ...role.reasons].join(" · ")}
    >
      {role.label}
    </span>
  );
}
