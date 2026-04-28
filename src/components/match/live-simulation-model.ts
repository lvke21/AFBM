import type { DashboardWeekState } from "@/components/dashboard/dashboard-model";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import type { MatchReport, MatchReportDrive, MatchReportTeam } from "./match-report-model";
import {
  buildLineupDriveContext,
  buildPositionGroupDriveContext,
  findLatestLineupDecision,
  parseLineupDecisionEvent,
} from "./lineup-outcome-model";

type LiveTone = "neutral" | "success" | "warning" | "danger" | "active";

export type LiveSimulationMatch = MatchReport & {
  id: string;
  kind: string;
  scheduledAt: Date;
  simulationCompletedAt?: Date | null;
  simulationStartedAt?: Date | null;
  week: number;
};

export type LiveSimulationTeamState = {
  abbreviation: string;
  isManagerTeam: boolean;
  name: string;
  score: number | string;
  side: "Home" | "Away";
};

export type LiveSituationState = {
  clockLabel: string;
  downDistanceLabel: string;
  fieldPositionLabel: string;
  possessionLabel: string;
  phaseLabel: string;
  sourceLabel: "Drive Details" | "Game State";
  summary: string;
};

export type LiveTimelineHighlight =
  | "big-gain"
  | "default"
  | "field-goal"
  | "red-zone"
  | "sack"
  | "touchdown"
  | "turnover";

export type LiveTimelineEntry = {
  defenseTeamAbbreviation: string;
  description: string;
  highlight: LiveTimelineHighlight;
  isImportant: boolean;
  lineupContext?: string | null;
  meta: string;
  offenseTeamAbbreviation: string;
  phaseLabel: string;
  resultLabel: string;
  scoreChangeLabel: string;
  sequence: number;
  title: string;
  tone: LiveTone;
};

export type LiveControlState = {
  blockedReason: string | null;
  canFinishGame: boolean;
  primaryDescription: string;
  primaryLabel: string;
  statusLabel: string;
  weekStateLabel: string;
};

export type LiveMomentumIndicator = {
  description: string;
  label: string;
  sourceLabel: "Spielsignal" | "Gespeichert";
  tone: LiveTone;
  value: string;
};

export type LiveStorylineItem = {
  description: string;
  label: string;
  title: string;
  tone: LiveTone;
};

export type LiveStorylineState = {
  currentGameState: LiveStorylineItem;
  keyDrive: LiveStorylineItem;
  managerImpact: LiveStorylineItem;
  momentumSignal: LiveStorylineItem;
  watchNext: LiveStorylineItem;
};

export type LiveSimulationState = {
  awayTeam: LiveSimulationTeamState;
  control: LiveControlState;
  driveCountLabel: string;
  hasTimeline: boolean;
  homeTeam: LiveSimulationTeamState;
  momentumIndicators: LiveMomentumIndicator[];
  scoreLine: string;
  situation: LiveSituationState;
  statusLabel: string;
  storyline: LiveStorylineState;
  timeline: LiveTimelineEntry[];
  timelineEmptyMessage: string;
};

function displayState(value: string) {
  if (value === "IN_PROGRESS") {
    return "Live";
  }

  if (value === "COMPLETED") {
    return "Beendet";
  }

  if (value === "GAME_RUNNING") {
    return "Spiel laeuft";
  }

  if (value === "POST_GAME") {
    return "Nach dem Spiel";
  }

  if (value === "PRE_WEEK") {
    return "Woche vorbereiten";
  }

  if (value === "READY") {
    return "Bereit";
  }

  return value.replaceAll("_", " ");
}

function scoreValue(team: MatchReportTeam) {
  return team.score ?? "-";
}

function toTeamState(team: MatchReportTeam, side: LiveSimulationTeamState["side"]): LiveSimulationTeamState {
  return {
    abbreviation: team.abbreviation,
    isManagerTeam: team.managerControlled === true,
    name: team.name,
    score: scoreValue(team),
    side,
  };
}

function sortedDrives(drives: MatchReportDrive[]) {
  return [...drives].sort((left, right) => left.sequence - right.sequence);
}

function resultLabel(resultType: string) {
  return displayState(resultType);
}

function classifyDrive(drive: MatchReportDrive): Pick<LiveTimelineEntry, "highlight" | "isImportant" | "tone"> {
  const summary = drive.summary.toLowerCase();
  const resultType = drive.resultType.toUpperCase();
  const yardsPerPlay = drive.totalYards / Math.max(drive.plays, 1);

  if (drive.turnover || resultType.includes("TURNOVER") || resultType.includes("INTERCEPTION") || resultType.includes("FUMBLE")) {
    return { highlight: "turnover", isImportant: true, tone: "danger" };
  }

  if (resultType.includes("TOUCHDOWN") || drive.pointsScored >= 6) {
    return { highlight: "touchdown", isImportant: true, tone: "success" };
  }

  if (summary.includes("sack") || resultType.includes("SACK")) {
    return { highlight: "sack", isImportant: true, tone: "warning" };
  }

  if (resultType.includes("FIELD_GOAL") || drive.pointsScored === 3) {
    return { highlight: "field-goal", isImportant: true, tone: "active" };
  }

  if (drive.totalYards >= 55 || yardsPerPlay >= 8) {
    return { highlight: "big-gain", isImportant: true, tone: "success" };
  }

  if (drive.redZoneTrip) {
    return { highlight: "red-zone", isImportant: true, tone: "warning" };
  }

  return { highlight: "default", isImportant: false, tone: "neutral" };
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

function buildTimelineEntry(
  drive: MatchReportDrive,
  lineupDecision: ReturnType<typeof parseLineupDecisionEvent>,
  managerAbbreviation: string | null,
): LiveTimelineEntry {
  const classification = classifyDrive(drive);

  return {
    defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
    description: drive.summary,
    ...classification,
    lineupContext:
      buildLineupDriveContext({
        decision: lineupDecision,
        drive,
        managerTeamAbbreviation: managerAbbreviation,
      }) ?? buildPositionGroupDriveContext({ drive, managerTeamAbbreviation: managerAbbreviation }),
    meta: `${drive.plays} Plays · ${drive.totalYards} Yards · ${drive.passAttempts} Pass / ${drive.rushAttempts} Run`,
    offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
    phaseLabel: drive.phaseLabel,
    resultLabel: resultLabel(drive.resultType),
    scoreChangeLabel: `${drive.startedScore} -> ${drive.endedScore}`,
    sequence: drive.sequence,
    title: `${drive.offenseTeamAbbreviation} Drive ${drive.sequence}`,
  };
}

function buildSituation(match: LiveSimulationMatch, drives: MatchReportDrive[]): LiveSituationState {
  const latestDrive = drives.at(-1) ?? null;

  if (latestDrive) {
    return {
      clockLabel: "Clock nicht persistiert",
      downDistanceLabel: "Drive-Zusammenfassung",
      fieldPositionLabel: "Feldposition nicht im Live-Feed",
      possessionLabel: `Letzte Possession: ${latestDrive.offenseTeamAbbreviation}`,
      phaseLabel: latestDrive.phaseLabel,
      sourceLabel: "Drive Details",
      summary: `Letzter Drive: ${latestDrive.summary}`,
    };
  }

  if (match.status === "IN_PROGRESS") {
    return {
      clockLabel: "Clock nicht persistiert",
      downDistanceLabel: "Noch keine Drive-Daten",
      fieldPositionLabel: "Noch offen",
      possessionLabel: "Noch offen",
      phaseLabel: "Live",
      sourceLabel: "Game State",
      summary: "Das Spiel laeuft. Sobald Drive-Zusammenfassungen gespeichert sind, wird der Verlauf hier konkreter.",
    };
  }

  if (match.status === "COMPLETED") {
    return {
      clockLabel: "Final",
      downDistanceLabel: "Abgeschlossen",
      fieldPositionLabel: "Abgeschlossen",
      possessionLabel: "Final",
      phaseLabel: "Final",
      sourceLabel: "Game State",
      summary: "Das Match ist abgeschlossen; der finale Report enthaelt die vollstaendige Auswertung.",
    };
  }

  return {
    clockLabel: "Pre-game",
    downDistanceLabel: "Noch nicht gestartet",
    fieldPositionLabel: "Noch offen",
    possessionLabel: "Kickoff offen",
    phaseLabel: "Pre-game",
    sourceLabel: "Game State",
    summary: "Das Match wurde noch nicht gestartet. Live-Daten erscheinen nach dem Start.",
  };
}

function scoreLeader(match: LiveSimulationMatch): LiveMomentumIndicator {
  const homeScore = match.homeTeam.score;
  const awayScore = match.awayTeam.score;

  if (homeScore == null || awayScore == null) {
    return {
      description: "Noch kein Score aus dem Match gespeichert.",
      label: "Score Edge",
      sourceLabel: "Spielsignal",
      tone: "neutral",
      value: "Noch offen",
    };
  }

  if (homeScore === awayScore) {
    return {
      description: "Das Spiel ist laut gespeichertem Score ausgeglichen.",
      label: "Score Edge",
      sourceLabel: "Gespeichert",
      tone: "neutral",
      value: "Unentschieden",
    };
  }

  const leader = homeScore > awayScore ? match.homeTeam : match.awayTeam;
  const margin = Math.abs(homeScore - awayScore);

  return {
    description: `${leader.abbreviation} fuehrt mit ${margin} Punkt(en).`,
    label: "Score Edge",
    sourceLabel: "Gespeichert",
    tone: margin >= 14 ? "success" : "active",
    value: leader.abbreviation,
  };
}

function lastDriveIndicator(drives: MatchReportDrive[]): LiveMomentumIndicator {
  const latestDrive = drives.at(-1) ?? null;

  if (!latestDrive) {
    return {
      description: "Noch kein Drive gespeichert.",
      label: "Last Drive",
      sourceLabel: "Spielsignal",
      tone: "neutral",
      value: "Noch offen",
    };
  }

  const classification = classifyDrive(latestDrive);

  return {
    description: latestDrive.summary,
    label: "Last Drive",
    sourceLabel: "Gespeichert",
    tone: classification.tone,
    value: resultLabel(latestDrive.resultType),
  };
}

function rhythmIndicator(drives: MatchReportDrive[]): LiveMomentumIndicator {
  const recent = drives.slice(-3);

  if (recent.length === 0) {
    return {
      description: "Drive-Rhythmus wird sichtbar, sobald Drives persistiert sind.",
      label: "Drive Flow",
      sourceLabel: "Spielsignal",
      tone: "neutral",
      value: "Wartet",
    };
  }

  const points = recent.reduce((sum, drive) => sum + drive.pointsScored, 0);
  const yards = recent.reduce((sum, drive) => sum + drive.totalYards, 0);
  const turnovers = recent.filter((drive) => drive.turnover).length;

  if (turnovers > 0) {
    return {
      description: `${turnovers} Turnover in den letzten ${recent.length} Drive(s).`,
      label: "Drive Flow",
      sourceLabel: "Gespeichert",
      tone: "danger",
      value: "Gekippt",
    };
  }

  if (points >= 7 || yards >= 120) {
    return {
      description: `${points} Punkte und ${yards} Yards in den letzten ${recent.length} Drive(s).`,
      label: "Drive Flow",
      sourceLabel: "Gespeichert",
      tone: "success",
      value: "Stark",
    };
  }

  return {
    description: `${points} Punkte und ${yards} Yards in den letzten ${recent.length} Drive(s).`,
    label: "Drive Flow",
    sourceLabel: "Gespeichert",
    tone: "neutral",
    value: "Stabil",
  };
}

function scoreStory(match: LiveSimulationMatch): LiveStorylineItem {
  const homeScore = match.homeTeam.score;
  const awayScore = match.awayTeam.score;

  if (match.status === "COMPLETED") {
    return {
      description: "Das Spiel ist beendet. Der Fokus liegt jetzt auf Auswertung und naechster Woche.",
      label: "Current Game State",
      title: "Finale Phase",
      tone: "success",
    };
  }

  if (homeScore == null || awayScore == null) {
    return {
      description: "Kickoff steht noch aus oder der Live-Score wurde noch nicht gespeichert.",
      label: "Current Game State",
      title: "Noch kein Score",
      tone: "neutral",
    };
  }

  const margin = Math.abs(homeScore - awayScore);

  if (margin === 0) {
    return {
      description: "Kein Team hat sich abgesetzt. Der naechste Fehler oder Big Play kann das Spiel kippen.",
      label: "Current Game State",
      title: "Alles offen",
      tone: "active",
    };
  }

  const leader = homeScore > awayScore ? match.homeTeam : match.awayTeam;

  return {
    description:
      margin <= 7
        ? `${leader.abbreviation} fuehrt nur mit ${margin}. Jeder Drive hat jetzt Gewicht.`
        : `${leader.abbreviation} hat sich mit ${margin} Punkten Luft verschafft.`,
    label: "Current Game State",
    title: margin <= 7 ? "Enges Spiel" : "Kontrolle kippt",
    tone: margin <= 7 ? "warning" : "active",
  };
}

function driveStory(drives: MatchReportDrive[]): LiveStorylineItem {
  const keyDrive =
    [...drives]
      .reverse()
      .find((drive) => classifyDrive(drive).isImportant) ?? drives.at(-1) ?? null;

  if (!keyDrive) {
    return {
      description: "Noch keine Drive-Zusammenfassung gespeichert. Der Live-Screen zeigt bis dahin Score und Match-Status.",
      label: "Key Drive",
      title: "Wartet auf den ersten Drive",
      tone: "neutral",
    };
  }

  const classification = classifyDrive(keyDrive);

  return {
    description: `${keyDrive.offenseTeamAbbreviation}: ${keyDrive.summary} (${keyDrive.plays} Plays, ${keyDrive.totalYards} Yards).`,
    label: "Key Drive",
    title:
      classification.highlight === "touchdown"
        ? "Touchdown-Drive als Ausrufezeichen"
        : classification.highlight === "turnover"
          ? "Ballverlust veraendert das Spiel"
          : classification.highlight === "field-goal"
            ? "Scoring Drive haelt den Druck hoch"
            : classification.highlight === "big-gain"
              ? "Explosiver Drive"
              : classification.highlight === "red-zone"
                ? "Red-Zone-Moment"
                : classification.highlight === "sack"
                  ? "Defense setzt ein Zeichen"
                  : "Letzter Drive",
    tone: classification.tone,
  };
}

function momentumStory(match: LiveSimulationMatch, drives: MatchReportDrive[]): LiveStorylineItem {
  const recent = drives.slice(-3);
  const turnoverCount = recent.filter((drive) => drive.turnover).length;
  const recentPoints = recent.reduce((sum, drive) => sum + drive.pointsScored, 0);
  const recentYards = recent.reduce((sum, drive) => sum + drive.totalYards, 0);

  if (turnoverCount > 0) {
    return {
      description: `${turnoverCount} Turnover in den letzten ${recent.length} Drives. Ball Security ist gerade der Hebel.`,
      label: "Momentum Signal",
      title: "Momentum wackelt",
      tone: "danger",
    };
  }

  if (recent.length > 0 && (recentPoints >= 7 || recentYards >= 120)) {
    return {
      description: `${recentPoints} Punkte und ${recentYards} Yards in den letzten ${recent.length} Drives. Das Spiel bekommt Tempo.`,
      label: "Momentum Signal",
      title: "Drive-Rhythmus steigt",
      tone: "success",
    };
  }

  const leader = scoreLeader(match);

  return {
    description: leader.description,
    label: "Momentum Signal",
    title: leader.value === "Noch offen" ? "Momentum noch offen" : `Edge: ${leader.value}`,
    tone: leader.tone,
  };
}

function managerImpactStory({
  drives,
  lineupDecision,
  managerAbbreviation,
}: {
  drives: MatchReportDrive[];
  lineupDecision: ReturnType<typeof parseLineupDecisionEvent>;
  managerAbbreviation: string | null;
}): LiveStorylineItem {
  if (!lineupDecision || !managerAbbreviation) {
    return {
      description: "Keine aktuelle Lineup-Aenderung im Match-Kontext gefunden. Manager Impact wird sichtbar, sobald eine gespeicherte Entscheidung zum Spiel passt.",
      label: "Manager Impact",
      title: "Kein klares Entscheidungssignal",
      tone: "neutral",
    };
  }

  const contextDrive = drives.find((drive) =>
    buildLineupDriveContext({ decision: lineupDecision, drive, managerTeamAbbreviation: managerAbbreviation }),
  );

  if (contextDrive) {
    return {
      description: `Die letzte ${lineupDecision.positionCode}-Entscheidung passt zu Drive ${contextDrive.sequence}: ${contextDrive.summary}`,
      label: "Manager Impact",
      title: lineupDecision.playerName
        ? `${lineupDecision.playerName} im Fokus`
        : `${lineupDecision.positionCode}-Entscheidung im Fokus`,
      tone: lineupDecision.decisionTone === "negative" ? "warning" : "active",
    };
  }

  return {
    description: `${lineupDecision.positionCode}: ${lineupDecision.evaluation}. Beobachte ${lineupDecision.phase}, sobald ein passender Drive gespeichert wird.`,
    label: "Manager Impact",
    title: "Lineup-Entscheidung im Blick",
    tone: lineupDecision.decisionTone === "negative" ? "warning" : "active",
  };
}

function watchNextStory(match: LiveSimulationMatch, drives: MatchReportDrive[]): LiveStorylineItem {
  if (match.status === "COMPLETED") {
    return {
      description: "Oeffne den Report und pruefe, welche Entscheidung fuer die naechste Woche relevant wird.",
      label: "What to watch next",
      title: "Auswertung und naechste Woche",
      tone: "success",
    };
  }

  const latestDrive = drives.at(-1) ?? null;

  if (!latestDrive) {
    return {
      description: "Achte zuerst auf den ersten gespeicherten Drive: Wer bewegt den Ball, wer macht den ersten Fehler?",
      label: "What to watch next",
      title: "Erster Drive setzt den Ton",
      tone: "neutral",
    };
  }

  if (latestDrive.turnover) {
    return {
      description: "Nach einem Turnover zaehlt die Antwort: kurzer Drive, schnelle Punkte oder Defense-Stop?",
      label: "What to watch next",
      title: "Antwort nach Ballverlust",
      tone: "danger",
    };
  }

  if (latestDrive.pointsScored > 0) {
    return {
      description: "Nach Punkten geht es um Kontrolle: kann die Defense den naechsten Drive bremsen?",
      label: "What to watch next",
      title: "Stop nach Score",
      tone: "warning",
    };
  }

  return {
    description: "Der naechste wichtige Drive entscheidet, ob das Spiel stabil bleibt oder kippt.",
    label: "What to watch next",
    title: "Naechster kritischer Drive",
    tone: "active",
  };
}

function buildStoryline({
  drives,
  lineupDecision,
  managerAbbreviation,
  match,
}: {
  drives: MatchReportDrive[];
  lineupDecision: ReturnType<typeof parseLineupDecisionEvent>;
  managerAbbreviation: string | null;
  match: LiveSimulationMatch;
}): LiveStorylineState {
  return {
    currentGameState: scoreStory(match),
    keyDrive: driveStory(drives),
    managerImpact: managerImpactStory({ drives, lineupDecision, managerAbbreviation }),
    momentumSignal: momentumStory(match, drives),
    watchNext: watchNextStory(match, drives),
  };
}

function buildControlState({
  canFinishGame,
  match,
  weekState,
}: {
  canFinishGame: boolean;
  match: LiveSimulationMatch;
  weekState: DashboardWeekState;
}): LiveControlState {
  if (canFinishGame) {
    return {
      blockedReason: null,
      canFinishGame,
      primaryDescription: "Das Match wurde drive-basiert simuliert. Pruefe Score-Verlauf und Drives, bevor du den Report erzeugst.",
      primaryLabel: "Simulation auswerten",
      statusLabel: displayState(match.status),
      weekStateLabel: displayState(weekState),
    };
  }

  const blockedReason =
    weekState === "PRE_WEEK"
      ? "Die Woche ist noch nicht vorbereitet. Oeffne zuerst das Setup und bringe den Week Loop in den Startzustand."
      : weekState === "READY"
        ? "Das Match ist noch nicht gestartet. Starte es zuerst in der Game Preview."
        : weekState !== "GAME_RUNNING"
          ? "Match-Control ist nur waehrend eines laufenden Games aktiv."
          : "Dieses Match ist nicht im Status IN PROGRESS.";

  return {
    blockedReason,
    canFinishGame,
    primaryDescription: blockedReason,
    primaryLabel: match.status === "COMPLETED" ? "Report pruefen" : "Wartet auf Match-Start",
    statusLabel: displayState(match.status),
    weekStateLabel: displayState(weekState),
  };
}

export function buildLiveSimulationState({
  canFinishGame,
  match,
  teamDetail,
  weekState,
}: {
  canFinishGame: boolean;
  match: LiveSimulationMatch;
  teamDetail?: TeamDetail | null;
  weekState: DashboardWeekState;
}): LiveSimulationState {
  const drives = sortedDrives(match.drives);
  const lineupDecisionEvent = findLatestLineupDecision(teamDetail, {
    before: match.simulationCompletedAt ?? match.scheduledAt,
  });
  const lineupDecision = lineupDecisionEvent ? parseLineupDecisionEvent(lineupDecisionEvent) : null;
  const managerAbbreviation = managerTeamAbbreviation(match);
  const timeline = drives.map((drive) =>
    buildTimelineEntry(drive, lineupDecision, managerAbbreviation),
  );

  return {
    awayTeam: toTeamState(match.awayTeam, "Away"),
    control: buildControlState({ canFinishGame, match, weekState }),
    driveCountLabel: `${drives.length} Drive${drives.length === 1 ? "" : "s"}`,
    hasTimeline: timeline.length > 0,
    homeTeam: toTeamState(match.homeTeam, "Home"),
    momentumIndicators: [
      scoreLeader(match),
      lastDriveIndicator(drives),
      rhythmIndicator(drives),
    ],
    scoreLine: `${match.homeTeam.abbreviation} ${scoreValue(match.homeTeam)} : ${scoreValue(match.awayTeam)} ${match.awayTeam.abbreviation}`,
    situation: buildSituation(match, drives),
    statusLabel: displayState(match.status),
    storyline: buildStoryline({ drives, lineupDecision, managerAbbreviation, match }),
    timeline,
    timelineEmptyMessage:
      "Noch keine Drive-Zusammenfassungen gespeichert. Starte das Match erneut aus der Game Preview, damit der automatische Drive-Flow erzeugt wird.",
  };
}
