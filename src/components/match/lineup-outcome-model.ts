import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import type { MatchReport, MatchReportDrive, MatchReportTeam } from "./match-report-model";

type DecisionEvent = TeamDetail["recentDecisionEvents"][number];
type OutcomeTone = "danger" | "neutral" | "success" | "warning";
type DecisionTone = "negative" | "neutral" | "positive";

const PASSING_POSITIONS = new Set(["QB", "WR", "TE"]);
const RUSHING_POSITIONS = new Set(["RB", "FB", "LT", "LG", "C", "RG", "RT"]);
const SPECIAL_TEAMS_POSITIONS = new Set(["K", "P", "LS", "KR", "PR"]);
const KNOWN_POSITIONS = [
  "QB",
  "RB",
  "FB",
  "WR",
  "TE",
  "LE",
  "RE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "DE",
  "DT",
  "LB",
  "LOLB",
  "MLB",
  "ROLB",
  "CB",
  "S",
  "FS",
  "SS",
  "K",
  "P",
  "LS",
  "KR",
  "PR",
];

export type ParsedLineupDecision = {
  decisionTone: DecisionTone;
  description: string;
  evaluation: string;
  phase: "Defense" | "Passing" | "Run/Protection" | "Special Teams";
  playerName: string | null;
  positionCode: string;
};

export type LineupOutcomeAssessment = {
  decision: ParsedLineupDecision;
  description: string;
  event: DecisionEvent;
  sourceLabel: "Derived" | "Fallback";
  tone: OutcomeTone;
  value: "Ausgezahlt" | "Gemischt" | "Noch offen" | "Risiko sichtbar";
};

function phaseForPosition(positionCode: string): ParsedLineupDecision["phase"] {
  if (PASSING_POSITIONS.has(positionCode)) {
    return "Passing";
  }

  if (RUSHING_POSITIONS.has(positionCode)) {
    return "Run/Protection";
  }

  if (SPECIAL_TEAMS_POSITIONS.has(positionCode)) {
    return "Special Teams";
  }

  return "Defense";
}

function parseEvaluation(description: string | null | undefined) {
  return description?.match(/Bewertung:\s*([^.]*)/)?.[1]?.trim() ?? "";
}

function parsePositionCode(description: string | null | undefined) {
  if (!description) {
    return null;
  }

  const colonMatch = description.match(/:\s*([A-Z]{1,3})\s+#/);
  const prefixMatch = description.match(/^([A-Z]{1,3})\s+(?:[|.\-]|Slot|#)/);

  for (const candidate of [colonMatch?.[1], prefixMatch?.[1]]) {
    if (candidate && KNOWN_POSITIONS.includes(candidate)) {
      return candidate;
    }
  }

  return KNOWN_POSITIONS.find((position) => new RegExp(`\\b${position}\\b`).test(description)) ?? null;
}

function parseDecisionTone(description: string, evaluation: string): DecisionTone {
  const text = `${evaluation} ${description}`;
  const deltaMatch = description.match(/\(([+-]?\d+)\)/);
  const delta = deltaMatch ? Number(deltaMatch[1]) : null;

  if (/Risiko|offen|INACTIVE|INJURED_RESERVE|reduziert/.test(text) || (delta != null && delta < 0)) {
    return "negative";
  }

  if (/verbessert|Prioritaet|erhoeht/.test(text) || (delta != null && delta > 0)) {
    return "positive";
  }

  return "neutral";
}

export function parseLineupDecisionEvent(event: DecisionEvent): ParsedLineupDecision | null {
  if (event.type !== "DEPTH_CHART") {
    return null;
  }

  const description = event.description ?? "";
  const positionCode = parsePositionCode(description);

  if (!positionCode) {
    return null;
  }

  const evaluation = parseEvaluation(description) || `${phaseForPosition(positionCode)} bleibt stabil`;

  return {
    decisionTone: parseDecisionTone(description, evaluation),
    description,
    evaluation,
    phase: phaseForPosition(positionCode),
    playerName: event.playerName,
    positionCode,
  };
}

export function findLatestLineupDecision(
  teamDetail: TeamDetail | null | undefined,
  options: { after?: Date | null; before?: Date | null } = {},
) {
  return [...(teamDetail?.recentDecisionEvents ?? [])]
    .filter((event) => event.type === "DEPTH_CHART")
    .filter((event) => !options.after || event.occurredAt > options.after)
    .filter((event) => !options.before || event.occurredAt <= options.before)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] ?? null;
}

export function isNegativeLineupDecision(event: DecisionEvent | null | undefined) {
  const decision = event ? parseLineupDecisionEvent(event) : null;

  return decision?.decisionTone === "negative";
}

function managerTeam(match: MatchReport) {
  if (match.homeTeam.managerControlled) {
    return match.homeTeam;
  }

  if (match.awayTeam.managerControlled) {
    return match.awayTeam;
  }

  return null;
}

function opponentTeam(match: MatchReport, manager: MatchReportTeam) {
  return manager === match.homeTeam ? match.awayTeam : match.homeTeam;
}

function finalResultTone(match: MatchReport, manager: MatchReportTeam): OutcomeTone {
  const opponent = opponentTeam(match, manager);

  if (manager.score == null || opponent.score == null || manager.score === opponent.score) {
    return "neutral";
  }

  return manager.score > opponent.score ? "success" : "warning";
}

function phaseStat(
  phase: ParsedLineupDecision["phase"],
  manager: MatchReportTeam,
  opponent: MatchReportTeam,
) {
  if (!manager.stats || !opponent.stats) {
    return null;
  }

  if (phase === "Passing") {
    return {
      label: "Passing",
      managerValue: manager.stats.passingYards,
      opponentValue: opponent.stats.passingYards,
      unit: "Yards",
    };
  }

  if (phase === "Run/Protection") {
    return {
      label: "Rushing",
      managerValue: manager.stats.rushingYards,
      opponentValue: opponent.stats.rushingYards,
      unit: "Yards",
    };
  }

  if (phase === "Defense") {
    return {
      label: "Allowed Production",
      managerValue: opponent.stats.totalYards,
      opponentValue: manager.stats.totalYards,
      unit: "Yards",
    };
  }

  return null;
}

function assessmentFromStats(
  decision: ParsedLineupDecision,
  manager: MatchReportTeam,
  opponent: MatchReportTeam,
) {
  const stat = phaseStat(decision.phase, manager, opponent);

  if (!stat) {
    return null;
  }

  const favorable =
    decision.phase === "Defense"
      ? stat.managerValue <= stat.opponentValue
      : stat.managerValue >= stat.opponentValue;
  const context =
    decision.phase === "Defense"
      ? `${manager.abbreviation} hielt den Gegner bei ${stat.managerValue} Total Yards.`
      : `${manager.abbreviation} ${stat.label}: ${stat.managerValue} ${stat.unit} gegen ${stat.opponentValue}.`;

  if (decision.decisionTone === "negative") {
    return {
      favorable,
      text: favorable
        ? `Der vorher markierte Lineup-Risikopunkt wurde im Spiel teilweise abgefedert. ${context}`
        : `Der vorher markierte Lineup-Risikopunkt blieb im Spiel sichtbar. ${context}`,
    };
  }

  return {
    favorable,
    text: favorable
      ? `${decision.phase}-Entscheidung korrespondiert mit besserer Produktion. ${context}`
      : `${decision.phase}-Entscheidung brachte keinen klaren Produktionsvorteil. ${context}`,
  };
}

export function buildLineupOutcomeAssessment({
  match,
  teamDetail,
}: {
  match: MatchReport & { scheduledAt?: Date; simulationCompletedAt?: Date | null };
  teamDetail: TeamDetail | null | undefined;
}): LineupOutcomeAssessment | null {
  const event = findLatestLineupDecision(teamDetail, {
    before: match.simulationCompletedAt ?? match.scheduledAt ?? null,
  });
  const decision = event ? parseLineupDecisionEvent(event) : null;
  const manager = managerTeam(match);

  if (!event || !decision || !manager) {
    return null;
  }

  const opponent = opponentTeam(match, manager);
  const statAssessment = assessmentFromStats(decision, manager, opponent);
  const resultTone = finalResultTone(match, manager);
  const favorable = statAssessment?.favorable ?? resultTone === "success";
  const risky = decision.decisionTone === "negative";
  const value =
    risky && !favorable
      ? "Risiko sichtbar"
      : favorable
        ? "Ausgezahlt"
        : resultTone === "neutral"
          ? "Noch offen"
          : "Gemischt";

  return {
    decision,
    description: [
      "Aus Lineup-Historie und Spielberichtsdaten:",
      "Neue Lineup-Entscheidung hatte Einfluss auf das Spiel.",
      decision.playerName ? `${decision.playerName} (${decision.positionCode}) -> ${decision.evaluation}.` : `${decision.positionCode} -> ${decision.evaluation}.`,
      statAssessment?.text ?? `Bewertung basiert auf dem gespeicherten Endergebnis ${manager.abbreviation} ${manager.score ?? "-"}:${opponent.score ?? "-"} ${opponent.abbreviation}.`,
    ].join(" "),
    event,
    sourceLabel: statAssessment ? "Derived" : "Fallback",
    tone: risky && !favorable ? "warning" : favorable ? "success" : "neutral",
    value,
  };
}

function isDriveImportant(drive: MatchReportDrive) {
  const resultType = drive.resultType.toUpperCase();

  return (
    drive.turnover ||
    drive.pointsScored > 0 ||
    drive.redZoneTrip ||
    drive.totalYards >= 55 ||
    resultType.includes("TOUCHDOWN") ||
    resultType.includes("TURNOVER") ||
    resultType.includes("INTERCEPTION") ||
    resultType.includes("FUMBLE") ||
    resultType.includes("SACK")
  );
}

export function buildLineupDriveContext({
  decision,
  drive,
  managerTeamAbbreviation,
}: {
  decision: ParsedLineupDecision | null | undefined;
  drive: MatchReportDrive;
  managerTeamAbbreviation: string | null | undefined;
}) {
  if (!decision || !managerTeamAbbreviation || !isDriveImportant(drive)) {
    return null;
  }

  if (
    decision.playerName &&
    (drive.primaryPlayerName === decision.playerName || drive.primaryDefenderName === decision.playerName)
  ) {
    return `Lineup-Kontext: Neuer Fokus ${decision.playerName} war an diesem wichtigen Drive beteiligt.`;
  }

  if (
    decision.decisionTone === "negative" &&
    drive.offenseTeamAbbreviation === managerTeamAbbreviation &&
    (drive.turnover || /SACK|INTERCEPTION|FUMBLE/.test(drive.resultType.toUpperCase()))
  ) {
    return `Lineup-Kontext: Das vorher markierte ${decision.positionCode}-Risiko wurde in diesem Drive sichtbar.`;
  }

  if (
    decision.phase === "Passing" &&
    drive.offenseTeamAbbreviation === managerTeamAbbreviation &&
    drive.passAttempts >= drive.rushAttempts
  ) {
    return `Lineup-Kontext: ${decision.positionCode}-Entscheidung passt zu diesem Passing-Drive.`;
  }

  if (
    decision.phase === "Run/Protection" &&
    drive.offenseTeamAbbreviation === managerTeamAbbreviation &&
    drive.rushAttempts >= drive.passAttempts
  ) {
    return `Lineup-Kontext: ${decision.positionCode}-Entscheidung passt zu diesem Run/Protection-Drive.`;
  }

  if (decision.phase === "Defense" && drive.defenseTeamAbbreviation === managerTeamAbbreviation) {
    return `Lineup-Kontext: ${decision.positionCode}-Entscheidung ist in diesem Defense-Drive relevant.`;
  }

  return null;
}

export function buildPositionGroupDriveContext({
  drive,
  managerTeamAbbreviation,
}: {
  drive: MatchReportDrive;
  managerTeamAbbreviation: string | null | undefined;
}) {
  if (!managerTeamAbbreviation || !isDriveImportant(drive)) {
    return null;
  }

  if (
    drive.offenseTeamAbbreviation === managerTeamAbbreviation &&
    drive.rushAttempts >= drive.passAttempts &&
    (drive.totalYards >= 30 || drive.pointsScored > 0)
  ) {
    return `Positionsimpact: RB/Run Game war in diesem Drive sichtbar (${drive.rushAttempts} Runs, ${drive.totalYards} Yards).`;
  }

  if (
    drive.offenseTeamAbbreviation === managerTeamAbbreviation &&
    drive.passAttempts >= drive.rushAttempts &&
    (drive.totalYards >= 35 || drive.pointsScored > 0)
  ) {
    return `Positionsimpact: WR Matchup war in diesem Passing-Drive sichtbar (${drive.passAttempts} Passes, ${drive.totalYards} Yards).`;
  }

  if (
    drive.defenseTeamAbbreviation === managerTeamAbbreviation &&
    (drive.turnover || drive.resultType === "PUNT" || /SACK|TURNOVER|INTERCEPTION|FUMBLE/.test(drive.resultType.toUpperCase()))
  ) {
    return `Positionsimpact: Defense Pressure stoppte den Drive oder erzeugte Fehlerdruck.`;
  }

  return null;
}

export function buildLineupDashboardRetrospective({
  season,
  team,
}: {
  season: SeasonOverview | null | undefined;
  team: TeamDetail | null | undefined;
}) {
  const event = findLatestLineupDecision(team);
  const decision = event ? parseLineupDecisionEvent(event) : null;

  if (!event || !decision || !team || !season) {
    return null;
  }

  const completedMatch =
    [...season.matches]
      .filter(
        (match) =>
          match.status === "COMPLETED" &&
          match.scheduledAt >= event.occurredAt &&
          (match.homeTeamId === team.id || match.awayTeamId === team.id),
      )
      .sort((left, right) => right.scheduledAt.getTime() - left.scheduledAt.getTime())[0] ?? null;

  if (!completedMatch) {
    return null;
  }

  const isHome = completedMatch.homeTeamId === team.id;
  const teamScore = isHome ? completedMatch.homeScore : completedMatch.awayScore;
  const opponentScore = isHome ? completedMatch.awayScore : completedMatch.homeScore;
  const opponentName = isHome ? completedMatch.awayTeamName : completedMatch.homeTeamName;
  const won = teamScore != null && opponentScore != null && teamScore > opponentScore;
  const lost = teamScore != null && opponentScore != null && teamScore < opponentScore;

  return {
    context: `Aus Ergebnis: ${team.abbreviation} ${teamScore ?? "-"}:${opponentScore ?? "-"} vs ${opponentName}. ${decision.description}`,
    impact: won ? "positive" as const : lost ? "negative" as const : "neutral" as const,
    reason: won
      ? "Letzte Lineup-Aenderung hat sich im Ergebnis ausgezahlt."
      : lost
        ? "Letzte Lineup-Aenderung hat den Ergebnis-Rueckschlag nicht verhindert."
        : "Letzte Lineup-Aenderung bleibt nach dem Ergebnis uneindeutig.",
    source: "Derived" as const,
    title: "Lineup Rueckblick",
  };
}
