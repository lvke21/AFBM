import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";
import {
  buildTeamChemistryState,
  type TeamChemistryInfluence,
  type TeamChemistryPlayerSignal,
  type TeamChemistryTone,
  type TeamChemistryUnit,
} from "@/components/team/team-chemistry-model";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

import {
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

function statusTone(tone: TeamChemistryTone) {
  if (tone === "positive") {
    return "success";
  }

  if (tone === "warning") {
    return "warning";
  }

  if (tone === "danger") {
    return "danger";
  }

  return "neutral";
}

function statTone(tone: TeamChemistryTone | undefined) {
  if (tone === "positive" || tone === "warning" || tone === "danger") {
    return tone;
  }

  return "default";
}

function barToneClass(tone: TeamChemistryTone) {
  if (tone === "positive") {
    return "bg-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-300";
  }

  if (tone === "danger") {
    return "bg-rose-300";
  }

  return "bg-sky-300";
}

function ProgressBar({
  label,
  tone,
  value,
}: {
  label: string;
  tone: TeamChemistryTone;
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

function PlayerSignalList({
  emptyLabel,
  players,
  savegameId,
}: {
  emptyLabel: string;
  players: TeamChemistryPlayerSignal[];
  savegameId: string;
}) {
  if (players.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <Link
          key={player.id}
          href={`/app/savegames/${savegameId}/players/${player.id}`}
          className="block rounded-lg border border-white/8 bg-black/10 p-3 transition hover:border-white/20 hover:bg-white/8"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{player.fullName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {player.positionCode} · {player.label}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-300">{player.value}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function InfluenceItem({ influence }: { influence: TeamChemistryInfluence }) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{influence.label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{influence.description}</p>
        </div>
        <StatusBadge label={influence.value} tone={statusTone(influence.tone)} />
      </div>
    </article>
  );
}

function UnitCard({
  savegameId,
  unit,
}: {
  savegameId: string;
  unit: TeamChemistryUnit;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Unit Chemistry
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{unit.label}</h3>
          <p className="mt-1 text-sm text-slate-400">{unit.playerCount} aktive Spieler</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge label={`${unit.score}/100`} tone={statusTone(unit.tone)} />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ProgressBar label="Chemistry" tone={unit.tone} value={unit.score} />
        <ProgressBar
          label="Morale"
          tone={unit.influences[0]?.tone ?? "neutral"}
          value={unit.averageMorale}
        />
        <ProgressBar
          label="Scheme Fit"
          tone={unit.influences[1]?.tone ?? "neutral"}
          value={unit.averageFit}
        />
        <ProgressBar
          label="Availability"
          tone={unit.influences[2]?.tone ?? "neutral"}
          value={unit.availabilityScore}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Positive Einfluesse</h4>
          <PlayerSignalList
            emptyLabel="Keine klaren Leader-Signale."
            players={unit.leaders}
            savegameId={savegameId}
          />
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Risiko-Signale</h4>
          <PlayerSignalList
            emptyLabel="Keine akuten Risiko-Signale."
            players={unit.riskPlayers}
            savegameId={savegameId}
          />
        </div>
      </div>
    </article>
  );
}

export default async function TeamChemistryPage({ params }: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const chemistry = buildTeamChemistryState(team);
  const offense = chemistry.units.find((unit) => unit.key === "offense");
  const defense = chemistry.units.find((unit) => unit.key === "defense");

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="UI-Score aus Morale, Unit Fit und Availability."
          label="Chemistry"
          tone={statTone(chemistry.tone)}
          value={`${chemistry.score}/100`}
        />
        <StatCard
          description="Teamweite Stimmung aus dem aktuellen Teamstand."
          label="Team Morale"
          value={String(chemistry.teamMorale)}
        />
        <StatCard
          description="Offense Unit Chemistry."
          label="Offense"
          tone={statTone(offense?.tone)}
          value={offense ? `${offense.score}/100` : "n/a"}
        />
        <StatCard
          description="Defense Unit Chemistry."
          label="Defense"
          tone={statTone(defense?.tone)}
          value={defense ? `${defense.score}/100` : "n/a"}
        />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <SectionPanel
        title="Team Chemistry"
        description={chemistry.summary}
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
              href={`/app/savegames/${savegameId}/team/depth-chart`}
            >
              Depth Chart
            </Link>
          </>
        }
      >
        {chemistry.units.length > 0 ? (
          <div className="grid gap-5 2xl:grid-cols-3">
            {chemistry.units.map((unit) => (
              <UnitCard key={unit.key} savegameId={savegameId} unit={unit} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-black/10 p-5 text-sm text-slate-300">
            {chemistry.emptyMessage}
          </p>
        )}
      </SectionPanel>

      <SectionPanel
        title="Einfluss auf Performance"
        description="Die Faktoren zeigen, warum Chemistry gerade stabil oder fragil wirkt. Es wird keine Game Engine Logik veraendert."
        tone="subtle"
      >
        {chemistry.influences.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {chemistry.influences.map((influence) => (
              <InfluenceItem key={influence.label} influence={influence} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{chemistry.emptyMessage}</p>
        )}
      </SectionPanel>
    </div>
  );
}
