"use client";

import { useMemo, useState } from "react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatCurrency } from "@/lib/utils/format";
import type { FreeAgentMarketPlayer } from "@/modules/teams/application/team-management.shared";
import {
  buildFreeAgentOfferPreview,
  getDefaultOffer,
} from "./free-agency-model";
import { ContractSummary } from "./contract-summary";

type OfferBuilderProps = {
  capSpace: number;
  cashBalance: number;
  player: FreeAgentMarketPlayer;
  saveGameId: string;
  signAction: (formData: FormData) => Promise<void>;
  teamId: string;
};

export function OfferBuilder({
  capSpace,
  cashBalance,
  player,
  saveGameId,
  signAction,
  teamId,
}: OfferBuilderProps) {
  const defaultOffer = useMemo(() => getDefaultOffer(player), [player]);
  const [years, setYears] = useState(defaultOffer.years);
  const [yearlySalary, setYearlySalary] = useState(defaultOffer.yearlySalary);
  const preview = buildFreeAgentOfferPreview({
    capSpace,
    cashBalance,
    player,
    yearlySalary,
    years,
  });
  const canSubmit = preview.canAffordCap && preview.canAffordCash;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <form action={signAction} className="relative grid gap-3">
      <input type="hidden" name="saveGameId" value={saveGameId} />
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="playerId" value={player.id} />

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-300">
          Jahre
          <input
            type="number"
            name="years"
            min={1}
            max={5}
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-300">
          Jahresgehalt
          <input
            type="number"
            name="yearlySalary"
            min={750000}
            max={45000000}
            step={250000}
            value={yearlySalary}
            onChange={(event) => setYearlySalary(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <ContractSummary {...preview} />

      {canSubmit ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/16"
        >
          Angebot vorbereiten
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-500"
        >
          Cap pruefen
        </button>
      )}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-lg rounded-lg border border-white/10 bg-slate-950 p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-signing-${player.id}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Signing bestaetigen
            </p>
            <h3 id={`confirm-signing-${player.id}`} className="mt-2 text-xl font-semibold text-white">
              {player.fullName} verpflichten?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Diese Entscheidung erstellt einen Vertrag und veraendert Cap, Cash und Kader direkt.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Cap Impact</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {formatCurrency(preview.capImpact)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Danach {formatCurrency(preview.capAfterSigning)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Cash Impact</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {formatCurrency(preview.cashImpact)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Danach {formatCurrency(preview.cashAfterSigning)}
                </p>
              </div>
            </div>

            <div
              className={`mt-4 rounded-lg border p-3 text-sm ${
                preview.evaluation.playerCanReject
                  ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                  : preview.evaluation.label === "Grenzwertig"
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              }`}
            >
              <p className="font-semibold">{preview.evaluation.label}</p>
              <p className="mt-1 text-slate-200">{preview.evaluation.reason}</p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Abbrechen
              </button>
              <FormSubmitButton pendingLabel="Signing...">
                {preview.evaluation.playerCanReject ? "Trotzdem senden" : "Signing bestaetigen"}
              </FormSubmitButton>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
