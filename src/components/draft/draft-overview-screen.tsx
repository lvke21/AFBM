"use client";

import { useMemo, useState } from "react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { DraftOverviewViewModel } from "@/modules/draft/application/draft-query.service";

type DraftOverviewScreenProps = {
  overview: DraftOverviewViewModel;
  pickDraftPlayerAction?: (formData: FormData) => Promise<void>;
};

function levelClasses(level: string) {
  if (level === "FOCUSED") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  if (level === "BASIC") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function riskClasses(risk: string) {
  if (risk === "HIGH") {
    return "text-rose-100";
  }

  if (risk === "LOW") {
    return "text-emerald-100";
  }

  return "text-slate-200";
}

export function DraftOverviewScreen({
  overview,
  pickDraftPlayerAction,
}: DraftOverviewScreenProps) {
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const positionOptions = useMemo(
    () =>
      ["ALL", ...new Set(overview.prospects.map((prospect) => prospect.positionCode))].sort(
        (left, right) => {
          if (left === "ALL") {
            return -1;
          }

          if (right === "ALL") {
            return 1;
          }

          return left.localeCompare(right);
        },
      ),
    [overview.prospects],
  );
  const visibleProspects =
    positionFilter === "ALL"
      ? overview.prospects
      : overview.prospects.filter((prospect) => prospect.positionCode === positionFilter);
  const selectedProspect =
    selectedProspectId == null
      ? null
      : overview.prospects.find((prospect) => prospect.id === selectedProspectId) ?? null;

  if (!overview.draftClass) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Draft MVP
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Keine Draft Class vorhanden</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Fuer dieses Savegame wurde noch keine Draft Class angelegt. Sobald Draft-Testdaten
          vorhanden sind, erscheinen hier Prospects und Scouting-Informationen.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
          Draft MVP begrenzt
        </p>
        <p className="mt-2 text-sm text-amber-50">
          Dieser Screen ist ein begrenzter Draft-MVP: Das Manager-Team kann Prospects nur picken,
          wenn die Draft Class aktiv ist. Draft Order, CPU-Picks, Multi-Round-Simulation und
          weitere Scouting-Kaeufe sind hier bewusst noch nicht aktiv.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Drafted Players
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Rookie Rights</h2>
          </div>
          <p className="text-sm text-slate-300">
            {overview.managerDraftedPlayers.length} Prospects gehoeren deinem Team.
          </p>
        </div>

        {overview.managerDraftedPlayers.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {overview.managerDraftedPlayers.map((prospect) => (
              <article
                key={prospect.id}
                className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4"
              >
                <p className="font-semibold text-white">{prospect.fullName}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {prospect.positionCode} · Pick {prospect.draftedPickNumber ?? "n/a"}
                  {prospect.draftedRound ? ` · Round ${prospect.draftedRound}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-emerald-200/30 px-3 py-1 text-emerald-100">
                    {prospect.teamConsequence?.label ?? "Team Rights"}
                  </span>
                  <span className="rounded-full border border-amber-200/30 px-3 py-1 text-amber-100">
                    {prospect.teamConsequence?.status ?? "Needs Contract"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-white/8 bg-black/10 p-3 text-sm text-slate-300">
            Noch kein Prospect wurde von deinem Team gepickt. Nach einem Pick bleibt der Spieler
            hier sichtbar, bis ein spaeterer Contract-/Roster-Flow umgesetzt wird.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Positionsfilter
          </p>
          <label className="mt-2 block text-sm text-slate-300">
            Position
            <select
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value)}
              className="mt-2 min-h-10 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {positionOptions.map((position) => (
                <option key={position} value={position}>
                  {position === "ALL" ? "Alle Positionen" : position}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="text-sm text-slate-300">
          {visibleProspects.length} von {overview.summary.totalProspects} Prospects sichtbar
        </div>
      </section>

      {visibleProspects.length > 0 ? (
        <section className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Prospect</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Ratings</th>
                <th className="px-4 py-3">Scouting</th>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleProspects.map((prospect) => {
                const isAvailable = prospect.status === "AVAILABLE";
                const canPick = overview.draftClass?.canPick && isAvailable;

                return (
                  <tr key={prospect.id} className="border-t border-white/8 align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{prospect.fullName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {prospect.positionCode} · {prospect.positionName} · Age {prospect.age}
                      </p>
                      {prospect.college ? (
                        <p className="mt-1 text-xs text-slate-500">{prospect.college}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <p>{prospect.status}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Projection Round {prospect.projectedRound}
                      </p>
                      {prospect.draftedPickNumber ? (
                        <p className="mt-1 text-xs text-emerald-100">
                          Pick {prospect.draftedPickNumber}
                          {prospect.draftedRound ? ` · Round ${prospect.draftedRound}` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <p className={`font-semibold ${riskClasses(prospect.riskLevel)}`}>
                        {prospect.riskLevel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Risiko wird ab Basic Scouting sichtbar.
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p>
                        <span className="text-slate-500">OVR</span>{" "}
                        <span className="font-semibold text-white">{prospect.visibleOverall}</span>
                      </p>
                      <p className="mt-1">
                        <span className="text-slate-500">POT</span>{" "}
                        <span className="font-semibold text-white">{prospect.visiblePotential}</span>
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(prospect.scoutingLevel)}`}
                      >
                        {prospect.scoutingLevel}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      {prospect.strengths.length > 0 ? (
                        <p className="text-xs text-emerald-100">
                          Strengths: {prospect.strengths.join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">Noch keine Detailstaerken sichtbar.</p>
                      )}
                      {prospect.weaknesses.length > 0 ? (
                        <p className="mt-1 text-xs text-rose-100">
                          Weaknesses: {prospect.weaknesses.join(", ")}
                        </p>
                      ) : null}
                      {prospect.notes ? (
                        <p className="mt-2 rounded-md border border-white/8 bg-black/10 px-2 py-1 text-xs text-slate-300">
                          {prospect.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      {canPick && pickDraftPlayerAction ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProspectId(prospect.id)}
                          className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/16"
                        >
                          Pick pruefen
                        </button>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-300">
                            {isAvailable ? "Draft nicht aktiv" : "Nicht verfuegbar"}
                          </p>
                          {prospect.draftedByTeamName ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Gedraftet von {prospect.draftedByTeamName}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          Keine Prospects fuer diesen Positionsfilter gefunden.
        </section>
      )}

      {selectedProspect && pickDraftPlayerAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={pickDraftPlayerAction}
            className="w-full max-w-2xl rounded-lg border border-white/10 bg-slate-950 p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-draft-pick-${selectedProspect.id}`}
          >
            <input type="hidden" name="saveGameId" value={overview.saveGameId} />
            <input type="hidden" name="draftPlayerId" value={selectedProspect.id} />

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Draft Pick bestaetigen
            </p>
            <h3
              id={`confirm-draft-pick-${selectedProspect.id}`}
              className="mt-2 text-xl font-semibold text-white"
            >
              {selectedProspect.fullName} draften?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Dieser Pick markiert den Prospect als gedraftet und gibt deinem Team die Rookie
              Rights. Ein vollstaendiger Vertrag-/Roster-Flow folgt spaeter.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Position</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedProspect.positionCode}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedProspect.positionName}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Potential</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedProspect.visiblePotential}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  OVR {selectedProspect.visibleOverall}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Risk</p>
                <p className={`mt-1 text-lg font-semibold ${riskClasses(selectedProspect.riskLevel)}`}>
                  {selectedProspect.riskLevel}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Scouting {selectedProspect.scoutingLevel}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                Team-Need-Relevanz
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {selectedProspect.teamNeedRelevance.label}
                {selectedProspect.teamNeedRelevance.score != null
                  ? ` · Score ${selectedProspect.teamNeedRelevance.score}`
                  : ""}
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {selectedProspect.teamNeedRelevance.detail}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedProspectId(null)}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Abbrechen
              </button>
              <FormSubmitButton pendingLabel="Pick wird gespeichert...">
                Pick bestaetigen
              </FormSubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
