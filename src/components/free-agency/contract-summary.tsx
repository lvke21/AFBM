"use client";

import { formatCurrency } from "@/lib/utils/format";
import { PlayerValueBadge } from "@/components/player/player-value-badge";
import type { PlayerValueView } from "@/components/player/player-value-model";

type ContractSummaryProps = {
  capAfterSigning: number;
  capImpact: number;
  capHit: number;
  cashAfterSigning: number;
  cashImpact: number;
  canAffordCap: boolean;
  canAffordCash: boolean;
  evaluation: {
    acceptanceScore: number;
    label: string;
    playerCanReject: boolean;
    reason: string;
  };
  expectedSalary: number;
  signingBonus: number;
  value: PlayerValueView;
  yearlySalary: number;
  years: number;
};

export function ContractSummary({
  capAfterSigning,
  capImpact,
  capHit,
  cashAfterSigning,
  cashImpact,
  canAffordCap,
  canAffordCash,
  evaluation,
  expectedSalary,
  signingBonus,
  value,
  yearlySalary,
  years,
}: ContractSummaryProps) {
  const isValid = canAffordCap && canAffordCash;
  const offerTone = evaluation.playerCanReject
    ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
    : evaluation.label === "Grenzwertig"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
      : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";

  return (
    <div className="rounded-lg border border-white/10 bg-black/10 p-3 text-sm text-slate-300">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white">{years} Jahre</p>
        <span
          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
            isValid
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-rose-300/25 bg-rose-300/10 text-rose-100"
          }`}
        >
          {isValid ? "Cap OK" : "Nicht finanzierbar"}
        </span>
      </div>
      <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${offerTone}`}>
        {evaluation.label} · Score {evaluation.acceptanceScore}/100
        <p className="mt-1 font-normal text-slate-200">{evaluation.reason}</p>
      </div>
      <div className="mt-3 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs text-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-white">Value vs Cap</span>
          <PlayerValueBadge compact value={value} />
        </div>
        <p className="mt-1 text-slate-400">{value.reason}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p>Salary {formatCurrency(yearlySalary)}</p>
        <p>Markterwartung {formatCurrency(expectedSalary)}</p>
        <p>Bonus {formatCurrency(signingBonus)}</p>
        <p>Cap Hit {formatCurrency(capHit)}</p>
        <p>Cap Impact {formatCurrency(capImpact)}</p>
        <p>Cash Impact {formatCurrency(cashImpact)}</p>
        <p>Cap danach {formatCurrency(capAfterSigning)}</p>
        <p>Cash danach {formatCurrency(cashAfterSigning)}</p>
      </div>
      {!canAffordCap ? (
        <p className="mt-2 text-xs text-rose-200">Der Cap Hit uebersteigt den Cap Space.</p>
      ) : null}
      {!canAffordCash ? (
        <p className="mt-2 text-xs text-rose-200">Der Signing Bonus uebersteigt den Cash-Bestand.</p>
      ) : null}
    </div>
  );
}
