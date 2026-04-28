"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";

import { FieldSituationPanel } from "./field-situation-panel";
import { liveEventDramaturgy } from "./live-event-dramaturgy";
import { finalKeyStatements } from "./live-to-report-transition-model";
import { LiveMatchHeader } from "./live-match-header";
import type {
  LiveMomentumIndicator,
  LiveSimulationMatch,
  LiveSimulationState,
  LiveStorylineItem,
  LiveTimelineEntry,
} from "./live-simulation-model";
import { LiveStorylinePanel } from "./live-storyline-panel";
import { MomentumFlowPanel } from "./momentum-flow-panel";
import { PlayByPlayTimeline } from "./play-by-play-timeline";

type LiveSimulationFlowProps = {
  finishAction: (formData: FormData) => Promise<void>;
  match: LiveSimulationMatch;
  reportHref: string;
  saveGameId: string;
  setupHref: string;
  state: LiveSimulationState;
};

type ScorePair = {
  away: number;
  home: number;
};

const SPEEDS = [
  { label: "Auto", value: 350 },
  { label: "0.5s", value: 500 },
  { label: "0.75s", value: 750 },
  { label: "1s", value: 1000 },
];

function parseScorePair(value: string | undefined): ScorePair {
  const match = value?.match(/(\d+)\s*-\s*(\d+)/);

  if (!match) {
    return { away: 0, home: 0 };
  }

  return {
    home: Number(match[1] ?? 0),
    away: Number(match[2] ?? 0),
  };
}

function numericScore(value: number | string): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function scoreForProgress(entries: LiveTimelineEntry[], visibleCount: number): ScorePair {
  if (visibleCount > 0) {
    const current = entries[visibleCount - 1];
    return parseScorePair(current?.scoreChangeLabel.split("->")[1]?.trim());
  }

  return parseScorePair(entries[0]?.scoreChangeLabel.split("->")[0]?.trim());
}

function scoreStory(homeAbbreviation: string, awayAbbreviation: string, score: ScorePair): LiveStorylineItem {
  const margin = Math.abs(score.home - score.away);

  if (margin === 0) {
    return {
      description: "Der Score ist offen. Der naechste Drive kann den ersten echten Ausschlag setzen.",
      label: "Current Game State",
      title: "Alles offen",
      tone: "active",
    };
  }

  const leader = score.home > score.away ? homeAbbreviation : awayAbbreviation;

  return {
    description:
      margin <= 7
        ? `${leader} fuehrt nur mit ${margin}. Jeder weitere Drive kann das Spiel kippen.`
        : `${leader} hat sich mit ${margin} Punkten Luft verschafft.`,
    label: "Current Game State",
    title: margin <= 7 ? "Enges Spiel" : "Kontrolle kippt",
    tone: margin <= 7 ? "warning" : "active",
  };
}

function keyDriveStory(visibleEntries: LiveTimelineEntry[]): LiveStorylineItem {
  const current =
    [...visibleEntries].reverse().find((entry) => entry.isImportant) ??
    visibleEntries.at(-1) ??
    null;

  if (!current) {
    return {
      description: "Noch kein Drive wurde aufgedeckt. Beobachte zuerst, wer den Ball bewegt und wer den ersten Fehler macht.",
      label: "Key Drive",
      title: "Kickoff steht an",
      tone: "neutral",
    };
  }

  const dramaturgy = liveEventDramaturgy(current);

  return {
    description: `${dramaturgy.momentDescription} ${current.offenseTeamAbbreviation}: ${current.description}`,
    label: "Key Drive",
    title: current.isImportant ? dramaturgy.momentTitle : "Letzter Drive",
    tone: current.tone,
  };
}

function momentumStory(
  visibleEntries: LiveTimelineEntry[],
  homeAbbreviation: string,
  awayAbbreviation: string,
  score: ScorePair,
): LiveStorylineItem {
  const recent = visibleEntries.slice(-3);
  const turnover = recent.find((entry) => entry.highlight === "turnover");
  const scoreDelta = recent.reduce((sum, entry) => {
    const [start, end] = entry.scoreChangeLabel.split("->");
    const started = parseScorePair(start?.trim());
    const ended = parseScorePair(end?.trim());
    return sum + Math.max(0, ended.home + ended.away - started.home - started.away);
  }, 0);

  if (turnover) {
    const dramaturgy = liveEventDramaturgy(turnover);

    return {
      description: `${dramaturgy.momentDescription} Die naechste Antwort entscheidet, ob Momentum kippt.`,
      label: "Momentum Signal",
      title: "Game Changing Moment",
      tone: "danger",
    };
  }

  if (scoreDelta > 0) {
    const scoringEntry = [...recent].reverse().find((entry) => entry.highlight === "touchdown" || entry.highlight === "field-goal");
    const dramaturgy = scoringEntry ? liveEventDramaturgy(scoringEntry) : null;

    return {
      description: dramaturgy
        ? `${dramaturgy.momentDescription} ${scoreDelta} Punkt(e) in den letzten ${recent.length} Drive(s).`
        : `${scoreDelta} Punkt(e) in den letzten ${recent.length} Drive(s). Das Spiel bekommt Richtung.`,
      label: "Momentum Signal",
      title: dramaturgy?.momentTitle ?? "Drive-Rhythmus steigt",
      tone: "success",
    };
  }

  return scoreStory(homeAbbreviation, awayAbbreviation, score);
}

function watchNextStory(entries: LiveTimelineEntry[], visibleCount: number): LiveStorylineItem {
  const current = entries[visibleCount - 1] ?? null;
  const next = entries[visibleCount] ?? null;

  if (!current) {
    return {
      description: next
        ? `${next.offenseTeamAbbreviation} bekommt den ersten sichtbaren Drive.`
        : "Warte auf den ersten Drive.",
      label: "What to watch next",
      title: "Erster Drive setzt den Ton",
      tone: "active",
    };
  }

  if (!next) {
    return {
      description: "Alle Drives sind sichtbar. Der Match Report kann jetzt den Ausgang einordnen.",
      label: "What to watch next",
      title: "Bereit fuer Report",
      tone: "success",
    };
  }

  if (current.highlight === "turnover") {
    const dramaturgy = liveEventDramaturgy(current);

    return {
      description: `${dramaturgy.momentDescription} ${next.offenseTeamAbbreviation} bekommt die Chance auf eine direkte Antwort.`,
      label: "What to watch next",
      title: "Antwort auf den Swing",
      tone: "danger",
    };
  }

  if (current.highlight === "touchdown" || current.highlight === "field-goal") {
    const dramaturgy = liveEventDramaturgy(current);

    return {
      description: `${dramaturgy.momentDescription} ${next.offenseTeamAbbreviation} muss jetzt antworten.`,
      label: "What to watch next",
      title: "Antwort nach Score",
      tone: "warning",
    };
  }

  if (current.highlight === "big-gain") {
    const dramaturgy = liveEventDramaturgy(current);

    return {
      description: `${dramaturgy.momentDescription} Jetzt zaehlt, ob daraus ein Score oder nur Feldposition wird.`,
      label: "What to watch next",
      title: "Big Play verwerten",
      tone: "success",
    };
  }

  if (current.highlight === "red-zone") {
    const dramaturgy = liveEventDramaturgy(current);

    return {
      description: `${dramaturgy.momentDescription} Der naechste Drive zeigt, ob die Defense den Druck tragen kann.`,
      label: "What to watch next",
      title: "Red Zone Pressure",
      tone: "warning",
    };
  }

  return {
    description: `${next.offenseTeamAbbreviation} ist als naechstes am Ball. Achte auf Raumgewinn, Fehlerdruck und Field Position.`,
    label: "What to watch next",
    title: "Naechster Drive",
    tone: "active",
  };
}

function buildMomentumIndicators(
  visibleEntries: LiveTimelineEntry[],
  state: LiveSimulationState,
  score: ScorePair,
): LiveMomentumIndicator[] {
  const leader =
    score.home === score.away
      ? "Unentschieden"
      : score.home > score.away
        ? state.homeTeam.abbreviation
        : state.awayTeam.abbreviation;
  const latest = visibleEntries.at(-1);
  const recent = visibleEntries.slice(-3);

  return [
    {
      description:
        leader === "Unentschieden"
          ? "Der sichtbare Zwischenstand ist ausgeglichen."
          : `${leader} fuehrt aktuell mit ${Math.abs(score.home - score.away)} Punkt(en).`,
      label: "Score Edge",
      sourceLabel: "Gespeichert",
      tone: leader === "Unentschieden" ? "neutral" : "active",
      value: leader,
    },
    {
      description: latest?.description ?? "Noch kein Drive aufgedeckt.",
      label: "Last Drive",
      sourceLabel: latest ? "Gespeichert" : "Spielsignal",
      tone: latest?.tone ?? "neutral",
      value: latest?.resultLabel ?? "Kickoff",
    },
    {
      description:
        recent.length > 0
          ? `${recent.length} sichtbare Drive(s), ${recent.filter((entry) => entry.isImportant).length} davon mit Ereignisgewicht.`
          : "Drive-Rhythmus entsteht, sobald der erste Drive sichtbar wird.",
      label: "Drive Flow",
      sourceLabel: recent.length > 0 ? "Gespeichert" : "Spielsignal",
      tone: recent.some((entry) => entry.highlight === "turnover")
        ? "danger"
        : recent.some((entry) => entry.isImportant)
          ? "success"
          : "neutral",
      value:
        recent.length === 0
          ? "Wartet"
          : recent.some((entry) => entry.highlight === "turnover")
            ? "Gekippt"
            : recent.some((entry) => entry.isImportant)
              ? "Aktiv"
              : "Stabil",
    },
  ];
}

function buildVisibleState(
  state: LiveSimulationState,
  visibleCount: number,
): LiveSimulationState {
  const entries = state.timeline;
  const visibleEntries = entries.slice(0, visibleCount);
  const score = scoreForProgress(entries, visibleCount);
  const current = visibleEntries.at(-1);
  const next = entries[visibleCount] ?? null;
  const currentGameState = scoreStory(state.homeTeam.abbreviation, state.awayTeam.abbreviation, score);
  const momentumSignal = momentumStory(
    visibleEntries,
    state.homeTeam.abbreviation,
    state.awayTeam.abbreviation,
    score,
  );
  const managerImpact: LiveStorylineItem =
    current?.lineupContext
      ? {
          description: current.lineupContext,
          label: "Manager Impact",
          title: "Lineup wirkt im Drive",
          tone: "active",
        }
      : visibleCount >= entries.length
        ? state.storyline.managerImpact
        : {
            description: "Lineup-Wirkung wird eingeblendet, sobald ein passender Drive im Ablauf erscheint.",
            label: "Manager Impact",
            title: "Entscheidung beobachten",
            tone: "neutral",
          };

  return {
    ...state,
    awayTeam: {
      ...state.awayTeam,
      score: score.away,
    },
    driveCountLabel: `${visibleCount} / ${entries.length} Drives`,
    hasTimeline: visibleEntries.length > 0,
    homeTeam: {
      ...state.homeTeam,
      score: score.home,
    },
    momentumIndicators: buildMomentumIndicators(visibleEntries, state, score),
    scoreLine: `${state.homeTeam.abbreviation} ${score.home} : ${score.away} ${state.awayTeam.abbreviation}`,
    situation: current
      ? {
          clockLabel: current.phaseLabel,
          downDistanceLabel: current.resultLabel,
          fieldPositionLabel: current.scoreChangeLabel,
          phaseLabel: current.phaseLabel,
          possessionLabel: `Aktuelle Possession: ${current.offenseTeamAbbreviation}`,
          sourceLabel: "Drive Details",
          summary: current.description,
        }
      : {
          clockLabel: next?.phaseLabel ?? "Kickoff",
          downDistanceLabel: "Drive wartet",
          fieldPositionLabel: "0-0",
          phaseLabel: "Kickoff",
          possessionLabel: next ? `Naechste Possession: ${next.offenseTeamAbbreviation}` : "Noch offen",
          sourceLabel: "Game State",
          summary: "Das Spiel startet im Live-Playback. Der Score entwickelt sich Drive fuer Drive.",
        },
    storyline: {
      currentGameState,
      keyDrive: keyDriveStory(visibleEntries),
      managerImpact,
      momentumSignal,
      watchNext: watchNextStory(entries, visibleCount),
    },
    timeline: visibleEntries,
    timelineEmptyMessage: "Der erste Drive wird gleich sichtbar. Der Report bleibt bis zum Playback-Ende zurueckgestellt.",
  };
}

function progressLabel(visibleCount: number, total: number) {
  if (total === 0) {
    return "Keine Drives";
  }

  if (visibleCount >= total) {
    return "Playback komplett";
  }

  return `Drive ${visibleCount + 1} von ${total} folgt`;
}

export function LiveSimulationFlow({
  finishAction,
  match,
  reportHref,
  saveGameId,
  setupHref,
  state,
}: LiveSimulationFlowProps) {
  const totalDrives = state.timeline.length;
  const [visibleCount, setVisibleCount] = useState(totalDrives > 0 ? 1 : totalDrives);
  const [isPaused, setPaused] = useState(false);
  const [speedMs, setSpeedMs] = useState(350);
  const playbackComplete = totalDrives === 0 || visibleCount >= totalDrives;
  const visibleState = useMemo(
    () => buildVisibleState(state, visibleCount),
    [state, visibleCount],
  );
  const progressPercent = totalDrives === 0 ? 100 : Math.round((visibleCount / totalDrives) * 100);
  const currentEntry = visibleState.timeline.at(-1) ?? null;
  const nextEntry = state.timeline[visibleCount] ?? null;
  const currentDramaturgy = currentEntry ? liveEventDramaturgy(currentEntry) : null;
  const finalStatements = finalKeyStatements(visibleState, visibleState.timeline, {
    away: numericScore(visibleState.awayTeam.score),
    home: numericScore(visibleState.homeTeam.score),
  });
  const reportReady = match.status === "COMPLETED";

  useEffect(() => {
    if (isPaused || playbackComplete) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((current) => Math.min(current + 1, totalDrives));
    }, speedMs);

    return () => window.clearTimeout(timer);
  }, [isPaused, playbackComplete, speedMs, totalDrives, visibleCount]);

  return (
    <div className="space-y-8">
      <LiveMatchHeader match={match} state={visibleState} />

      <section className="rounded-lg border border-sky-300/25 bg-sky-300/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Live-Ablauf
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Spiel verfolgen</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Die bestehende Simulation wird Drive fuer Drive aufgedeckt. Score, Quarter und
              Momentum aktualisieren sich erst, wenn der naechste Drive sichtbar wird.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <StatusBadge label={progressLabel(visibleCount, totalDrives)} tone={playbackComplete ? "success" : "active"} />
            <StatusBadge label={`${progressPercent}%`} tone="neutral" />
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-sky-300 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <article className={`rounded-lg border p-4 ${currentDramaturgy?.borderClass ?? "border-white/10 bg-black/15"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {currentDramaturgy?.eyebrow ?? "Aktueller Drive"}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {currentDramaturgy?.momentTitle ?? (currentEntry ? currentEntry.title : nextEntry ? `${nextEntry.offenseTeamAbbreviation} wartet` : "Kein Drive")}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {currentEntry
                ? `${currentDramaturgy?.momentDescription ?? ""} ${currentEntry.description}`.trim()
                : "Kickoff steht an. Der erste Drive wird gleich eingeblendet."}
            </p>
          </article>
          <article className={`rounded-lg border p-4 ${currentDramaturgy?.borderClass ?? "border-white/10 bg-black/15"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Letztes Event
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {currentDramaturgy?.badgeLabel ?? currentEntry?.resultLabel ?? "Noch offen"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {currentEntry ? `Score ${currentEntry.scoreChangeLabel}` : "Noch kein Event sichtbar."}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Naechstes Momentum
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {visibleState.storyline.watchNext.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {visibleState.storyline.watchNext.description}
            </p>
          </article>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Playback Geschwindigkeit">
            {SPEEDS.map((speed) => (
              <button
                key={speed.value}
                type="button"
                onClick={() => setSpeedMs(speed.value)}
                className={[
                  "min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  speedMs === speed.value
                    ? "border-sky-300/40 bg-sky-300/15 text-sky-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                ].join(" ")}
              >
                {speed.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPaused((current) => !current)}
            disabled={playbackComplete}
            className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPaused ? "Fortsetzen" : "Pausieren"}
          </button>
        </div>
      </section>

      <LiveStorylinePanel state={visibleState} />

      <section className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <FieldSituationPanel state={visibleState} />
        <section className="h-fit rounded-lg border border-sky-300/25 bg-sky-300/10 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Spielende
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {playbackComplete ? state.control.primaryLabel : "Playback laeuft"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <StatusBadge label={state.control.statusLabel} tone="warning" />
              <StatusBadge label={state.control.weekStateLabel} tone={state.control.canFinishGame ? "success" : "warning"} />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            {playbackComplete
              ? state.control.primaryDescription
              : "Der Match Report wird freigegeben, sobald alle Drives sichtbar waren."}
          </p>

          {state.control.canFinishGame ? (
            <form action={finishAction} className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-black/15 p-4">
              <input type="hidden" name="saveGameId" value={saveGameId} />
              <input type="hidden" name="matchId" value={match.id} />
              {playbackComplete ? (
                <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label="Final Whistle" tone="success" />
                    <StatusBadge label="Spiel beendet" tone="success" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    Final Score
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {visibleState.homeTeam.abbreviation} {visibleState.homeTeam.score} : {visibleState.awayTeam.score}{" "}
                    {visibleState.awayTeam.abbreviation}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {finalStatements.map((statement) => (
                      <p key={statement} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-200">
                        {statement}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Spiel laeuft
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {visibleState.homeTeam.abbreviation} {visibleState.homeTeam.score} : {visibleState.awayTeam.score}{" "}
                    {visibleState.awayTeam.abbreviation}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Der Score entsteht Drive fuer Drive. Der Report bleibt bis zum Schlusspfiff zu.
                  </p>
                </div>
              )}
              <div className="[&>button]:w-full">
                <FormSubmitButton disabled={!playbackComplete} pendingLabel="Report wird geoeffnet...">
                  {playbackComplete ? "Zum Match Report" : "Report nach Schlusspfiff"}
                </FormSubmitButton>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4">
              <StatusBadge label="Noch nicht bereit" tone="warning" />
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {state.control.blockedReason ?? "Keine Live-Aktion verfuegbar."}
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href={setupHref}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Setup oeffnen
            </Link>
            {reportReady ? (
              <Link
                href={reportHref}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                Finalen Report oeffnen
              </Link>
            ) : playbackComplete ? (
              <span
                aria-disabled="true"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100"
              >
                Report nach Schlusspfiff
              </span>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                Report nach Schlusspfiff
              </span>
            )}
          </div>
        </section>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <PlayByPlayTimeline state={visibleState} />
        <MomentumFlowPanel state={visibleState} />
      </section>
    </div>
  );
}
