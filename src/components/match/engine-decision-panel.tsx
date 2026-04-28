import { SectionCard } from "@/components/ui/section-card";

import { buildEngineDecisionPanelState, type MatchReportDrive } from "./match-report-model";

type EngineDecisionPanelProps = {
  drives: MatchReportDrive[];
};

export function EngineDecisionPanel({ drives }: EngineDecisionPanelProps) {
  const state = buildEngineDecisionPanelState(drives);

  return (
    <SectionCard
      title="Warum ist es passiert?"
      description="Kurze Football-Erklaerungen zu Play Call, Druck, QB-Entscheidungszeit und den wichtigsten Gruenden pro Drive."
    >
      {state.hasExplanations ? (
        <div className="space-y-3">
          {state.explainedDrives.map((drive) => (
            <article
              key={drive.sequence}
              className="rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {drive.label}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-white">
                    Engine-Entscheidung im Klartext
                  </h3>
                </div>
                <p className="max-w-md text-xs text-slate-500">{drive.sourceNote}</p>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Play Call
                  </p>
                  <p className="mt-2 text-sm text-slate-100">{drive.playCall}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Pressure
                  </p>
                  <p className="mt-2 text-sm text-slate-100">{drive.pressure}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Decision Time
                  </p>
                  <p className="mt-2 text-sm text-slate-100">{drive.decisionTime}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
                  Key Reasons
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-100">
                  {drive.keyReasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionCard>
  );
}
