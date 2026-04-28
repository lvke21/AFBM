import Link from "next/link";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import {
  getCapSummary,
  getContractDecisionSignal,
  getContractReleaseImpact,
  getContractRows,
  getContractTableSummary,
  type ContractDecisionSignalTone,
} from "./team-overview-model";

type ContractTableProps = {
  extendContractAction?: (formData: FormData) => Promise<void>;
  releaseContractPlayerAction?: (formData: FormData) => Promise<void>;
  saveGameId: string;
  team: TeamDetail;
};

function decisionToneClass(tone: ContractDecisionSignalTone) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "danger") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

export function ContractTable({
  extendContractAction,
  releaseContractPlayerAction,
  saveGameId,
  team,
}: ContractTableProps) {
  const rows = getContractRows(team.players);
  const summary = getContractTableSummary(team.players);
  const capSummary = getCapSummary(team);
  const canManageContracts = team.managerControlled && extendContractAction && releaseContractPlayerAction;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Contracts
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Vertraege</h2>
          <p className="mt-2 text-sm text-slate-300">
            Aktive Spieler-Vertraege sortiert nach Cap Hit.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-300">
          {summary.contractCount} Vertraege · {formatCurrency(summary.totalCapHit)} Cap Hit
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-slate-400">
              <tr>
                <th className="px-3 py-3">Spieler</th>
                <th className="px-3 py-3">Rolle</th>
                <th className="px-3 py-3">Jahre</th>
                <th className="px-3 py-3">Gehalt</th>
                <th className="px-3 py-3">Cap Hit</th>
                <th className="px-3 py-3">Cap Anteil</th>
                <th className="px-3 py-3">Decision Impact</th>
                {canManageContracts ? <th className="px-3 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const capShare =
                  capSummary.capLimit > 0
                    ? Math.round((row.capHit / capSummary.capLimit) * 1000) / 10
                    : 0;
                const extensionDelta = row.capHit - row.extendPreview.capHit;
                const releaseImpact = getContractReleaseImpact({
                  capHit: row.capHit,
                  signingBonus: row.signingBonus,
                });
                const decision = getContractDecisionSignal({
                  age: row.age,
                  capHit: row.capHit,
                  capLimit: capSummary.capLimit,
                  positionOverall: row.positionOverall,
                  potentialRating: row.potentialRating,
                  rosterStatus: row.rosterStatus,
                  years: row.years,
                });

                return (
                  <tr key={row.playerId} className="border-t border-white/8">
                    <td className="px-3 py-3">
                      <Link
                        href={`/app/savegames/${saveGameId}/players/${row.playerId}`}
                        className="font-semibold text-white underline-offset-4 hover:underline"
                      >
                        {row.fullName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">OVR {row.positionOverall}</p>
                    </td>
                    <td className="px-3 py-3">
                      {row.positionCode}
                      <p className="mt-1 text-xs text-slate-500">{row.rosterStatus}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.depthChartSlot ? `Slot #${row.depthChartSlot}` : "ohne Slot"}
                      </p>
                    </td>
                    <td className="px-3 py-3">{row.years}</td>
                    <td className="px-3 py-3">{formatCurrency(row.yearlySalary)}</td>
                    <td className="px-3 py-3 font-semibold text-white">
                      {formatCurrency(row.capHit)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-emerald-300"
                            style={{ width: `${Math.min(100, capShare)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-300">{capShare}%</span>
                      </div>
                    </td>
                    <td className="min-w-[220px] px-3 py-3 align-top">
                      <span
                        className={`inline-flex min-h-7 w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${decisionToneClass(decision.tone)}`}
                      >
                        {decision.label}
                      </span>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {decision.description}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {decision.decisionQuestion}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/app/savegames/${saveGameId}/players/${row.playerId}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                          Profil
                        </Link>
                        <Link
                          href={`/app/savegames/${saveGameId}/development`}
                          className="rounded-lg border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
                        >
                          Entwicklung
                        </Link>
                      </div>
                    </td>
                    {canManageContracts ? (
                      <td className="min-w-[280px] px-3 py-3">
                        <div className="space-y-3">
                          <form action={extendContractAction} className="rounded-lg border border-white/8 bg-black/10 p-3">
                            <input type="hidden" name="saveGameId" value={saveGameId} />
                            <input type="hidden" name="teamId" value={team.id} />
                            <input type="hidden" name="playerId" value={row.playerId} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Jahre
                                <input
                                  name="years"
                                  type="number"
                                  min={1}
                                  max={5}
                                  defaultValue={row.extendPreview.years}
                                  className="mt-1 w-full rounded-md border border-white/10 bg-slate-950 px-2 py-2 text-sm normal-case tracking-normal text-white"
                                />
                              </label>
                              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Gehalt
                                <input
                                  name="yearlySalary"
                                  type="number"
                                  min={750000}
                                  step={250000}
                                  defaultValue={row.extendPreview.yearlySalary}
                                  className="mt-1 w-full rounded-md border border-white/10 bg-slate-950 px-2 py-2 text-sm normal-case tracking-normal text-white"
                                />
                              </label>
                            </div>
                            <p className="mt-2 text-xs text-slate-300">
                              Neuer Cap Hit {formatCurrency(row.extendPreview.capHit)} ·{" "}
                              {extensionDelta >= 0 ? "Cap frei" : "Cap Mehrbedarf"}{" "}
                              {formatCurrency(Math.abs(extensionDelta))}
                            </p>
                            <div className="mt-3">
                              <FormSubmitButton pendingLabel="Verlaengere...">
                                Extend
                              </FormSubmitButton>
                            </div>
                          </form>

                          <form action={releaseContractPlayerAction} className="rounded-lg border border-rose-400/20 bg-rose-500/8 p-3">
                            <input type="hidden" name="saveGameId" value={saveGameId} />
                            <input type="hidden" name="teamId" value={team.id} />
                            <input type="hidden" name="playerId" value={row.playerId} />
                            <p className="text-xs text-slate-300">
                              Release: Cap Savings {formatCurrency(releaseImpact.capSavings)} ·
                              Dead Cap {formatCurrency(releaseImpact.deadCap)}
                            </p>
                            <div className="mt-3">
                              <FormSubmitButton pendingLabel="Release...">Release</FormSubmitButton>
                            </div>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
          Keine aktiven Spieler-Vertraege vorhanden.
        </div>
      )}
    </section>
  );
}
