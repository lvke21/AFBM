import { notFound } from "next/navigation";
import Link from "next/link";

import { AttributeTable } from "@/components/player/attribute-table";
import { buildDevelopmentWeekComparison } from "@/components/development/player-development-model";
import { ContractSummary } from "@/components/player/contract-summary";
import { PlayerRoleBadge } from "@/components/player/player-role-badge";
import { buildPlayerRole } from "@/components/player/player-role-model";
import { PlayerValueBadge } from "@/components/player/player-value-badge";
import { buildPlayerValue } from "@/components/player/player-value-model";
import {
  getCompositeRatingItems,
  getCoreRatingItems,
  getPerformanceSnapshotItems,
  getPlayerDecisionLayer,
  getPlayerPositionLabel,
  getPlayerStatusLabel,
  getPlayerTeamLabel,
} from "@/components/player/player-detail-model";
import { PlayerHeader } from "@/components/player/player-header";
import { ProductionSummary } from "@/components/player/production-summary";
import { ProgressionTimeline } from "@/components/player/progression-timeline";
import { RatingGroup } from "@/components/player/rating-group";
import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { getPlayerDetailForUser } from "@/modules/players/application/player-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";

type PlayerPageProps = {
  params: Promise<{
    savegameId: string;
    playerId: string;
  }>;
};

function decisionToneClass(tone: ReturnType<typeof getPlayerDecisionLayer>["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/30 bg-emerald-300/10";
  }

  if (tone === "warning") {
    return "border-amber-300/30 bg-amber-300/10";
  }

  if (tone === "accent") {
    return "border-sky-300/30 bg-sky-300/10";
  }

  return "border-white/10 bg-white/5";
}

function riskToneClass(tone: ReturnType<typeof getPlayerDecisionLayer>["risks"][number]["tone"]) {
  if (tone === "danger") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-white/10 bg-black/15 text-slate-200";
}

function comparisonToneClass(tone: ReturnType<typeof getPlayerDecisionLayer>["comparison"]["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (tone === "accent") {
    return "border-sky-300/25 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-black/15 text-slate-200";
}

function tradeoffToneClass(tone: ReturnType<typeof getPlayerDecisionLayer>["tradeoffs"][number]["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (tone === "accent") {
    return "border-sky-300/25 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-black/15 text-slate-200";
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { savegameId, playerId } = await params;
  const userId = await requirePageUserId();
  const player = await getPlayerDetailForUser(userId, savegameId, playerId);

  if (!player) {
    notFound();
  }

  const focusRatingItems = player.detailRatings.map((rating) => ({
    label: rating.label,
    value: rating.value,
  }));
  const coreRatingItems = getCoreRatingItems(player.evaluation);
  const compositeRatingItems = getCompositeRatingItems(player.compositeRatings);
  const performanceItems = getPerformanceSnapshotItems(player);
  const teamDetail = player.team
    ? await getTeamDetailForUser(userId, savegameId, player.team.id)
    : null;
  const positionPeers =
    teamDetail?.players
      .filter((peer) => peer.positionCode === player.roster?.primaryPositionCode)
      .map((peer) => ({
        age: peer.age,
        depthChartSlot: peer.depthChartSlot,
        fullName: peer.fullName,
        id: peer.id,
        positionCode: peer.positionCode,
        positionOverall: peer.positionOverall,
        potentialRating: peer.potentialRating,
        rosterStatus: peer.rosterStatus,
      })) ?? [];
  const decisionLayer = getPlayerDecisionLayer(player, positionPeers);
  const teamHref = `/app/savegames/${savegameId}/team`;
  const rosterHref = `${teamHref}/roster`;
  const depthChartHref = `${teamHref}/depth-chart`;
  const tradeBoardHref = `${teamHref}/trades`;
  const playerRole = buildPlayerRole({
    age: player.age,
    archetypeName: player.roster?.archetypeName,
    depthChartSlot: player.roster?.depthChartSlot,
    developmentFocus: player.roster?.developmentFocus,
    positionCode: player.roster?.primaryPositionCode,
    positionOverall: player.evaluation?.positionOverall,
    potentialRating: player.evaluation?.potentialRating,
    rosterStatus: player.roster?.rosterStatus,
    schemeFitName: player.roster?.schemeFitName,
    schemeFitScore: player.schemeFitScore,
    secondaryPositionCode: player.roster?.secondaryPositionCode,
  });
  const playerValue = buildPlayerValue({
    age: player.age,
    capHit: player.currentContract?.capHit,
    depthChartSlot: player.roster?.depthChartSlot,
    positionOverall: player.evaluation?.positionOverall,
    potentialRating: player.evaluation?.potentialRating,
    rosterStatus: player.roster?.rosterStatus,
    schemeFitScore: player.schemeFitScore,
  });
  const developmentWeekComparison = buildDevelopmentWeekComparison({
    currentOverall: player.evaluation?.positionOverall ?? null,
    depthChartSlot: player.roster?.depthChartSlot ?? null,
    developmentFocus: player.roster?.developmentFocus ?? false,
    fatigue: player.fatigue,
    history: player.history,
    injuryStatus: player.injuryStatus,
    rosterStatus: player.roster?.rosterStatus ?? null,
    seasonGamesPlayed: player.latestSeason?.gamesPlayed ?? 0,
  });

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label="Player profile navigation">
        <Link
          href={teamHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Team
        </Link>
        <Link
          href={rosterHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
        >
          Roster
        </Link>
        <Link
          href={depthChartHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
        >
          Depth Chart
        </Link>
        <Link
          href={tradeBoardHref}
          className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Trade Board
        </Link>
      </nav>

      <section className={`rounded-lg border p-5 ${decisionToneClass(decisionLayer.tone)}`}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Decision Summary
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {decisionLayer.label}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              {decisionLayer.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                {decisionLayer.primarySignal}
              </span>
              <span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${comparisonToneClass(decisionLayer.comparison.tone)}`}>
                {decisionLayer.comparison.label}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {decisionLayer.comparison.description}
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {decisionLayer.tradeoffs.slice(0, 2).map((tradeoff) => (
                <div
                  key={tradeoff.label}
                  className={`rounded-lg border p-3 ${tradeoffToneClass(tradeoff.tone)}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Trade-off
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{tradeoff.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {tradeoff.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Risiken
            </p>
            {decisionLayer.risks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {decisionLayer.risks.slice(0, 4).map((risk) => (
                  <span
                    key={risk.label}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${riskToneClass(risk.tone)}`}
                    title={risk.description}
                  >
                    {risk.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-emerald-100">
                Keine akuten Entscheidungsrisiken
              </p>
            )}
            {decisionLayer.tradeoffs.length > 2 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Weitere Spannung
                </p>
                {decisionLayer.tradeoffs.slice(2).map((tradeoff) => (
                  <p key={tradeoff.label} className="text-xs leading-5 text-slate-300">
                    <span className="font-semibold text-white">{tradeoff.label}:</span>{" "}
                    {tradeoff.description}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Link
                href={depthChartHref}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                Depth Chart pruefen
              </Link>
              <Link
                href={`/app/savegames/${savegameId}/development`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
              >
                Entwicklung pruefen
              </Link>
              <Link
                href={tradeBoardHref}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Trade Board oeffnen
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Position" value={getPlayerPositionLabel(player)} tone="positive" />
        <StatCard
          label="OVR / POT"
          value={
            player.evaluation
              ? `${player.evaluation.positionOverall} / ${player.evaluation.potentialRating}`
              : "n/a"
          }
        />
        <StatCard label="Team" value={getPlayerTeamLabel(player)} />
        <StatCard label="Status" value={getPlayerStatusLabel(player)} />
      </section>

      <PlayerHeader player={player} saveGameId={savegameId} />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Rolle / Value
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Decision Profile</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <PlayerRoleBadge role={playerRole} />
              <PlayerValueBadge value={playerValue} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Bewertung
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {decisionLayer.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {decisionLayer.description}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {decisionLayer.primarySignal} · {decisionLayer.comparison.label}
              </p>
            </div>

            <div className="rounded-lg border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Rolle
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{playerRole.summary}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{playerRole.description}</p>
              <p className="mt-2 text-xs text-slate-500">{playerRole.reasons.join(" · ")}</p>
            </div>

            <div className="rounded-lg border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Value
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{playerValue.summary}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{playerValue.reason}</p>
              <p className="mt-2 text-xs text-slate-500">{playerValue.reasons.join(" · ")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Performance
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Quick Snapshot</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
            {performanceItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/8 bg-black/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <ContractSummary player={player} />
        <SectionPanel
          title="GM Entscheidungskontext"
          description="Rolle, Entwicklung, Verfuegbarkeit und Scheme Fit auf einen Blick."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Rosterrolle</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {player.roster?.rosterStatus ?? "Kein Team"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {player.roster?.depthChartSlot ? `Depth #${player.roster.depthChartSlot}` : "Ohne Slot"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Entwicklung</p>
              <p className="mt-2 text-lg font-semibold text-white">{player.developmentTrait}</p>
              <p className="mt-1 text-xs text-slate-500">
                Dev Focus {player.roster?.developmentFocus ? "Ja" : "Nein"} · Potential{" "}
                {player.evaluation?.potentialRating ?? "n/a"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Verfuegbarkeit</p>
              <p className="mt-2 text-lg font-semibold text-white">{player.injuryStatus}</p>
              <p className="mt-1 text-xs text-slate-500">
                Fatigue {player.fatigue} · Injury Risk {player.roster?.injuryRisk ?? "n/a"}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Development Wochenvergleich
              </p>
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {developmentWeekComparison.sourceLabel}
              </span>
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Letzte Woche
                </p>
                <p className="mt-1 font-semibold text-white">
                  {developmentWeekComparison.lastWeek}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Aktueller Stand
                </p>
                <p className="mt-1 font-semibold text-white">
                  {developmentWeekComparison.current}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Veraenderung
                </p>
                <p className="mt-1 font-semibold text-white">
                  {developmentWeekComparison.change}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Moegliche Ursache
                </p>
                <p className="mt-1 text-slate-300">{developmentWeekComparison.cause}</p>
              </div>
            </div>
          </div>
          {player.teamSchemes ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Team Schemes: {player.teamSchemes.offense ?? "n/a"} ·{" "}
              {player.teamSchemes.defense ?? "n/a"} ·{" "}
              {player.teamSchemes.specialTeams ?? "n/a"} · Fit {player.schemeFitScore ?? "n/a"}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Kein Teamkontext vorhanden. Scheme Fit und Depth Chart koennen erst mit Teamzuordnung
              bewertet werden.
            </div>
          )}
        </SectionPanel>
      </section>

      <RatingGroup
        title="Core Ratings"
        description="OVR, Potential und aggregierte Teilbereiche aus der Spielerbewertung."
        emptyMessage="Keine Core Ratings fuer diesen Spieler vorhanden."
        items={coreRatingItems}
      />

      <RatingGroup
        title="Focus Ratings"
        description="Die wichtigsten Teilratings fuer Position, Rolle und GM-Bewertung."
        emptyMessage="Keine Focus Ratings fuer diesen Spieler vorhanden."
        items={focusRatingItems}
      />

      <RatingGroup
        title="Composite Ratings"
        description="Football-Ratings fuer Passing, Protection, Coverage, Special Teams und mehr."
        items={compositeRatingItems}
      />

      <SectionPanel
        title="Attributes"
        description="Rohattribute gruppiert nach Football-Bereichen."
      >
        <AttributeTable groups={player.attributeGroups} />
      </SectionPanel>

      <ProductionSummary career={player.career} latestSeason={player.latestSeason} />

      <ProgressionTimeline history={player.history} />
    </div>
  );
}
