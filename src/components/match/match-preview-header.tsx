import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils/format";

import type { GamePreviewMatch, GamePreviewState } from "./game-preview-model";

type MatchPreviewHeaderProps = {
  match: GamePreviewMatch;
  state: GamePreviewState;
};

function statusTone(status: string) {
  if (status === "SCHEDULED") {
    return "active" as const;
  }

  if (status === "IN_PROGRESS") {
    return "warning" as const;
  }

  if (status === "COMPLETED") {
    return "success" as const;
  }

  return "neutral" as const;
}

export function MatchPreviewHeader({ match, state }: MatchPreviewHeaderProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(47,140,255,0.18),rgba(7,17,29,0.9)_45%,rgba(245,185,66,0.08))] p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Spielvorschau" tone="active" />
            <StatusBadge label={match.status.replaceAll("_", " ")} tone={statusTone(match.status)} />
          </div>
          <h1
            className="mt-5 text-3xl font-semibold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {match.homeTeam.name}
          </h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Heim · {state.homeTeam.record}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 px-6 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {state.contextLine}
          </p>
          <p
            className="mt-4 text-4xl font-semibold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            VS
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {formatDate(match.scheduledAt)}
            {match.stadiumName ? ` · ${match.stadiumName}` : ""}
          </p>
        </div>

        <div className="xl:text-right">
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <StatusBadge label={`Bilanz ${state.awayTeam.record}`} tone="neutral" />
            {state.awayTeam.isManagerTeam ? <StatusBadge label="Dein Team" tone="success" /> : null}
          </div>
          <h2
            className="mt-5 text-3xl font-semibold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {match.awayTeam.name}
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Auswaerts · {state.awayTeam.record}
          </p>
        </div>
      </div>
    </section>
  );
}
