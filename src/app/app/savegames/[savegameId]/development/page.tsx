import Link from "next/link";

import {
  buildPlayerDevelopmentState,
  type DevelopmentBarTone,
  type PlayerDevelopmentCandidate,
} from "@/components/development/player-development-model";
import { SectionPanel } from "@/components/layout/section-panel";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

import { loadCanonicalTeamPageData } from "../team/team-route-data";
import { setDevelopmentFocusAction } from "./actions";

type DevelopmentPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

function progressToneClass(tone: DevelopmentBarTone) {
  if (tone === "positive") {
    return "bg-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-300";
  }

  if (tone === "danger") {
    return "bg-rose-300";
  }

  if (tone === "active") {
    return "bg-sky-300";
  }

  return "bg-slate-300";
}

function ProgressBar({
  label,
  meta,
  tone = "default",
  value,
}: {
  label: string;
  meta?: string;
  tone?: DevelopmentBarTone;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">{meta ?? `${value}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${progressToneClass(tone)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function badgeTone(candidate: PlayerDevelopmentCandidate) {
  if (candidate.trendDirection === "rising") {
    return "success";
  }

  if (candidate.trendDirection === "falling") {
    return "danger";
  }

  if (candidate.developmentFocus) {
    return "active";
  }

  if (candidate.injuryStatus !== "HEALTHY" || candidate.freshnessPercent <= 25) {
    return "danger";
  }

  if (candidate.upside >= 8) {
    return "success";
  }

  return "neutral";
}

function trendTone(candidate: PlayerDevelopmentCandidate) {
  if (candidate.trendDirection === "rising") {
    return "success";
  }

  if (candidate.trendDirection === "falling") {
    return "danger";
  }

  return "warning";
}

function comparisonBadgeTone(candidate: PlayerDevelopmentCandidate) {
  if (candidate.weekComparison.tone === "positive") {
    return "success";
  }

  if (candidate.weekComparison.tone === "danger") {
    return "danger";
  }

  if (candidate.weekComparison.tone === "active") {
    return "active";
  }

  return "warning";
}

function FocusActionForm({
  candidate,
  managerControlled,
  savegameId,
  teamId,
}: {
  candidate: PlayerDevelopmentCandidate;
  managerControlled: boolean;
  savegameId: string;
  teamId: string;
}) {
  if (!managerControlled) {
    return <StatusBadge label="Readonly" tone="neutral" />;
  }

  const nextFocus = !candidate.developmentFocus;

  return (
    <form action={setDevelopmentFocusAction}>
      <input type="hidden" name="saveGameId" value={savegameId} />
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="playerId" value={candidate.id} />
      <input type="hidden" name="depthChartSlot" value={candidate.depthChartSlot ?? ""} />
      <input type="hidden" name="rosterStatus" value={candidate.rosterStatus} />
      <input type="hidden" name="specialRole" value={candidate.specialRole ?? ""} />
      {candidate.captainFlag ? <input type="hidden" name="captainFlag" value="on" /> : null}
      {nextFocus ? <input type="hidden" name="developmentFocus" value="on" /> : null}
      <FormSubmitButton pendingLabel="Fokus wird gespeichert...">
        {nextFocus ? "Fokus setzen" : "Fokus entfernen"}
      </FormSubmitButton>
    </form>
  );
}

function CandidateCard({
  candidate,
  managerControlled,
  savegameId,
  teamId,
}: {
  candidate: PlayerDevelopmentCandidate;
  managerControlled: boolean;
  savegameId: string;
  teamId: string;
}) {
  const playerHref = `/app/savegames/${savegameId}/players/${candidate.id}`;

  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={candidate.trendLabel} tone={trendTone(candidate)} />
            <StatusBadge label={candidate.formLabel} tone={badgeTone(candidate)} />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">
            <Link className="transition hover:text-sky-200" href={playerHref}>
              {candidate.fullName}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {candidate.positionCode} · {candidate.roleLabel} · {candidate.roleSummary}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              OVR / POT
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {candidate.positionOverall}/{candidate.potentialRating}
            </p>
          </div>
          <FocusActionForm
            candidate={candidate}
            managerControlled={managerControlled}
            savegameId={savegameId}
            teamId={teamId}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressBar
          label="Progress"
          meta={`${candidate.progressPercent}%`}
          tone={candidate.progressPercent >= 90 ? "positive" : "active"}
          value={candidate.progressPercent}
        />
        <ProgressBar
          label="Morale"
          tone={candidate.moralePercent >= 70 ? "positive" : "warning"}
          value={candidate.moralePercent}
        />
        <ProgressBar
          label="Freshness"
          tone={candidate.freshnessPercent <= 25 ? "danger" : "positive"}
          value={candidate.freshnessPercent}
        />
        <ProgressBar
          label="Scheme Fit"
          meta={candidate.fitPercent == null ? "n/a" : `${candidate.fitPercent}%`}
          tone={candidate.fitPercent == null ? "default" : "positive"}
          value={candidate.fitPercent ?? 0}
        />
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Development Feedback
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{candidate.feedback}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {candidate.decisionConnection}
            </p>
          </div>
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/16"
            href={`/app/savegames/${savegameId}/team/depth-chart`}
          >
            Depth Chart Bezug
          </Link>
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Wochenvergleich
            </p>
            <StatusBadge
              label={candidate.weekComparison.sourceLabel}
              tone={comparisonBadgeTone(candidate)}
            />
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Letzte Woche
              </p>
              <p className="mt-1 font-semibold text-white">{candidate.weekComparison.lastWeek}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Aktueller Stand
              </p>
              <p className="mt-1 font-semibold text-white">{candidate.weekComparison.current}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Veraenderung
              </p>
              <p className="mt-1 font-semibold text-white">{candidate.weekComparison.change}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Moegliche Ursache
              </p>
              <p className="mt-1 text-slate-300">{candidate.weekComparison.cause}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {candidate.factors.map((factor) => (
            <ProgressBar
              key={factor.label}
              label={factor.label}
              meta={factor.value}
              tone={factor.tone}
              value={factor.score}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1">
          Age {candidate.age}
        </span>
        <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1">
          {candidate.focusReason}
        </span>
        <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1">
          {candidate.rosterStatus.replaceAll("_", " ")}
          {candidate.depthChartSlot ? ` · Slot #${candidate.depthChartSlot}` : ""}
        </span>
      </div>
    </article>
  );
}

export default async function DevelopmentPage({ params }: DevelopmentPageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const development = buildPlayerDevelopmentState(team);
  const formPlayers = [...development.candidates]
    .sort((left, right) => {
      if (left.injuryStatus !== right.injuryStatus) {
        return left.injuryStatus === "HEALTHY" ? 1 : -1;
      }

      return left.freshnessPercent - right.freshnessPercent;
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Spieler mit aktiver Trainingsprioritaet."
          label="Focus Spieler"
          tone={development.focusedCount > 0 ? "active" : "default"}
          value={String(development.focusedCount)}
        />
        <StatCard
          description="Durchschnittlicher Fortschritt Richtung Potential."
          label="Avg Progress"
          tone="positive"
          value={`${development.averageProgress}%`}
        />
        <StatCard
          description="Durchschnittlicher Abstand zwischen OVR und POT."
          label="Avg Upside"
          value={`+${development.averageUpside}`}
        />
        <StatCard
          description="Fatigue oder Injury Signale, die Development bremsen koennen."
          label="Risk Signals"
          tone={development.riskCount > 0 ? "warning" : "positive"}
          value={String(development.riskCount)}
        />
      </section>

      <SectionPanel
        title="Player Development"
        description={`${team.name} · ${development.summary}`}
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
        {development.candidates.length > 0 ? (
          <div className="space-y-4">
            {development.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                managerControlled={development.managerControlled}
                savegameId={savegameId}
                teamId={teamId}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            {development.emptyMessage}
          </p>
        )}
      </SectionPanel>

      <section className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionPanel
            title="Development Trend"
            description="Kompakte Progress-Liste fuer Spieler mit Fokus oder sichtbarem Upside."
            tone="subtle"
          >
            {development.trendPlayers.length > 0 ? (
              <div className="space-y-4">
                {development.trendPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-lg border border-white/10 bg-black/15 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{player.fullName}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {player.positionCode} · {player.trendLabel} · {player.feedback}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-200">
                        +{player.upside} POT
                      </span>
                    </div>
                    <ProgressBar
                      label="OVR zu POT"
                      meta={`${player.positionOverall}/${player.potentialRating}`}
                      tone={player.developmentFocus ? "active" : "positive"}
                      value={player.progressPercent}
                    />
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Wochenvergleich
                        </span>
                        <StatusBadge
                          label={player.weekComparison.change}
                          tone={comparisonBadgeTone(player)}
                        />
                      </div>
                      <p className="mt-2 leading-5 text-slate-300">
                        {player.weekComparison.lastWeek} {"->"} {player.weekComparison.current} ·{" "}
                        {player.weekComparison.cause}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{development.emptyMessage}</p>
            )}
          </SectionPanel>
        </div>

        <div className="xl:col-span-5">
          <SectionPanel
            title="Aktuelle Form"
            description="Morale, Freshness und Injury Status als direkte Spieler-Signale."
            tone="subtle"
          >
            {formPlayers.length > 0 ? (
              <div className="space-y-3">
                {formPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-lg border border-white/10 bg-black/15 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{player.fullName}</p>
                        <p className="text-sm text-slate-400">
                          {player.positionCode} · {player.injuryStatus}
                        </p>
                      </div>
                      <StatusBadge label={player.formLabel} tone={badgeTone(player)} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ProgressBar label="Morale" value={player.moralePercent} />
                      <ProgressBar
                        label="Freshness"
                        tone={player.freshnessPercent <= 25 ? "danger" : "positive"}
                        value={player.freshnessPercent}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{development.emptyMessage}</p>
            )}
          </SectionPanel>
        </div>
      </section>
    </div>
  );
}
