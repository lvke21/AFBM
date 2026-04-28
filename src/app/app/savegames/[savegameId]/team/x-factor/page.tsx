import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import {
  buildXFactorState,
  type XFactorCondition,
  type XFactorImpact,
  type XFactorPlayer,
  type XFactorTone,
  type XFactorUnit,
} from "@/components/team/team-x-factor-model";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

import {
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

function statusTone(tone: XFactorTone) {
  if (tone === "positive") {
    return "success";
  }

  if (tone === "active") {
    return "active";
  }

  if (tone === "warning") {
    return "warning";
  }

  if (tone === "danger") {
    return "danger";
  }

  return "neutral";
}

function barToneClass(tone: XFactorTone) {
  if (tone === "active") {
    return "bg-sky-300";
  }

  if (tone === "positive") {
    return "bg-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-300";
  }

  if (tone === "danger") {
    return "bg-rose-300";
  }

  return "bg-slate-300";
}

function ProgressBar({
  label,
  tone,
  value,
}: {
  label: string;
  tone: XFactorTone;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${barToneClass(tone)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function ConditionRow({ condition }: { condition: XFactorCondition }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{condition.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{condition.description}</p>
        </div>
        <StatusBadge
          label={condition.met ? "Ready" : "Check"}
          tone={condition.met ? "success" : "warning"}
        />
      </div>
    </div>
  );
}

function ImpactItem({ impact }: { impact: XFactorImpact }) {
  return (
    <article className="rounded-lg border border-white/8 bg-black/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{impact.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{impact.description}</p>
        </div>
        <StatusBadge label="Impact" tone={statusTone(impact.tone)} />
      </div>
    </article>
  );
}

function XFactorCard({
  player,
  savegameId,
}: {
  player: XFactorPlayer;
  savegameId: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={player.activationStatus} tone={statusTone(player.tone)} />
            <StatusBadge label={player.tier} tone={statusTone(player.tone)} />
            <StatusBadge label={player.unitLabel} tone="neutral" />
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">
            <Link
              className="transition hover:text-sky-200"
              href={`/app/savegames/${savegameId}/players/${player.id}`}
            >
              {player.fullName}
            </Link>
          </h3>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
            {player.positionCode} · {player.abilityName}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            X-Factor
          </p>
          <p className="mt-1 text-3xl font-semibold text-white">{player.score}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ProgressBar label="X-Factor Score" tone={player.tone} value={player.score} />
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Effekt
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{player.effectDescription}</p>
          <p className="mt-3 text-xs text-slate-400">
            Star Trait: {player.traitLabel} {player.traitValue}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Aktivierungsbedingungen</h4>
          <div className="space-y-2">
            {player.conditions.map((condition) => (
              <ConditionRow key={condition.label} condition={condition} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Einfluss</h4>
          <div className="space-y-2">
            {player.impacts.map((impact) => (
              <ImpactItem key={impact.label} impact={impact} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function UnitSummary({ unit }: { unit: XFactorUnit }) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{unit.label}</p>
          <p className="mt-1 text-xs text-slate-400">{unit.players.length} X-Factor Profile</p>
        </div>
        <StatusBadge
          label={unit.players.length > 0 ? `${unit.score}/100` : "n/a"}
          tone={statusTone(unit.tone)}
        />
      </div>
      <div className="mt-4">
        <ProgressBar label="Unit X-Factor" tone={unit.tone} value={unit.score} />
      </div>
      {unit.players.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {unit.players.slice(0, 4).map((player) => (
            <span
              key={player.id}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200"
            >
              {player.positionCode} · {player.abilityName}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Keine sichtbaren X-Factors in dieser Unit.</p>
      )}
    </article>
  );
}

export default async function TeamXFactorPage({ params }: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const xFactor = buildXFactorState(team);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Sichtbare Star-Profile aus vorhandenen Spielerwerten."
          label="X-Factors"
          tone={xFactor.activeCount > 0 ? "active" : "default"}
          value={String(xFactor.activeCount)}
        />
        <StatCard
          description="Alle Aktivierungsbedingungen sind erfuellt."
          label="Ready"
          tone={xFactor.readyCount > 0 ? "positive" : "default"}
          value={String(xFactor.readyCount)}
        />
        <StatCard
          description="Load, Health, Rolle oder Fit brauchen Aufmerksamkeit."
          label="Limited"
          tone={xFactor.limitedCount > 0 ? "warning" : "default"}
          value={String(xFactor.limitedCount)}
        />
        <StatCard
          description="Top X-Factor nach UI-Score."
          label="Top Star"
          value={xFactor.topPlayer ? xFactor.topPlayer.fullName : "n/a"}
        />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <SectionPanel
        title="X-Factor"
        description={xFactor.summary}
        actions={
          <>
            <Link
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              href={`/app/savegames/${savegameId}/team/roster`}
            >
              Roster
            </Link>
            <Link
              className="rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/16"
              href={`/app/savegames/${savegameId}/game/setup`}
            >
              Game Setup
            </Link>
          </>
        }
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {xFactor.units.map((unit) => (
            <UnitSummary key={unit.key} unit={unit} />
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Star-Spieler und Effekte"
        description="Bedingungen und Effekte werden aus vorhandenen Team- und Spielerwerten erklaert."
        tone="subtle"
      >
        {xFactor.players.length > 0 ? (
          <div className="space-y-5">
            {xFactor.players.map((player) => (
              <XFactorCard key={player.id} player={player} savegameId={savegameId} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-black/10 p-5 text-sm text-slate-300">
            {xFactor.emptyMessage}
          </p>
        )}
      </SectionPanel>
    </div>
  );
}
