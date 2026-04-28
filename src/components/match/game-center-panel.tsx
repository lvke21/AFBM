import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";

import { buildGameCenterStatusState, type GameCenterStatusState } from "./game-center-model";
import type { MatchReport } from "./match-report-model";

type GameCenterPanelProps = {
  match: MatchReport;
  reportHref: string;
};

function statusClasses(tone: GameCenterStatusState["tone"]) {
  if (tone === "live") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (tone === "final") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  return "border-sky-300/30 bg-sky-300/10 text-sky-100";
}

export function GameCenterPanel({ match, reportHref }: GameCenterPanelProps) {
  const state = buildGameCenterStatusState(match, reportHref);

  return (
    <SectionPanel
      title="Game Center"
      description={`${match.homeTeam.abbreviation} vs. ${match.awayTeam.abbreviation} auf einen Blick.`}
      actions={
        <Link
          href={state.reportHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
        >
          Spielbericht oeffnen
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.3fr]">
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Spielstatus</p>
          <div
            className={`mt-3 inline-flex rounded-lg border px-3 py-2 text-sm font-semibold ${statusClasses(
              state.tone,
            )}`}
          >
            {state.label}
          </div>
          <p className="mt-4 text-sm text-slate-300">
            {state.reportReady
              ? "Der finale Spielbericht ist verfuegbar."
              : "Der Spielbericht kann geoeffnet werden, wird aber erst nach Abschluss vollstaendig."}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Score</p>
          <p className="mt-3 text-2xl font-semibold text-white">{state.scoreLine}</p>
          <p className="mt-4 text-sm text-slate-300">
            {state.driveCount} persistierte Drives
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Letzter Drive</p>
          {state.lastDrive ? (
            <>
              <p className="mt-3 text-sm font-semibold text-white">
                Drive {state.lastDrive.sequence} · {state.lastDrive.resultType.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-sm text-slate-300">{state.lastDrive.summary}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-300">
              Noch keine Drives gespeichert. Sobald eine Simulation laeuft oder abgeschlossen ist,
              erscheint hier der aktuelle Verlauf.
            </p>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}
