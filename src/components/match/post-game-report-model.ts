import type { DashboardWeekState } from "@/components/dashboard/dashboard-model";
import { buildLineupReadinessState } from "@/components/team/depth-chart-model";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import { buildPostGameContinuationState, type PostGameContinuationState } from "./post-game-continuation-model";
import {
  buildWhyGameOutcomeState,
  type MatchReport,
  type MatchReportDrive,
  type MatchReportLeader,
  type MatchReportTeam,
  type WhyGameInsight,
} from "./match-report-model";
import {
  buildLineupDriveContext,
  buildLineupOutcomeAssessment,
  buildPositionGroupDriveContext,
  findLatestLineupDecision,
  parseLineupDecisionEvent,
  type LineupOutcomeAssessment,
} from "./lineup-outcome-model";

type ReportTone = "active" | "danger" | "neutral" | "success" | "warning";

export type PostGameReportMatch = MatchReport & {
  id: string;
  kind: string;
  scheduledAt: Date;
  simulationCompletedAt?: Date | null;
  simulationStartedAt?: Date | null;
  week: number;
};

export type ReportTeamSummary = {
  abbreviation: string;
  isManagerTeam: boolean;
  name: string;
  score: number | string;
  side: "Home" | "Away";
  winner: boolean;
};

export type ReportContextMetric = {
  label: string;
  sourceLabel: "Data" | "Fallback";
  tone: ReportTone;
  value: string;
};

export type ReportScoreHeaderState = {
  awayTeam: ReportTeamSummary;
  contextMetrics: ReportContextMetric[];
  homeTeam: ReportTeamSummary;
  resultLabel: string;
  scoreLine: string;
  statusLabel: string;
  summary: string;
};

export type PostGameMotivationGoal = {
  actionHref: string;
  actionLabel: string;
  description: string;
  label: string;
  title: string;
  tone: ReportTone;
};

export type ReportStatComparison = {
  away: number | string;
  awayShare: number;
  description: string;
  edge: "away" | "even" | "home";
  home: number | string;
  homeShare: number;
  label: string;
  lowerIsBetter?: boolean;
  sourceLabel: "Data" | "Fallback";
};

export type ReportKeyMoment = {
  description: string;
  highlight: "big-play" | "default" | "field-goal" | "red-zone" | "touchdown" | "turnover";
  lineupContext?: string | null;
  meta: string;
  phaseLabel: string;
  scoreChangeLabel: string;
  sequence: number;
  title: string;
  tone: ReportTone;
};

export type PlayerOfGameState = {
  context: string;
  isFallback: boolean;
  name: string;
  position: string;
  statLine: string;
  teamAbbreviation: string;
};

export type TeamImpactItem = {
  description: string;
  label: string;
  sourceLabel: "Data" | "Derived" | "Fallback";
  tone: ReportTone;
  value: string;
};

export type PostGameConsequenceItem = {
  description: string;
  href?: string;
  label: string;
  tone: ReportTone;
  title: string;
};

export type PostGameConsequencesState = {
  attention: PostGameConsequenceItem;
  decider: PostGameConsequenceItem;
  nextWeek: PostGameConsequenceItem;
};

export type PostGameCausalityItem = {
  description: string;
  label: string;
  sourceLabel: "Data" | "Derived" | "Fallback";
  tone: ReportTone;
  title: string;
  value: string;
};

export type PostGameCausalityState = {
  gameSummary: PostGameCausalityItem;
  keyFactor: PostGameCausalityItem;
  nextWeek: PostGameCausalityItem;
  turningPoint: PostGameCausalityItem;
};

export type PostGameReportState = {
  causality: PostGameCausalityState;
  consequences: PostGameConsequencesState;
  hasFinalScore: boolean;
  keyMoments: ReportKeyMoment[];
  keyMomentsEmptyMessage: string;
  motivationGoal: PostGameMotivationGoal;
  nextStep: PostGameContinuationState;
  playerOfGame: PlayerOfGameState;
  scoreHeader: ReportScoreHeaderState;
  stats: ReportStatComparison[];
  teamImpact: TeamImpactItem[];
};

function displayState(value: string) {
  if (value === "COMPLETED") {
    return "Beendet";
  }

  if (value === "IN_PROGRESS") {
    return "Live";
  }

  if (value === "SCHEDULED") {
    return "Geplant";
  }

  return value.replaceAll("_", " ");
}

function scoreValue(team: MatchReportTeam) {
  return team.score ?? "-";
}

function hasFinalScore(match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">) {
  return match.status === "COMPLETED" &&
    match.homeTeam.score != null &&
    match.awayTeam.score != null;
}

function isWinner(team: MatchReportTeam, opponent: MatchReportTeam) {
  if (team.score == null || opponent.score == null || team.score === opponent.score) {
    return false;
  }

  return team.score > opponent.score;
}

function toTeamSummary(
  team: MatchReportTeam,
  opponent: MatchReportTeam,
  side: ReportTeamSummary["side"],
): ReportTeamSummary {
  return {
    abbreviation: team.abbreviation,
    isManagerTeam: team.managerControlled === true,
    name: team.name,
    score: scoreValue(team),
    side,
    winner: isWinner(team, opponent),
  };
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" ? String(value) : "-";
}

function formatRedZone(team: MatchReportTeam) {
  const stats = team.stats;

  if (!stats) {
    return "-";
  }

  return `${stats.redZoneTouchdowns}/${stats.redZoneTrips}`;
}

function buildResultLabel(match: PostGameReportMatch) {
  if (!hasFinalScore(match)) {
    return match.status === "IN_PROGRESS" ? "Report Preview" : "Noch nicht gespielt";
  }

  if (match.homeTeam.score === match.awayTeam.score) {
    return "Unentschieden";
  }

  return `${isWinner(match.homeTeam, match.awayTeam) ? match.homeTeam.name : match.awayTeam.name} gewinnt`;
}

function buildContextMetrics(match: PostGameReportMatch): ReportContextMetric[] {
  const homeStats = match.homeTeam.stats;
  const awayStats = match.awayTeam.stats;

  return [
    {
      label: "Total Yards",
      sourceLabel: homeStats && awayStats ? "Data" : "Fallback",
      tone: "neutral",
      value: homeStats && awayStats ? `${homeStats.totalYards}:${awayStats.totalYards}` : "-",
    },
    {
      label: "Turnovers",
      sourceLabel: homeStats && awayStats ? "Data" : "Fallback",
      tone: homeStats && awayStats && homeStats.turnovers !== awayStats.turnovers ? "warning" : "neutral",
      value: homeStats && awayStats ? `${homeStats.turnovers}:${awayStats.turnovers}` : "-",
    },
    {
      label: "Red Zone TD",
      sourceLabel: homeStats && awayStats ? "Data" : "Fallback",
      tone: "active",
      value: homeStats && awayStats ? `${formatRedZone(match.homeTeam)}:${formatRedZone(match.awayTeam)}` : "-",
    },
  ];
}

function buildScoreHeader(match: PostGameReportMatch): ReportScoreHeaderState {
  const finalWithoutStats = hasFinalScore(match) && (!match.homeTeam.stats || !match.awayTeam.stats);

  return {
    awayTeam: toTeamSummary(match.awayTeam, match.homeTeam, "Away"),
    contextMetrics: buildContextMetrics(match),
    homeTeam: toTeamSummary(match.homeTeam, match.awayTeam, "Home"),
    resultLabel: buildResultLabel(match),
    scoreLine: `${match.homeTeam.abbreviation} ${scoreValue(match.homeTeam)} : ${scoreValue(match.awayTeam)} ${match.awayTeam.abbreviation}`,
    statusLabel: displayState(match.status),
    summary: finalWithoutStats
      ? "Finaler Score ist gespeichert. Team-Stats, Top-Spieler und Drive-Daten sind in dieser Fixture nicht vorhanden."
      : match.summary,
  };
}

function numericEdge(
  home: number | null | undefined,
  away: number | null | undefined,
  lowerIsBetter = false,
): Pick<ReportStatComparison, "awayShare" | "edge" | "homeShare"> {
  if (typeof home !== "number" || typeof away !== "number") {
    return { awayShare: 0, edge: "even", homeShare: 0 };
  }

  const total = Math.max(home + away, 1);
  const homeShare = Math.round((home / total) * 100);
  const awayShare = 100 - homeShare;

  if (home === away) {
    return { awayShare, edge: "even", homeShare };
  }

  const homeBetter = lowerIsBetter ? home < away : home > away;

  return { awayShare, edge: homeBetter ? "home" : "away", homeShare };
}

function comparisonRow({
  away,
  description,
  home,
  label,
  lowerIsBetter,
}: {
  away: number | null | undefined;
  description: string;
  home: number | null | undefined;
  label: string;
  lowerIsBetter?: boolean;
}): ReportStatComparison {
  const edge = numericEdge(home, away, lowerIsBetter);
  const sourceLabel = typeof home === "number" && typeof away === "number" ? "Data" : "Fallback";

  return {
    away: formatNumber(away),
    description,
    home: formatNumber(home),
    label,
    lowerIsBetter,
    sourceLabel,
    ...edge,
  };
}

function buildStats(match: PostGameReportMatch): ReportStatComparison[] {
  const home = match.homeTeam.stats;
  const away = match.awayTeam.stats;

  return [
    comparisonRow({
      away: away?.totalYards,
      description: "Gesamter Raumgewinn als kompakter Produktionsvergleich.",
      home: home?.totalYards,
      label: "Total Yards",
    }),
    comparisonRow({
      away: away?.passingYards,
      description: "Passing-Produktion und QB-/Receiver-Wirkung.",
      home: home?.passingYards,
      label: "Passing",
    }),
    comparisonRow({
      away: away?.rushingYards,
      description: "Run Game und Kontrolle an der Line of Scrimmage.",
      home: home?.rushingYards,
      label: "Rushing",
    }),
    comparisonRow({
      away: away?.turnovers,
      description: "Ballverluste. Weniger ist besser.",
      home: home?.turnovers,
      label: "Turnovers",
      lowerIsBetter: true,
    }),
    comparisonRow({
      away: away?.explosivePlays,
      description: "Explosive Plays als Game-Feel-Signal fuer Momentum.",
      home: home?.explosivePlays,
      label: "Big Plays",
    }),
    comparisonRow({
      away: away?.redZoneTouchdowns,
      description: "Touchdowns in der Red Zone.",
      home: home?.redZoneTouchdowns,
      label: "Red Zone TD",
    }),
  ];
}

function classifyMoment(drive: MatchReportDrive): Pick<ReportKeyMoment, "highlight" | "tone"> {
  const resultType = drive.resultType.toUpperCase();

  if (drive.turnover || resultType.includes("TURNOVER") || resultType.includes("INTERCEPTION") || resultType.includes("FUMBLE")) {
    return { highlight: "turnover", tone: "danger" };
  }

  if (resultType.includes("TOUCHDOWN") || drive.pointsScored >= 6) {
    return { highlight: "touchdown", tone: "success" };
  }

  if (resultType.includes("FIELD_GOAL") || drive.pointsScored === 3) {
    return { highlight: "field-goal", tone: "active" };
  }

  if (drive.totalYards >= 55) {
    return { highlight: "big-play", tone: "success" };
  }

  if (drive.redZoneTrip) {
    return { highlight: "red-zone", tone: "warning" };
  }

  return { highlight: "default", tone: "neutral" };
}

function buildKeyMoment(
  drive: MatchReportDrive,
  lineupDecision: ReturnType<typeof parseLineupDecisionEvent>,
  managerTeamAbbreviation: string | null,
): ReportKeyMoment {
  return {
    ...classifyMoment(drive),
    description: drive.summary,
    lineupContext:
      buildLineupDriveContext({
        decision: lineupDecision,
        drive,
        managerTeamAbbreviation,
      }) ?? buildPositionGroupDriveContext({ drive, managerTeamAbbreviation }),
    meta: `${drive.offenseTeamAbbreviation} Offense · ${drive.plays} Plays · ${drive.totalYards} Yards`,
    phaseLabel: drive.phaseLabel,
    scoreChangeLabel: `${drive.startedScore} -> ${drive.endedScore}`,
    sequence: drive.sequence,
    title: `Drive ${drive.sequence} · ${displayState(drive.resultType)}`,
  };
}

function managerTeamAbbreviation(match: Pick<MatchReport, "awayTeam" | "homeTeam">) {
  if (match.homeTeam.managerControlled) {
    return match.homeTeam.abbreviation;
  }

  if (match.awayTeam.managerControlled) {
    return match.awayTeam.abbreviation;
  }

  return null;
}

function managerTeam(match: Pick<MatchReport, "awayTeam" | "homeTeam">) {
  if (match.homeTeam.managerControlled) {
    return match.homeTeam;
  }

  if (match.awayTeam.managerControlled) {
    return match.awayTeam;
  }

  return null;
}

function opponentTeam(match: Pick<MatchReport, "awayTeam" | "homeTeam">, manager: MatchReportTeam) {
  return manager === match.homeTeam ? match.awayTeam : match.homeTeam;
}

function buildPostGameMotivationGoal({
  match,
  saveGameId,
}: {
  match: PostGameReportMatch;
  saveGameId: string;
}): PostGameMotivationGoal {
  const manager = managerTeam(match);
  const opponent = manager ? opponentTeam(match, manager) : null;
  const stats = manager?.stats ?? null;
  const opponentStats = opponent?.stats ?? null;
  const depthChartHref = `/app/savegames/${saveGameId}/team/depth-chart`;
  const rosterHref = `/app/savegames/${saveGameId}/team/roster`;

  if (stats && stats.turnovers >= 2) {
    return {
      actionHref: depthChartHref,
      actionLabel: "Depth Chart pruefen",
      description: `${stats.turnovers} Ballverluste haben Drives gekillt. Pruefe QB, Balltraeger und sichere Rollen fuer naechste Woche.`,
      label: "Naechstes Ziel",
      title: "Turnovers reduzieren",
      tone: "danger",
    };
  }

  if (stats && opponentStats && stats.passingYards + 40 < opponentStats.passingYards) {
    return {
      actionHref: depthChartHref,
      actionLabel: "QB und Receiver pruefen",
      description: `${manager?.abbreviation ?? "Dein Team"} lag im Passspiel ${opponentStats.passingYards}:${stats.passingYards} Yards zurueck. Stabilisiere QB, WR und Protection.`,
      label: "Naechstes Ziel",
      title: "Passing stabilisieren",
      tone: "warning",
    };
  }

  if (stats && opponentStats && opponentStats.totalYards >= stats.totalYards + 40) {
    return {
      actionHref: rosterHref,
      actionLabel: "Roster ansehen",
      description: `Der Gegner produzierte ${opponentStats.totalYards} Yards. Suche nach Hilfe in Front Seven, Coverage oder Roster-Tiefe.`,
      label: "Naechstes Ziel",
      title: "Defense verbessern",
      tone: "warning",
    };
  }

  if (stats && stats.redZoneTrips > 0 && stats.redZoneTouchdowns < stats.redZoneTrips) {
    return {
      actionHref: depthChartHref,
      actionLabel: "Red-Zone-Rollen pruefen",
      description: `${stats.redZoneTouchdowns}/${stats.redZoneTrips} Red-Zone-Trips endeten mit Touchdown. Klaere Power-Runner, Receiver und sichere Optionen.`,
      label: "Naechstes Ziel",
      title: "Red Zone schaerfen",
      tone: "warning",
    };
  }

  return {
    actionHref: depthChartHref,
    actionLabel: "Aufstellung bestaetigen",
    description: "Kein einzelner Bruch dominiert den Report. Halte die besten Rollen stabil und verbessere eine kleine Schwachstelle.",
    label: "Naechstes Ziel",
    title: "Staerke bestaetigen",
    tone: "success",
  };
}

function buildKeyMoments(
  drives: MatchReportDrive[],
  lineupDecision: ReturnType<typeof parseLineupDecisionEvent>,
  managerAbbreviation: string | null,
) {
  const important = drives
    .map((drive) => buildKeyMoment(drive, lineupDecision, managerAbbreviation))
    .filter((moment) => moment.highlight !== "default");

  return important.length > 0
    ? important.slice(0, 6)
    : drives.map((drive) => buildKeyMoment(drive, lineupDecision, managerAbbreviation)).slice(0, 4);
}

function formatScoreForTeam(team: MatchReportTeam, opponent: MatchReportTeam) {
  if (team.score == null || opponent.score == null) {
    return "Score offen";
  }

  return `${team.score}:${opponent.score}`;
}

function causalityToneForManager(manager: MatchReportTeam | null, winner: MatchReportTeam | null) {
  if (!manager || !winner) {
    return "neutral" as const;
  }

  return manager === winner ? "success" as const : "warning" as const;
}

function winnerFromMatch(match: PostGameReportMatch) {
  if (!hasFinalScore(match) || match.homeTeam.score === match.awayTeam.score) {
    return null;
  }

  return match.homeTeam.score! > match.awayTeam.score! ? match.homeTeam : match.awayTeam;
}

function loserFromMatch(match: PostGameReportMatch) {
  const winner = winnerFromMatch(match);

  if (!winner) {
    return null;
  }

  return winner === match.homeTeam ? match.awayTeam : match.homeTeam;
}

function buildScoreFlowDescription(match: PostGameReportMatch) {
  if (!hasFinalScore(match)) {
    return "Der Report wartet auf ein finales, systemberechnetes Ergebnis.";
  }

  if (match.drives.length === 0) {
    return "Finaler Score ist gespeichert; Drive-Verlauf fehlt, deshalb bleibt die Verlaufserklaerung bewusst knapp.";
  }

  const scoringDrives = match.drives.filter((drive) => drive.pointsScored > 0);
  const firstScore = scoringDrives[0];
  const lastScore = scoringDrives.at(-1);

  if (!firstScore || !lastScore) {
    return "Der Score blieb ueberwiegend durch Stops und Feldposition gepraegt; keine Scoring Drives sind im Log markiert.";
  }

  return `${firstScore.offenseTeamAbbreviation} erzielte den ersten Score in ${firstScore.phaseLabel}; der letzte Scoring Drive kam von ${lastScore.offenseTeamAbbreviation} in ${lastScore.phaseLabel}.`;
}

function buildGameSummaryCausality(match: PostGameReportMatch): PostGameCausalityItem {
  const manager = managerTeam(match);
  const opponent = manager ? opponentTeam(match, manager) : null;
  const winner = winnerFromMatch(match);
  const scoreValue = manager && opponent
    ? formatScoreForTeam(manager, opponent)
    : `${match.homeTeam.abbreviation} ${scoreValueForReport(match.homeTeam)}:${scoreValueForReport(match.awayTeam)} ${match.awayTeam.abbreviation}`;
  const resultText = manager && opponent && hasFinalScore(match)
    ? manager.score! > opponent.score!
      ? `${manager.abbreviation} gewann ${scoreValue}.`
      : manager.score! < opponent.score!
        ? `${manager.abbreviation} verlor ${scoreValue}.`
        : `${manager.abbreviation} spielte ${scoreValue}.`
    : buildResultLabel(match);

  return {
    description: `${resultText} ${buildScoreFlowDescription(match)}`,
    label: "Game Summary",
    sourceLabel: hasFinalScore(match) ? "Data" : "Fallback",
    title: "Score + Verlauf",
    tone: causalityToneForManager(manager, winner),
    value: scoreValue,
  };
}

function scoreValueForReport(team: MatchReportTeam) {
  return team.score == null ? "-" : String(team.score);
}

function buildPointsAfterTurnovers(
  drives: MatchReportDrive[],
  winner: MatchReportTeam,
  loser: MatchReportTeam,
) {
  let turnovers = 0;
  let points = 0;
  const phases = new Set<string>();

  for (const drive of drives) {
    if (drive.offenseTeamAbbreviation !== loser.abbreviation || !drive.turnover) {
      continue;
    }

    turnovers += 1;
    phases.add(drive.phaseLabel);

    const nextWinnerScore = drives.find(
      (candidate) =>
        candidate.sequence > drive.sequence &&
        candidate.offenseTeamAbbreviation === winner.abbreviation &&
        candidate.pointsScored > 0,
    );

    if (nextWinnerScore) {
      points += nextWinnerScore.pointsScored;
    }
  }

  return {
    phases: [...phases],
    points,
    turnovers,
  };
}

function buildKeyFactorCausality(
  match: PostGameReportMatch,
  lineupOutcome: LineupOutcomeAssessment | null,
): PostGameCausalityItem {
  const outcome = buildWhyGameOutcomeState(match);
  const factor = outcome.keyFactors[0] ?? null;
  const winner = winnerFromMatch(match);
  const loser = loserFromMatch(match);

  if (!factor || !winner || !loser) {
    return {
      description: "Noch kein belastbarer Hauptfaktor. Der Report zeigt erst nach Score, Stats oder Drives eine Ursache.",
      label: "Key Factor",
      sourceLabel: "Fallback",
      title: "Noch offen",
      tone: "neutral",
      value: "n/a",
    };
  }

  const turnoverImpact = factor.label === "Turnovers"
    ? buildPointsAfterTurnovers(match.drives, winner, loser)
    : null;
  const turnoverSentence =
    turnoverImpact && turnoverImpact.turnovers > 0 && turnoverImpact.points > 0
      ? ` ${turnoverImpact.turnovers} Turnover von ${loser.abbreviation} fuehrten danach zu ${turnoverImpact.points} Punkt(en) fuer ${winner.abbreviation}${turnoverImpact.phases.length > 0 ? ` (${turnoverImpact.phases.join(", ")})` : ""}.`
      : turnoverImpact && turnoverImpact.turnovers > 0
        ? ` Turnover-Faktor: ${loser.abbreviation} verlor ${turnoverImpact.turnovers} Drive(s), auch wenn daraus im gespeicherten Log keine direkten Folgepunkte markiert sind.`
      : "";
  const ratingSentence =
    factor.label === "Ratings & Matchups" && winner.overallRating != null && loser.overallRating != null
      ? ` Rating-Einfluss: ${winner.abbreviation} ${winner.overallRating} vs ${loser.abbreviation} ${loser.overallRating}.`
      : "";
  const lineupSentence = lineupOutcome
    ? ` Lineup-Signal: ${lineupOutcome.description}`
    : "";

  return {
    description: `${factor.explanation}${turnoverSentence}${ratingSentence}${lineupSentence}`,
    label: "Key Factor",
    sourceLabel: factor.label === "Scoreboard" ? "Fallback" : "Data",
    title: factor.label,
    tone: outcome.perspective === "won" ? "success" : outcome.perspective === "lost" ? "warning" : "neutral",
    value: `${factor.winnerValue} vs ${factor.loserValue}`,
  };
}

function turningPointWeight(drive: MatchReportDrive) {
  return (
    drive.pointsScored * 3 +
    (drive.turnover ? 36 : 0) +
    (drive.redZoneTrip ? 3 : 0) +
    Math.min(8, Math.floor(drive.totalYards / 10))
  );
}

function buildTurningPointCausality(match: PostGameReportMatch): PostGameCausalityItem {
  if (match.drives.length === 0) {
    return {
      description: "Keine Drive Events gespeichert. Der Report vermeidet deshalb eine erfundene Schluesselszene.",
      label: "Turning Point",
      sourceLabel: "Fallback",
      title: "Kein Drive Event",
      tone: "neutral",
      value: "n/a",
    };
  }

  const drive = [...match.drives].sort((left, right) => turningPointWeight(right) - turningPointWeight(left))[0];
  const tone = drive.turnover
    ? "danger"
    : drive.pointsScored >= 6
      ? "success"
      : drive.pointsScored > 0
        ? "active"
        : "warning";
  const playerText = drive.primaryPlayerName
    ? ` Beteiligter Spieler: ${drive.primaryPlayerName}.`
    : drive.primaryDefenderName
      ? ` Defensiver Schluesselspieler: ${drive.primaryDefenderName}.`
      : "";

  return {
    description: `${drive.summary} Der Drive bewegte den Score von ${drive.startedScore} auf ${drive.endedScore}.${playerText}`,
    label: "Turning Point",
    sourceLabel: "Data",
    title: `${drive.phaseLabel} · Drive ${drive.sequence}`,
    tone,
    value: displayState(drive.resultType),
  };
}

function buildNextWeekCausality(
  consequences: PostGameConsequencesState,
  lineupOutcome: LineupOutcomeAssessment | null,
): PostGameCausalityItem {
  const lineupText = lineupOutcome
    ? ` Letzte Lineup-Entscheidung: ${lineupOutcome.value}.`
    : "";

  return {
    description: `${consequences.nextWeek.description}${lineupText}`,
    label: "What it means next week",
    sourceLabel: consequences.nextWeek.tone === "neutral" ? "Fallback" : "Derived",
    title: consequences.nextWeek.title,
    tone: consequences.nextWeek.tone,
    value: consequences.attention.title,
  };
}

function buildCausalityState({
  consequences,
  lineupOutcome,
  match,
}: {
  consequences: PostGameConsequencesState;
  lineupOutcome: LineupOutcomeAssessment | null;
  match: PostGameReportMatch;
}): PostGameCausalityState {
  return {
    gameSummary: buildGameSummaryCausality(match),
    keyFactor: buildKeyFactorCausality(match, lineupOutcome),
    nextWeek: buildNextWeekCausality(consequences, lineupOutcome),
    turningPoint: buildTurningPointCausality(match),
  };
}

function leaderStatLine(leader: MatchReportLeader) {
  const values = [
    leader.passingYards > 0 ? `${leader.passingYards} Pass Yards` : null,
    leader.rushingYards > 0 ? `${leader.rushingYards} Rush Yards` : null,
    leader.receivingYards > 0 ? `${leader.receivingYards} Rec Yards` : null,
    leader.tackles > 0 ? `${leader.tackles} Tackles` : null,
    leader.sacks > 0 ? `${leader.sacks} Sacks` : null,
    leader.interceptions > 0 ? `${leader.interceptions} INT` : null,
    leader.fieldGoalsMade > 0 ? `${leader.fieldGoalsMade} FG` : null,
    leader.puntsInside20 > 0 ? `${leader.puntsInside20} Inside 20` : null,
  ].filter(Boolean);

  return values.slice(0, 3).join(" · ") || "Keine Top-Stats";
}

function firstLeader(leaders: MatchReport["leaders"]) {
  const priority = ["passing", "rushing", "receiving", "defense", "specialTeams"];

  for (const key of priority) {
    const leader = leaders[key];

    if (leader) {
      return leader;
    }
  }

  return null;
}

function buildPlayerOfGame(match: PostGameReportMatch): PlayerOfGameState {
  const leader = firstLeader(match.leaders);

  if (!leader) {
    return {
      context: "Noch keine Top-Spieler-Daten in den aktuellen Spielberichtsdaten vorhanden.",
      isFallback: true,
      name: "Noch offen",
      position: "-",
      statLine: "Keine Spielerwerte",
      teamAbbreviation: "-",
    };
  }

  return {
    context: "Aus den vorhandenen Leader-Daten des Spielberichts hervorgehoben.",
    isFallback: false,
    name: leader.fullName,
    position: leader.positionCode,
    statLine: leaderStatLine(leader),
    teamAbbreviation: leader.teamAbbreviation,
  };
}

function insightToImpact(insight: WhyGameInsight): TeamImpactItem {
  return {
    description: insight.explanation,
    label: insight.label,
    sourceLabel: "Data",
    tone:
      insight.tone === "positive"
        ? "success"
        : insight.tone === "warning"
          ? "warning"
          : "neutral",
    value: "Impact",
  };
}

function groupStarterAverage(
  teamDetail: TeamDetail | null | undefined,
  positionCodes: string[],
) {
  const positionSet = new Set(positionCodes);
  const starters = (teamDetail?.players ?? []).filter(
    (player) =>
      positionSet.has(player.positionCode) &&
      player.depthChartSlot === 1 &&
      player.status === "ACTIVE",
  );

  if (starters.length === 0) {
    return null;
  }

  return Math.round(
    starters.reduce((sum, player) => sum + player.positionOverall, 0) / starters.length,
  );
}

function buildRunGameImpact(
  match: PostGameReportMatch,
  teamDetail: TeamDetail | null | undefined,
): TeamImpactItem | null {
  const manager = managerTeam(match);
  if (!manager?.stats) {
    return null;
  }

  const opponent = opponentTeam(match, manager);
  const starterAverage = groupStarterAverage(teamDetail, ["RB", "FB"]);
  const rushEdge = manager.stats.rushingYards - (opponent.stats?.rushingYards ?? 0);
  const strong = manager.stats.rushingYards >= 90 || rushEdge >= 20;
  const weak = manager.stats.rushingYards < 55 && rushEdge < 0;

  return {
    description: `RB/Backfield-Lineup im Spielkontext: ${manager.abbreviation} kam auf ${manager.stats.rushingYards} Rushing Yards${starterAverage ? `, Starter-Schnitt ${starterAverage} OVR` : ""}. ${strong ? "Das Run Game gab der Offense stabile Drives." : weak ? "Das Run Game brachte zu wenig Entlastung und machte Drives eindimensionaler." : "Das Run Game war solide, aber nicht der klare Hebel."}`,
    label: "Run Game",
    sourceLabel: starterAverage ? "Derived" : "Data",
    tone: strong ? "success" : weak ? "warning" : "neutral",
    value: strong ? "Run Game stark" : weak ? "Run Game schwach" : "Run Game stabil",
  };
}

function buildWrMatchupImpact(
  match: PostGameReportMatch,
  teamDetail: TeamDetail | null | undefined,
): TeamImpactItem | null {
  const manager = managerTeam(match);
  if (!manager?.stats) {
    return null;
  }

  const opponent = opponentTeam(match, manager);
  const starterAverage = groupStarterAverage(teamDetail, ["WR", "TE"]);
  const explosiveEdge = manager.stats.explosivePlays - (opponent.stats?.explosivePlays ?? 0);
  const passingEdge = manager.stats.passingYards - (opponent.stats?.passingYards ?? 0);
  const advantage = manager.stats.passingYards >= 150 || explosiveEdge > 0 || passingEdge >= 25;
  const problem = manager.stats.passingYards < 95 && passingEdge < 0;

  return {
    description: `WR/TE-Lineup im Passing-Kontext: ${manager.abbreviation} erzielte ${manager.stats.passingYards} Passing Yards und ${manager.stats.explosivePlays} Big Plays${starterAverage ? `, Starter-Schnitt ${starterAverage} OVR` : ""}. ${advantage ? "Die Receiver-Matchups erzeugten genug Raum und vertikale Gefahr." : problem ? "Die Receiver-Matchups gewannen zu wenige direkte Duelle." : "Die Matchups waren ausgeglichen und eher situativ wertvoll."}`,
    label: "WR Matchup",
    sourceLabel: starterAverage ? "Derived" : "Data",
    tone: advantage ? "success" : problem ? "warning" : "neutral",
    value: advantage ? "WR Matchup Vorteil" : problem ? "WR Matchup schwach" : "WR Matchup neutral",
  };
}

function pressureStopsFromDrives(drives: MatchReportDrive[], defenseAbbreviation: string) {
  return drives.filter(
    (drive) =>
      drive.defenseTeamAbbreviation === defenseAbbreviation &&
      (drive.turnover ||
        drive.resultType === "PUNT" ||
        drive.resultType === "TURNOVER_ON_DOWNS" ||
        drive.resultType === "SAFETY"),
  ).length;
}

function turnoversFromDrives(drives: MatchReportDrive[], offenseAbbreviation: string) {
  return drives.filter(
    (drive) => drive.offenseTeamAbbreviation === offenseAbbreviation && drive.turnover,
  ).length;
}

function buildDefensePressureImpact(
  match: PostGameReportMatch,
  teamDetail: TeamDetail | null | undefined,
): TeamImpactItem | null {
  const manager = managerTeam(match);
  if (!manager) {
    return null;
  }

  const opponent = opponentTeam(match, manager);
  const starterAverage = groupStarterAverage(teamDetail, ["LE", "RE", "DE", "DT", "LOLB", "MLB", "ROLB", "LB"]);
  const stops = pressureStopsFromDrives(match.drives, manager.abbreviation);
  const opponentTurnovers = turnoversFromDrives(match.drives, opponent.abbreviation);
  const strong = stops >= 5 || opponentTurnovers >= 2;
  const weak = stops <= 2 && opponent.stats != null && opponent.stats.totalYards >= 260;

  return {
    description: `Front-Seven/Defense-Lineup im Pressure-Kontext: ${manager.abbreviation} erzeugte ${stops} Drive Stops und ${opponentTurnovers} gegnerische Turnover${starterAverage ? `, Starter-Schnitt ${starterAverage} OVR` : ""}. ${strong ? "Defense Pressure nahm dem Gegner Rhythmus." : weak ? "Defense Pressure kam zu selten durch; der Gegner blieb zu lange im Rhythmus." : "Die Defense setzte punktuell Druck, ohne das Spiel allein zu kippen."}`,
    label: "Defense Pressure",
    sourceLabel: starterAverage ? "Derived" : "Data",
    tone: strong ? "success" : weak ? "warning" : "neutral",
    value: strong ? "Defense Pressure stark" : weak ? "Defense Pressure schwach" : "Defense Pressure stabil",
  };
}

function buildMultiPositionImpact(
  match: PostGameReportMatch,
  teamDetail: TeamDetail | null | undefined,
): TeamImpactItem[] {
  if (match.status !== "COMPLETED") {
    return [];
  }

  return [
    buildRunGameImpact(match, teamDetail),
    buildWrMatchupImpact(match, teamDetail),
    buildDefensePressureImpact(match, teamDetail),
  ].filter((item): item is TeamImpactItem => item !== null);
}

function buildTeamImpact(match: PostGameReportMatch): TeamImpactItem[] {
  const outcome = buildWhyGameOutcomeState(match);

  if (outcome.insights.length > 0) {
    return outcome.insights.slice(0, 3).map(insightToImpact);
  }

  return [
    {
      description: "Es gibt noch zu wenige klare Spielszenen. Der Report bleibt bewusst vorsichtig.",
      label: "Spielwirkung",
      sourceLabel: "Fallback",
      tone: "neutral",
      value: "Noch offen",
    },
  ];
}

function weakPositionGroupName(positionCode: string) {
  if (["FB", "LT", "LG", "C", "RG", "RT"].includes(positionCode)) {
    return "Offensive Line/Backfield";
  }

  if (["LE", "RE", "DT"].includes(positionCode)) {
    return "Defensive Line";
  }

  if (["LOLB", "MLB", "ROLB"].includes(positionCode)) {
    return "Linebacker";
  }

  if (["CB", "FS", "SS"].includes(positionCode)) {
    return "Defensive Backs";
  }

  if (["K", "P", "LS"].includes(positionCode)) {
    return "Special Teams";
  }

  return "Wacklige Positionsgruppe";
}

function buildWeakPositionGroupImpact(teamDetail: TeamDetail | null | undefined): TeamImpactItem | null {
  if (!teamDetail) {
    return null;
  }

  const readiness = buildLineupReadinessState(teamDetail.players, teamDetail.managerControlled);
  if (readiness.autoFillPlayers.length === 0) {
    return null;
  }

  const groupNames = [
    ...new Set(readiness.autoFillPlayers.map((player) => weakPositionGroupName(player.positionCode))),
  ];
  const positions = readiness.autoFillPlayers.map((player) => player.positionCode).join(", ");

  return {
    description: `${groupNames.slice(0, 3).join(", ")} war duenn besetzt: ${positions}. Dort mussten Ersatzspieler ran, und das hat dein Team spuerbar gebremst.`,
    label: "Ersatzspieler im Einsatz",
    sourceLabel: "Data",
    tone: "warning",
    value: `${readiness.autoFillPlayers.length} Ersatzspieler`,
  };
}

function lineupOutcomeToImpact(outcome: LineupOutcomeAssessment): TeamImpactItem {
  return {
    description: outcome.description,
    label: "Aufstellungseffekt",
    sourceLabel: outcome.sourceLabel,
    tone: outcome.tone,
    value: outcome.value,
  };
}

function resultConsequence(
  match: PostGameReportMatch,
  manager: MatchReportTeam | null,
): PostGameConsequenceItem {
  if (!manager) {
    return {
      description: "Kein Managerteam im Match markiert. Der Report bleibt bei Score und Teamvergleich.",
      label: "Was hat das Spiel entschieden?",
      title: "Teamkontext fehlt",
      tone: "neutral",
    };
  }

  const opponent = opponentTeam(match, manager);

  if (manager.score == null || opponent.score == null) {
    return {
      description: "Der finale Score ist noch nicht gespeichert. Sobald das Spiel abgeschlossen ist, zeigt dieser Bereich die wichtigste Ursache.",
      label: "Was hat das Spiel entschieden?",
      title: "Ergebnis noch offen",
      tone: "neutral",
    };
  }

  const won = manager.score > opponent.score;
  const tied = manager.score === opponent.score;
  const stats = manager.stats;
  const opponentStats = opponent.stats;

  if (stats && opponentStats) {
    const turnoverEdge = opponentStats.turnovers - stats.turnovers;
    const redZoneEdge = stats.redZoneTouchdowns - opponentStats.redZoneTouchdowns;
    const yardEdge = stats.totalYards - opponentStats.totalYards;

    if (turnoverEdge !== 0) {
      return {
        description:
          turnoverEdge > 0
            ? `${manager.abbreviation} gewann die Turnover-Bilanz ${stats.turnovers}:${opponentStats.turnovers}. Das war der sauberste Vorteil.`
            : `${manager.abbreviation} verlor die Turnover-Bilanz ${stats.turnovers}:${opponentStats.turnovers}. Ball Security war der groesste Bruch.`,
        label: "Was hat das Spiel entschieden?",
        title: turnoverEdge > 0 ? "Ballverluste kontrolliert" : "Ballverluste kosteten Kontrolle",
        tone: turnoverEdge > 0 ? "success" : "danger",
      };
    }

    if (redZoneEdge !== 0) {
      return {
        description:
          redZoneEdge > 0
            ? `${manager.abbreviation} war in der Red Zone effizienter (${stats.redZoneTouchdowns}:${opponentStats.redZoneTouchdowns} TDs).`
            : `${manager.abbreviation} liess in der Red Zone zu viel liegen (${stats.redZoneTouchdowns}:${opponentStats.redZoneTouchdowns} TDs).`,
        label: "Was hat das Spiel entschieden?",
        title: redZoneEdge > 0 ? "Red-Zone-Effizienz" : "Red-Zone-Problem",
        tone: redZoneEdge > 0 ? "success" : "warning",
      };
    }

    if (Math.abs(yardEdge) >= 40) {
      return {
        description:
          yardEdge > 0
            ? `${manager.abbreviation} produzierte ${yardEdge} Yards mehr. Das spricht fuer funktionierende Drives.`
            : `${manager.abbreviation} lag ${Math.abs(yardEdge)} Yards zurueck. Die Produktion war nicht stabil genug.`,
        label: "Was hat das Spiel entschieden?",
        title: yardEdge > 0 ? "Produktion setzte sich durch" : "Produktion fehlte",
        tone: yardEdge > 0 ? "success" : "warning",
      };
    }
  }

  return {
    description: tied
      ? "Das Ergebnis war ausgeglichen. Ohne tiefere Teamstats bleibt der Report bewusst bei naechsten Kader- und Wochenentscheidungen."
      : won
        ? `${manager.abbreviation} hat gewonnen. Ohne vollstaendige Teamstats ist der Score die verlaesslichste Aussage.`
        : `${manager.abbreviation} hat verloren. Ohne vollstaendige Teamstats ist der Score die verlaesslichste Warnung.`,
    label: "Was hat das Spiel entschieden?",
    title: tied ? "Enges Ergebnis" : won ? "Sieg gesichert" : "Rueckschlag im Ergebnis",
    tone: tied ? "neutral" : won ? "success" : "warning",
  };
}

function fatigueAttention(teamDetail: TeamDetail | null | undefined, saveGameId: string): PostGameConsequenceItem | null {
  const player =
    [...(teamDetail?.players ?? [])]
      .filter((candidate) => candidate.rosterStatus === "STARTER" && candidate.fatigue >= 70)
      .sort((left, right) => right.fatigue - left.fatigue)[0] ?? null;

  if (!player) {
    return null;
  }

  return {
    description: `${player.fullName} ist Starter mit Fatigue ${player.fatigue}. Pruefe, ob die Rolle naechste Woche entlastet werden muss.`,
    href: `/app/savegames/${saveGameId}/players/${player.id}`,
    label: "Welche Entscheidung braucht Aufmerksamkeit?",
    title: `${player.positionCode}: Belastung pruefen`,
    tone: "warning",
  };
}

function contractAttention(teamDetail: TeamDetail | null | undefined, saveGameId: string): PostGameConsequenceItem | null {
  const expiring =
    [...(teamDetail?.contractOutlook.expiringPlayers ?? [])]
      .sort((left, right) => right.capHit - left.capHit)[0] ?? null;

  if (!expiring) {
    return null;
  }

  return {
    description: `${expiring.fullName} laeuft aus und bindet aktuell relevanten Cap. Klaere nach dem Spiel, ob Rolle und Kosten noch passen.`,
    href: `/app/savegames/${saveGameId}/team/contracts`,
    label: "Welche Entscheidung braucht Aufmerksamkeit?",
    title: `${expiring.positionCode}: Vertrag laeuft aus`,
    tone: "warning",
  };
}

function developmentAttention(teamDetail: TeamDetail | null | undefined, saveGameId: string): PostGameConsequenceItem | null {
  const player =
    [...(teamDetail?.players ?? [])]
      .filter((candidate) => !candidate.developmentFocus && candidate.potentialRating - candidate.positionOverall >= 6)
      .sort(
        (left, right) =>
          right.potentialRating - right.positionOverall -
          (left.potentialRating - left.positionOverall),
      )[0] ?? null;

  if (!player) {
    return null;
  }

  return {
    description: `${player.fullName} hat +${player.potentialRating - player.positionOverall} Upside ohne Development Focus. Das ist ein sinnvoller Wochenhebel.`,
    href: `/app/savegames/${saveGameId}/development`,
    label: "Welche Entscheidung braucht Aufmerksamkeit?",
    title: `${player.positionCode}: Entwicklung aktivieren`,
    tone: "active",
  };
}

function needAttention(teamDetail: TeamDetail | null | undefined, saveGameId: string): PostGameConsequenceItem | null {
  const need =
    [...(teamDetail?.teamNeeds ?? [])].sort((left, right) => right.needScore - left.needScore)[0] ?? null;

  if (!need || need.needScore < 7) {
    return null;
  }

  return {
    description: `${need.positionName} bleibt ein klarer Need (${need.needScore}/10). Nutze Roster, Depth Chart oder Trade Board, bevor die naechste Woche startet.`,
    href: `/app/savegames/${saveGameId}/team/roster`,
    label: "Welche Entscheidung braucht Aufmerksamkeit?",
    title: `${need.positionCode}: Team Need klaeren`,
    tone: "warning",
  };
}

function attentionConsequence({
  lineupOutcome,
  saveGameId,
  teamDetail,
}: {
  lineupOutcome: LineupOutcomeAssessment | null;
  saveGameId: string;
  teamDetail: TeamDetail | null | undefined;
}): PostGameConsequenceItem {
  if (lineupOutcome?.value === "Risiko sichtbar") {
    return {
      description: `${lineupOutcome.decision.positionCode}: ${lineupOutcome.decision.evaluation}. Pruefe den Depth Chart, bevor du die naechste Woche startest.`,
      href: `/app/savegames/${saveGameId}/team/depth-chart`,
      label: "Welche Entscheidung braucht Aufmerksamkeit?",
      title: "Lineup-Risiko nacharbeiten",
      tone: "warning",
    };
  }

  return (
    fatigueAttention(teamDetail, saveGameId) ??
    contractAttention(teamDetail, saveGameId) ??
    developmentAttention(teamDetail, saveGameId) ??
    needAttention(teamDetail, saveGameId) ?? {
      description: "Keine harte Warnung aus den vorhandenen Kaderdaten. Nutze den Wochenablauf, um den naechsten Gegner vorzubereiten.",
      href: `/app/savegames/${saveGameId}`,
      label: "Welche Entscheidung braucht Aufmerksamkeit?",
      title: "Keine akute Kaderwarnung",
      tone: "success",
    }
  );
}

function nextWeekConsequence({
  attention,
  decider,
  lineupOutcome,
  saveGameId,
}: {
  attention: PostGameConsequenceItem;
  decider: PostGameConsequenceItem;
  lineupOutcome: LineupOutcomeAssessment | null;
  saveGameId: string;
}): PostGameConsequenceItem {
  if (lineupOutcome?.value === "Ausgezahlt") {
    return {
      description: "Die letzte Lineup-Entscheidung hatte ein positives Signal. Halte die Rolle stabil und beobachte, ob sie naechste Woche wieder traegt.",
      href: `/app/savegames/${saveGameId}/team/depth-chart`,
      label: "Was bedeutet das fuer naechste Woche?",
      title: "Lineup erst einmal bestaetigen",
      tone: "success",
    };
  }

  if (attention.tone === "warning" || attention.tone === "danger") {
    return {
      description: `Vor dem Advance sollte diese Entscheidung geklaert werden: ${attention.title}.`,
      href: attention.href,
      label: "Was bedeutet das fuer naechste Woche?",
      title: "Nicht blind zur naechsten Woche",
      tone: "warning",
    };
  }

  return {
    description: `${decider.title} ist der wichtigste Takeaway. Starte die naechste Woche mit diesem Fokus im Game Preview.`,
    href: `/app/savegames/${saveGameId}`,
    label: "Was bedeutet das fuer naechste Woche?",
    title: "Fokus in die naechste Woche mitnehmen",
    tone: decider.tone === "danger" ? "warning" : decider.tone,
  };
}

function buildConsequences({
  lineupOutcome,
  match,
  saveGameId,
  teamDetail,
}: {
  lineupOutcome: LineupOutcomeAssessment | null;
  match: PostGameReportMatch;
  saveGameId: string;
  teamDetail: TeamDetail | null | undefined;
}): PostGameConsequencesState {
  const decider = resultConsequence(match, managerTeam(match));
  const attention = attentionConsequence({ lineupOutcome, saveGameId, teamDetail });

  return {
    attention,
    decider,
    nextWeek: nextWeekConsequence({ attention, decider, lineupOutcome, saveGameId }),
  };
}

export function buildPostGameReportState({
  match,
  saveGameId,
  teamDetail,
  weekState,
}: {
  match: PostGameReportMatch;
  saveGameId: string;
  teamDetail?: TeamDetail | null;
  weekState: DashboardWeekState;
}): PostGameReportState {
  const lineupDecisionEvent = findLatestLineupDecision(teamDetail, {
    before: match.simulationCompletedAt ?? match.scheduledAt,
  });
  const lineupDecision = lineupDecisionEvent ? parseLineupDecisionEvent(lineupDecisionEvent) : null;
  const lineupOutcome = buildLineupOutcomeAssessment({ match, teamDetail });
  const teamImpact = buildTeamImpact(match);
  const multiPositionImpact = buildMultiPositionImpact(match, teamDetail);
  const consequences = buildConsequences({ lineupOutcome, match, saveGameId, teamDetail });
  const weakPositionImpact = buildWeakPositionGroupImpact(teamDetail);

  teamImpact.unshift(...multiPositionImpact);
  if (weakPositionImpact) {
    teamImpact.unshift(weakPositionImpact);
  }
  if (lineupOutcome) {
    teamImpact.unshift(lineupOutcomeToImpact(lineupOutcome));
  }

  return {
    causality: buildCausalityState({ consequences, lineupOutcome, match }),
    consequences,
    hasFinalScore: hasFinalScore(match),
    keyMoments: buildKeyMoments(match.drives, lineupDecision, managerTeamAbbreviation(match)),
    keyMomentsEmptyMessage:
      "Keine wichtigen Drives gespeichert. Sobald Drive-Daten verfuegbar sind, erscheinen Touchdowns, Turnovers und Big Plays hier.",
    motivationGoal: buildPostGameMotivationGoal({ match, saveGameId }),
    nextStep: buildPostGameContinuationState({ match, saveGameId, weekState }),
    playerOfGame: buildPlayerOfGame(match),
    scoreHeader: buildScoreHeader(match),
    stats: buildStats(match),
    teamImpact: teamImpact.slice(0, 6),
  };
}
