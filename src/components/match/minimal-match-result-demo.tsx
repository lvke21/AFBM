"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildMinimalMatchResultCopy,
  normalizeMinimalMatchTeamStats,
} from "@/components/match/minimal-match-result-copy";
import {
  createInitialMatchFlowState,
  startMatch,
} from "@/modules/gameplay/application/minimal-match-flow";
import type {
  MinimalMatchSimulationResult,
  MinimalMatchTeamStats,
} from "@/modules/gameplay/application/minimal-match-simulation";

const TEAM_A = {
  id: "demo-home",
  name: "Home Team",
  rating: 78,
};

const TEAM_B = {
  id: "demo-away",
  name: "Away Team",
  rating: 72,
};

function teamResultTone(result: MinimalMatchSimulationResult | null, team: "A" | "B") {
  if (!result) {
    return "border-white/10 bg-white/5";
  }

  return result.winner === team
    ? "border-emerald-300/35 bg-emerald-300/12"
    : "border-white/10 bg-white/5";
}

function formatStat(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function statRows(result: MinimalMatchSimulationResult) {
  const teamAStats = normalizeMinimalMatchTeamStats(result.teamAStats);
  const teamBStats = normalizeMinimalMatchTeamStats(result.teamBStats);

  return [
    {
      label: "Total Yards",
      teamA: teamAStats.totalYards,
      teamB: teamBStats.totalYards,
    },
    {
      label: "Passing Yards",
      teamA: teamAStats.passingYards,
      teamB: teamBStats.passingYards,
    },
    {
      label: "Rushing Yards",
      teamA: teamAStats.rushingYards,
      teamB: teamBStats.rushingYards,
    },
    {
      label: "First Downs",
      teamA: teamAStats.firstDowns,
      teamB: teamBStats.firstDowns,
    },
    {
      label: "Turnovers",
      teamA: teamAStats.turnovers,
      teamB: teamBStats.turnovers,
      lowerIsBetter: true,
    },
  ];
}

function statValueClass(
  left: number,
  right: number,
  side: "left" | "right",
  lowerIsBetter = false,
) {
  if (left === right) {
    return "text-white";
  }

  const leftIsBetter = lowerIsBetter ? left < right : left > right;
  const highlighted = side === "left" ? leftIsBetter : !leftIsBetter;

  return highlighted ? "text-emerald-100" : "text-slate-300";
}

function TeamScoreCard({
  isWinner,
  label,
  score,
  stats,
  toneClass,
}: {
  isWinner: boolean;
  label: string;
  score: number | null;
  stats: MinimalMatchTeamStats | null;
  toneClass: string;
}) {
  const safeStats = normalizeMinimalMatchTeamStats(stats);

  return (
    <div className={`rounded-lg border p-5 text-center ${toneClass}`}>
      <div className="flex min-h-7 items-center justify-center">
        {isWinner ? (
          <StatusBadge label="Sieger" tone="success" />
        ) : (
          <span className="text-xs font-semibold uppercase text-slate-400">Team</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-white">{label}</h3>
      <p className="mt-3 text-5xl font-semibold text-white md:text-6xl">
        {score ?? "-"}
      </p>
      <p className="mt-2 text-sm text-slate-300">
        {stats ? `${formatStat(safeStats.totalYards)} Yards` : "Simulation bereit"}
      </p>
    </div>
  );
}

export function MinimalMatchResultDemo() {
  const runCounter = useRef(0);
  const simulationPendingRef = useRef(false);
  const simulationTimeoutRef = useRef<number | null>(null);
  const [flowState, setFlowState] = useState(createInitialMatchFlowState);
  const [isSimulating, setSimulating] = useState(false);
  const result = flowState.result;
  const hasResult = Boolean(result);
  const resultCopy = result
    ? buildMinimalMatchResultCopy({
        result,
        teamAName: TEAM_A.name,
        teamBName: TEAM_B.name,
      })
    : null;

  useEffect(() => () => {
    if (simulationTimeoutRef.current != null) {
      window.clearTimeout(simulationTimeoutRef.current);
    }
  }, []);

  function handleStartMatch() {
    if (simulationPendingRef.current) {
      return;
    }

    simulationPendingRef.current = true;
    setSimulating(true);

    simulationTimeoutRef.current = window.setTimeout(() => {
      runCounter.current += 1;
      const { state } = startMatch({
        seed: `minimal-ui-match-${runCounter.current}`,
        teamA: TEAM_A,
        teamB: TEAM_B,
      });

      setFlowState(state);
      setSimulating(false);
      simulationPendingRef.current = false;
      simulationTimeoutRef.current = null;
    }, 120);
  }

  return (
    <section className="glass-panel rounded-[2rem] p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-slate-300">
            Minimal Match
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {resultCopy?.headline ?? "Schnellsimulation"}
          </h2>
          <div className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
            {resultCopy ? (
              resultCopy.summary.map((line) => <p key={line}>{line}</p>)
            ) : (
              <p>Starte ein Spiel und erhalte sofort Score, Sieger und kompakte Team-Stats.</p>
            )}
          </div>
        </div>
        <StatusBadge
          label={result?.tiebreakerApplied ? "Tiebreak entschieden" : hasResult ? "Final" : "Bereit"}
          tone={result?.tiebreakerApplied ? "warning" : hasResult ? "success" : "active"}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <TeamScoreCard
          isWinner={result?.winner === "A"}
          label={TEAM_A.name}
          score={result?.scoreA ?? null}
          stats={result?.teamAStats ?? null}
          toneClass={teamResultTone(result, "A")}
        />
        <div className="flex items-center justify-center rounded-lg border border-white/10 bg-black/15 px-4 py-3 text-sm font-semibold text-slate-300 md:min-w-16">
          vs
        </div>
        <TeamScoreCard
          isWinner={result?.winner === "B"}
          label={TEAM_B.name}
          score={result?.scoreB ?? null}
          stats={result?.teamBStats ?? null}
          toneClass={teamResultTone(result, "B")}
        />
      </div>

      {result ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {statRows(result).map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_1.2fr_1fr] items-center gap-2 border-b border-white/10 px-3 py-3 text-sm last:border-b-0 sm:px-4"
            >
              <p
                className={`text-left font-semibold ${statValueClass(row.teamA, row.teamB, "left", row.lowerIsBetter)}`}
              >
                {formatStat(row.teamA)}
              </p>
              <p className="text-center text-xs font-semibold uppercase text-slate-400">
                {row.label}
              </p>
              <p
                className={`text-right font-semibold ${statValueClass(row.teamA, row.teamB, "right", row.lowerIsBetter)}`}
              >
                {formatStat(row.teamB)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleStartMatch}
            disabled={isSimulating}
            aria-busy={isSimulating}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/22 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulating
              ? "Simulation laeuft..."
              : hasResult
                ? "Re-Match simulieren"
                : "Spiel starten"}
          </button>
          {hasResult ? (
            <Link
              href="/app/savegames"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Zurueck zum Hub
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-4 py-2 text-sm font-semibold text-slate-500"
            >
              Ergebnis zuerst simulieren
            </span>
          )}
        </div>
        {hasResult ? (
          <p className="text-xs leading-5 text-slate-400">
            Das Ergebnis bleibt stehen, bis du bewusst ein Re-Match startest oder zurueckgehst.
          </p>
        ) : null}
      </div>
    </section>
  );
}
