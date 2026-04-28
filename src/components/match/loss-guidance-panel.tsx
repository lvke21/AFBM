import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import {
  buildLossGuidanceState,
  type LossGuidanceItem,
} from "./loss-guidance-model";
import type { MatchReport } from "./match-report-model";

type LossGuidancePanelProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status" | "drives">;
  managerTeam: Pick<TeamDetail, "players" | "teamNeeds"> | null;
  saveGameId: string;
};

function sourceLabel(source: LossGuidanceItem["source"]) {
  if (source === "depth-chart") {
    return "Lineup";
  }

  if (source === "team-need") {
    return "Team Need";
  }

  return "Match Insight";
}

export function LossGuidancePanel({ match, managerTeam, saveGameId }: LossGuidancePanelProps) {
  const state = buildLossGuidanceState({ match, managerTeam, saveGameId });

  if (state.items.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title={state.title}
      description="Klare naechste Schritte, damit eine Niederlage in eine Entscheidung fuer die naechste Woche fuehrt."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
          <p className="text-sm font-semibold text-amber-100">{state.summary}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {state.items.map((item) => (
            <article key={`${item.source}-${item.title}`} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {sourceLabel(item.source)}
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/15"
              >
                {item.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
