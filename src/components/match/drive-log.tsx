import { SectionCard } from "@/components/ui/section-card";

import { buildDriveLogState, type MatchReportDrive } from "./match-report-model";

type DriveLogProps = {
  drives: MatchReportDrive[];
};

export function DriveLog({ drives }: DriveLogProps) {
  const state = buildDriveLogState(drives);

  return (
    <SectionCard
      title="DriveLog"
      description="Der persistierte Drive-Log macht den Matchablauf, die Resultattypen und die wichtigsten Akteure pro Possession nachvollziehbar."
    >
      {state.hasDrives ? (
        <div className="space-y-3">
          {state.drives.map((drive) => (
            <div
              key={`${drive.sequence}-${drive.resultType}`}
              className="rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Drive {drive.sequence} · {drive.phaseLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {drive.offenseTeamAbbreviation} vs. {drive.defenseTeamAbbreviation} ·{" "}
                    {drive.resultType.replaceAll("_", " ")}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  Score {drive.startedScore} -&gt; {drive.endedScore} · {drive.plays} Plays ·{" "}
                  {drive.totalYards} Yards
                </p>
              </div>
              <p className="mt-3 text-sm text-slate-200">{drive.summary}</p>
              {(drive.primaryPlayerName || drive.primaryDefenderName) && (
                <p className="mt-2 text-xs text-slate-400">
                  Fokus: {drive.primaryPlayerName ?? "n/a"}
                  {drive.primaryDefenderName ? ` · Antwort der Defense: ${drive.primaryDefenderName}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionCard>
  );
}
