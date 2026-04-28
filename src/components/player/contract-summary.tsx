import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { PlayerDetail } from "@/modules/players/domain/player.types";
import { getContractSummaryState } from "./player-detail-model";

type ContractSummaryProps = {
  player: PlayerDetail;
};

export function ContractSummary({ player }: ContractSummaryProps) {
  const state = getContractSummaryState(player.currentContract);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Vertrag
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Contract Summary</h2>

      <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4">
        <p className="text-lg font-semibold text-white">{state.title}</p>
        {player.currentContract ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Yearly Salary</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(player.currentContract.yearlySalary)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Cap Hit</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(player.currentContract.capHit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Signing Bonus</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(player.currentContract.signingBonus)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Signed</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatDate(player.currentContract.signedAt)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-300">{state.primary}</p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">Roster-Kontext</p>
        <p className="mt-2">
          {player.roster?.rosterStatus ?? "Kein Rosterstatus"} ·{" "}
          {player.roster?.archetypeName ?? "Kein Archetyp"} ·{" "}
          {player.roster?.schemeFitName ?? "Kein Scheme Fit"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Team Fit {player.schemeFitScore ?? "n/a"} · Dev Focus{" "}
          {player.roster?.developmentFocus ? "Ja" : "Nein"} · Captain{" "}
          {player.roster?.captainFlag ? "Ja" : "Nein"}
        </p>
      </div>
    </section>
  );
}
