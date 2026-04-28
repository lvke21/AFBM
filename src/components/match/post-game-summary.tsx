import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

import { buildPostGameSummaryState, type MatchReport } from "./match-report-model";

type PostGameSummaryProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">;
  saveGameId: string;
};

const toneClasses: Record<ReturnType<typeof buildPostGameSummaryState>["tone"], string> = {
  default: "border-white/10 bg-white/5",
  positive: "border-emerald-300/25 bg-emerald-300/10",
  warning: "border-amber-300/25 bg-amber-300/10",
};

export function PostGameSummary({ match, saveGameId }: PostGameSummaryProps) {
  const state = buildPostGameSummaryState(match);

  return (
    <SectionCard
      title={state.title}
      description="Finaler Ausgang, wichtigste Erkenntnis und naechster sinnvoller Schritt."
    >
      <div className={`rounded-lg border p-4 ${toneClasses[state.tone]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Ergebnis
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">{state.result}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{state.insight}</p>
        <Link
          href={`/app/savegames/${saveGameId}`}
          className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
        >
          {state.nextActionLabel}
        </Link>
      </div>
    </SectionCard>
  );
}
