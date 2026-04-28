import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import {
  buildRosterContractSnapshot,
  type RosterContractRiskTone,
  type RosterContractSnapshotPlayer,
} from "./roster-model";

type ContractCapRiskPanelProps = {
  team: TeamDetail;
};

function riskToneClass(tone: RosterContractRiskTone) {
  if (tone === "danger") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }

  if (tone === "warning") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (tone === "positive") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function RiskBadge({
  label,
  tone,
}: {
  label: string;
  tone: RosterContractRiskTone;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${riskToneClass(tone)}`}
    >
      {label}
    </span>
  );
}

function ContractList({
  emptyLabel,
  players,
}: {
  emptyLabel: string;
  players: RosterContractSnapshotPlayer[];
}) {
  if (players.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {players.map((player) => (
        <div
          key={player.id}
          className="rounded-lg border border-white/8 bg-black/10 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{player.fullName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {player.positionCode} · {player.years} Jahr{player.years === 1 ? "" : "e"}
              </p>
            </div>
            <RiskBadge label={player.risk.label} tone={player.risk.tone} />
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {formatCurrency(player.capHit)} Cap Hit · {player.capSharePercent}% Cap
          </p>
        </div>
      ))}
    </div>
  );
}

export function ContractCapRiskPanel({ team }: ContractCapRiskPanelProps) {
  const snapshot = buildRosterContractSnapshot(team);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Contract Risk
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Salary Cap Risiken</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Vertragssignale aus vorhandenen Cap-Hits, Laufzeiten und Contract Outlook.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/8 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
            Auslaufend
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{snapshot.expiringCount}</p>
          <p className="mt-1 text-xs text-amber-100/80">
            {formatCurrency(snapshot.expiringCap)} Cap
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Hoher Cap
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{snapshot.highCapCount}</p>
          <p className="mt-1 text-xs text-slate-400">ab 8% Cap-Anteil</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Ohne Vertrag
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{snapshot.noContractCount}</p>
          <p className="mt-1 text-xs text-slate-400">fehlende Contract-Daten</p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Auslaufende Vertraege</h3>
          <div className="mt-3">
            <ContractList
              emptyLabel="Keine kurzfristig auslaufenden Vertraege."
              players={snapshot.expiringPlayers}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Top Cap Hits</h3>
          <div className="mt-3">
            <ContractList
              emptyLabel="Keine aktiven Contract-Daten vorhanden."
              players={snapshot.topCapPlayers}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
