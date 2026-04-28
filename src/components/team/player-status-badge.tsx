import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { getRosterStatusLabel } from "./roster-model";

type PlayerStatusBadgeProps = {
  player: TeamPlayerSummary;
};

export function PlayerStatusBadge({ player }: PlayerStatusBadgeProps) {
  const isHealthy = player.injuryStatus === "HEALTHY";
  const statusLabel = isHealthy ? getRosterStatusLabel(player.rosterStatus) : player.injuryStatus;
  const toneClass = isHealthy
    ? "border-white/10 bg-white/5 text-slate-200"
    : "border-amber-300/25 bg-amber-300/10 text-amber-100";

  return (
    <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${toneClass}`}>
      {statusLabel}
    </span>
  );
}
