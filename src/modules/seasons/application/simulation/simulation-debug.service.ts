import { generateMatchStats } from "./match-engine";
import { createProductionMatchContext } from "./production-qa-suite";
import {
  buildEngineDecisionExamples,
  type EngineDecisionExplanation,
} from "../../../gameplay/application/engine-decision-reporting";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationTeamContext,
  TeamSimulationResult,
} from "./simulation.types";

export type SimulationDebugStatus = "GRUEN" | "ROT";

export type SimulationDebugScore = {
  home: number;
  away: number;
};

export type SimulationDebugTeamSummary = {
  teamId: string;
  side: "home" | "away";
  name: string;
  abbreviation: string;
  score: number;
  totalYards: number;
  turnovers: number;
  timeOfPossessionSeconds: number;
};

export type SimulationDebugWinner = {
  teamId: string;
  side: "home" | "away";
  name: string;
  abbreviation: string;
} | null;

export type SimulationDebugReason = {
  driveSequence: number;
  decisionType: string;
  why: string[];
  evidence: Record<string, string | number | boolean | null>;
};

export type SimulationPlayOutcomeLog = {
  driveSequence: number;
  stepNumber: number;
  stage:
    | "DRIVE_START"
    | "DRIVE_PROFILE"
    | "FOURTH_DOWN_DECISION"
    | "OUTCOME"
    | "SCOREBOARD_UPDATE";
  offense: string;
  defense: string;
  outcome: string;
  why: string[];
  evidence: Record<string, string | number | boolean | null>;
};

export type SimulationDriveDebugEntry = {
  sequence: number;
  phaseLabel: string;
  offense: string;
  defense: string;
  clock: string;
  scoreBefore: SimulationDebugScore;
  scoreAfter: SimulationDebugScore;
  startFieldPosition: number | null;
  endFieldPosition: number | null;
  highestReachedFieldPosition: number | null;
  result: string;
  plays: number;
  passAttempts: number;
  rushAttempts: number;
  totalYards: number;
  pointsScored: number;
  turnover: boolean;
  redZoneTrip: boolean;
  primaryPlayerName: string | null;
  primaryDefenderName: string | null;
  fourthDown: {
    decision: string | null;
    ballPosition: number | null;
    distance: number | null;
    scoreDelta: number | null;
    secondsRemaining: number | null;
    coachingRiskProfile: string | null;
    converted: boolean | null;
    yardsAfterDecision: number | null;
    resolution: string | null;
    attempts: number | null;
    why: string[];
  };
  summary: string;
  why: string[];
  playOutcomeLogs: SimulationPlayOutcomeLog[];
};

export type SimulationDebugReport = {
  status: SimulationDebugStatus;
  generatedAt: string;
  metadata: {
    matchId: string;
    seed: string;
    kind: string;
    seasonYear: number;
    week: number;
  };
  teams: {
    home: SimulationDebugTeamSummary;
    away: SimulationDebugTeamSummary;
  };
  finalScore: SimulationDebugScore;
  winner: SimulationDebugWinner;
  driveDebug: SimulationDriveDebugEntry[];
  playOutcomeLogs: SimulationPlayOutcomeLog[];
  decisionReasons: SimulationDebugReason[];
  engineDecisionExamples: EngineDecisionExplanation[];
  checks: {
    driveLogAvailable: boolean;
    whyReasonsAvailable: boolean;
    derivedPlayOutcomeLogsAvailable: boolean;
    nativeSnapPlayByPlayAvailable: boolean;
    engineDecisionExamplesAvailable: boolean;
  };
  limitations: string[];
};

export type CreateSimulationDebugReportInput = {
  context?: SimulationMatchContext;
  result?: MatchSimulationResult;
  seed?: string;
  matchId?: string;
  generatedAt?: string;
};

const REGULATION_SECONDS = 3600;
const QUARTER_SECONDS = 900;
const FIELD_GOAL_DISTANCE_CONSTANT = 117;

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function teamName(team: SimulationTeamContext) {
  return `${team.city} ${team.nickname}`;
}

function findTeam(context: SimulationMatchContext, teamId: string) {
  return context.homeTeam.id === teamId ? context.homeTeam : context.awayTeam;
}

function teamLabel(context: SimulationMatchContext, teamId: string) {
  const team = findTeam(context, teamId);

  return `${team.abbreviation} ${teamName(team)}`;
}

function toTeamSummary(
  contextTeam: SimulationTeamContext,
  resultTeam: TeamSimulationResult,
  side: "home" | "away",
): SimulationDebugTeamSummary {
  return {
    teamId: contextTeam.id,
    side,
    name: teamName(contextTeam),
    abbreviation: contextTeam.abbreviation,
    score: resultTeam.score,
    totalYards: resultTeam.totalYards,
    turnovers: resultTeam.turnovers,
    timeOfPossessionSeconds: resultTeam.timeOfPossessionSeconds,
  };
}

function resolveWinner(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
): SimulationDebugWinner {
  if (result.homeScore === result.awayScore) {
    return null;
  }

  const side = result.homeScore > result.awayScore ? "home" : "away";
  const team = side === "home" ? context.homeTeam : context.awayTeam;

  return {
    teamId: team.id,
    side,
    name: teamName(team),
    abbreviation: team.abbreviation,
  };
}

function formatClock(secondsRemaining: number | null) {
  if (secondsRemaining == null) {
    return "Clock n/a";
  }

  const boundedSeconds = Math.max(0, Math.min(REGULATION_SECONDS, secondsRemaining));
  const elapsed = REGULATION_SECONDS - boundedSeconds;
  const quarter = Math.min(4, Math.floor(elapsed / QUARTER_SECONDS) + 1);
  const remainingInQuarter =
    boundedSeconds - (4 - quarter) * QUARTER_SECONDS;
  const minutes = Math.floor(Math.max(0, remainingInQuarter) / 60);
  const seconds = Math.max(0, remainingInQuarter) % 60;

  return `Q${quarter} ${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatFieldPosition(position: number | null) {
  if (position == null) {
    return "Feldposition n/a";
  }

  if (position < 50) {
    return `eigene ${position}`;
  }

  if (position === 50) {
    return "Mittelfeld";
  }

  return `gegnerische ${100 - position}`;
}

function estimateKickDistance(fieldPosition: number | null) {
  if (fieldPosition == null) {
    return null;
  }

  return Math.max(20, Math.min(64, FIELD_GOAL_DISTANCE_CONSTANT - fieldPosition));
}

function scoreBeforeDrive(drive: MatchDriveResult): SimulationDebugScore {
  return {
    home: drive.startedHomeScore,
    away: drive.startedAwayScore,
  };
}

function scoreAfterDrive(drive: MatchDriveResult): SimulationDebugScore {
  return {
    home: drive.endedHomeScore,
    away: drive.endedAwayScore,
  };
}

function offenseScoreDelta(
  context: SimulationMatchContext,
  drive: MatchDriveResult,
) {
  const offenseIsHome = drive.offenseTeamId === context.homeTeam.id;
  const offenseScore = offenseIsHome
    ? drive.startedHomeScore
    : drive.startedAwayScore;
  const defenseScore = offenseIsHome
    ? drive.startedAwayScore
    : drive.startedHomeScore;

  return offenseScore - defenseScore;
}

function extractEdgeNotes(summary: string) {
  const match = summary.match(/\[Edge:\s*([^\]]+)\]/);

  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function buildFourthDownWhy(
  context: SimulationMatchContext,
  drive: MatchDriveResult,
) {
  const why: string[] = [];
  const scoreDelta = drive.fourthDownScoreDelta ?? offenseScoreDelta(context, drive);
  const secondsRemaining =
    drive.fourthDownSecondsRemaining ?? drive.startSecondsRemainingInGame;
  const fieldPosition = drive.fourthDownBallPosition ?? drive.highestReachedFieldPosition;
  const distance = drive.fourthDownDistance;

  if (!drive.fourthDownDecision) {
    return why;
  }

  if (distance != null) {
    pushUnique(why, `Entscheidung entstand bei 4th & ${distance}.`);
  }

  if (fieldPosition != null) {
    pushUnique(why, `Ball lag bei ${formatFieldPosition(fieldPosition)}.`);
  }

  if (drive.coachingRiskProfile) {
    pushUnique(why, `Coach-Profil war ${drive.coachingRiskProfile}.`);
  }

  if (secondsRemaining != null && secondsRemaining <= 300) {
    pushUnique(why, `Late-game Kontext: noch ${secondsRemaining} Sekunden.`);
  }

  if (scoreDelta < 0) {
    pushUnique(why, `Offense lag mit ${Math.abs(scoreDelta)} Punkten zurueck.`);
  } else if (scoreDelta > 0) {
    pushUnique(why, `Offense fuehrte mit ${scoreDelta} Punkten.`);
  } else {
    pushUnique(why, "Spielstand war aus Offense-Sicht ausgeglichen.");
  }

  if (drive.fourthDownDecision === "GO_FOR_IT") {
    if ((distance ?? 99) <= 2) {
      pushUnique(why, "Kurze Distanz machte den Versuch plausibel.");
    }

    if ((fieldPosition ?? 0) >= 50) {
      pushUnique(why, "Plus-Territory reduzierte den Feldpositionsverlust.");
    }

    if ((fieldPosition ?? 0) >= 80) {
      pushUnique(why, "Red-Zone Naehe erhoehte den Touchdown-Wert.");
    }

    if (drive.targetedAggressiveGoForIt) {
      pushUnique(why, "Aggressives Fourth-Down-Zielgebiet wurde getroffen.");
    }

    if (drive.postFourthDownConverted === true) {
      pushUnique(why, "Versuch wurde konvertiert und der Drive blieb am Leben.");
    } else if (drive.postFourthDownConverted === false) {
      pushUnique(why, "Versuch scheiterte und beendete die Possession.");
    }

    if (drive.aggressiveGoForItResolution) {
      pushUnique(why, `Engine-Resolution: ${drive.aggressiveGoForItResolution}.`);
    }
  }

  if (drive.fourthDownDecision === "FIELD_GOAL") {
    const kickDistance = estimateKickDistance(fieldPosition);

    if (kickDistance != null) {
      pushUnique(why, `Geschaetzte Kickdistanz: ${kickDistance} Yards.`);
    }

    pushUnique(why, "Feldposition lag in einem Scoring-Fenster.");

    if (scoreDelta >= -3) {
      pushUnique(why, "Drei Punkte waren scoreboard-tauglich.");
    }
  }

  if (drive.fourthDownDecision === "PUNT") {
    if ((fieldPosition ?? 100) < 65) {
      pushUnique(why, "Feldposition sprach gegen ein langes Field Goal.");
    }

    if ((distance ?? 0) >= 4) {
      pushUnique(why, "Yards-to-go machten ein Ausspielen riskant.");
    }

    if (drive.coachingRiskProfile === "CONSERVATIVE") {
      pushUnique(why, "Konservatives Coach-Profil bevorzugte Feldposition.");
    }
  }

  return why;
}

function buildOutcomeWhy(
  context: SimulationMatchContext,
  drive: MatchDriveResult,
) {
  const why: string[] = [];
  const edgeNotes = extractEdgeNotes(drive.summary);

  for (const note of edgeNotes) {
    pushUnique(why, `Edge-Kontext: ${note}.`);
  }

  if (drive.resultType.includes("TOUCHDOWN")) {
    pushUnique(
      why,
      `Drive endete mit Touchdown nach ${drive.plays} Plays und ${drive.totalYards} Yards.`,
    );
  } else if (drive.resultType.includes("FIELD_GOAL")) {
    pushUnique(
      why,
      drive.pointsScored > 0
        ? "Field Goal wurde verwandelt und erzeugte 3 Punkte."
        : "Field-Goal-Versuch brachte keine Punkte.",
    );
  } else if (drive.resultType === "PUNT") {
    pushUnique(why, "Drive endete mit Punt und Feldpositionswechsel.");
  } else if (drive.resultType.includes("TURNOVER")) {
    pushUnique(why, "Turnover beendete den Drive und wechselte den Ballbesitz.");
  } else if (drive.resultType === "EMPTY_DRIVE") {
    pushUnique(
      why,
      "Drive endete ohne offiziellen Score-, Punt- oder Turnover-Eintrag.",
    );
  } else {
    pushUnique(why, `Drive-Ergebnis wurde als ${drive.resultType} klassifiziert.`);
  }

  if (drive.redZoneTrip) {
    pushUnique(why, "Drive erreichte die Red Zone.");
  }

  if (drive.turnover) {
    pushUnique(why, "Turnover-Flag ist aktiv.");
  }

  if (drive.primaryPlayerName) {
    pushUnique(why, `Primaerer Offense-Akteur: ${drive.primaryPlayerName}.`);
  }

  if (drive.primaryDefenderName) {
    pushUnique(why, `Primaerer Defense-Akteur: ${drive.primaryDefenderName}.`);
  }

  const delta = offenseScoreDelta(context, drive);

  if (
    drive.startSecondsRemainingInGame != null &&
    drive.startSecondsRemainingInGame <= 120 &&
    delta < 0
  ) {
    pushUnique(
      why,
      "Endgame-Situation: Offense musste bei Rueckstand schnell Punkte suchen.",
    );
  }

  pushUnique(why, `Engine-Summary: ${drive.summary}`);

  return why;
}

function buildDecisionReason(
  context: SimulationMatchContext,
  drive: MatchDriveResult,
): SimulationDebugReason {
  const fourthDownWhy = buildFourthDownWhy(context, drive);
  const outcomeWhy = buildOutcomeWhy(context, drive);
  const why = [...fourthDownWhy];

  for (const reason of outcomeWhy) {
    pushUnique(why, reason);
  }

  return {
    driveSequence: drive.sequence,
    decisionType: drive.fourthDownDecision ?? drive.resultType,
    why,
    evidence: {
      resultType: drive.resultType,
      fourthDownDecision: drive.fourthDownDecision,
      startFieldPosition: drive.startFieldPosition,
      fourthDownBallPosition: drive.fourthDownBallPosition,
      fourthDownDistance: drive.fourthDownDistance,
      coachingRiskProfile: drive.coachingRiskProfile,
      scoreDelta: drive.fourthDownScoreDelta ?? offenseScoreDelta(context, drive),
      secondsRemaining: drive.fourthDownSecondsRemaining ?? drive.startSecondsRemainingInGame,
      pointsScored: drive.pointsScored,
      turnover: drive.turnover,
      redZoneTrip: drive.redZoneTrip,
    },
  };
}

function createLogEntry(input: Omit<SimulationPlayOutcomeLog, "why"> & {
  why: string[];
}): SimulationPlayOutcomeLog {
  return {
    ...input,
    why: input.why.length > 0 ? input.why : ["Keine zusaetzliche Engine-Begruendung verfuegbar."],
  };
}

function buildPlayOutcomeLogs(
  context: SimulationMatchContext,
  drive: MatchDriveResult,
  decisionReason: SimulationDebugReason,
) {
  const offense = teamLabel(context, drive.offenseTeamId);
  const defense = teamLabel(context, drive.defenseTeamId);
  const logs: SimulationPlayOutcomeLog[] = [];

  logs.push(
    createLogEntry({
      driveSequence: drive.sequence,
      stepNumber: 1,
      stage: "DRIVE_START",
      offense,
      defense,
      outcome: `${drive.phaseLabel}: Start bei ${formatFieldPosition(drive.startFieldPosition)}.`,
      why: [
        `Score vor Drive: ${drive.startedHomeScore}-${drive.startedAwayScore}.`,
        `Clock: ${formatClock(drive.startSecondsRemainingInGame)}.`,
      ],
      evidence: {
        startFieldPosition: drive.startFieldPosition,
        startedHomeScore: drive.startedHomeScore,
        startedAwayScore: drive.startedAwayScore,
        startSecondsRemainingInGame: drive.startSecondsRemainingInGame,
      },
    }),
  );

  logs.push(
    createLogEntry({
      driveSequence: drive.sequence,
      stepNumber: 2,
      stage: "DRIVE_PROFILE",
      offense,
      defense,
      outcome: `${drive.plays} Plays, ${drive.passAttempts} Passes, ${drive.rushAttempts} Runs, ${drive.totalYards} Yards.`,
      why: [
        drive.passAttempts >= drive.rushAttempts
          ? "Drive-Profil war passlastig oder ausgeglichen."
          : "Drive-Profil war lauflastig.",
        drive.redZoneTrip
          ? "Drive erreichte die Red Zone."
          : "Drive blieb ausserhalb der Red Zone.",
      ],
      evidence: {
        plays: drive.plays,
        passAttempts: drive.passAttempts,
        rushAttempts: drive.rushAttempts,
        totalYards: drive.totalYards,
        highestReachedFieldPosition: drive.highestReachedFieldPosition,
        redZoneTrip: drive.redZoneTrip,
      },
    }),
  );

  if (drive.fourthDownDecision) {
    logs.push(
      createLogEntry({
        driveSequence: drive.sequence,
        stepNumber: 3,
        stage: "FOURTH_DOWN_DECISION",
        offense,
        defense,
        outcome: `Fourth Down: ${drive.fourthDownDecision}.`,
        why: buildFourthDownWhy(context, drive),
        evidence: {
          fourthDownBallPosition: drive.fourthDownBallPosition,
          fourthDownDistance: drive.fourthDownDistance,
          fourthDownScoreDelta: drive.fourthDownScoreDelta,
          fourthDownSecondsRemaining: drive.fourthDownSecondsRemaining,
          coachingRiskProfile: drive.coachingRiskProfile,
          postFourthDownConverted: drive.postFourthDownConverted,
          aggressiveGoForItResolution: drive.aggressiveGoForItResolution,
        },
      }),
    );
  }

  logs.push(
    createLogEntry({
      driveSequence: drive.sequence,
      stepNumber: logs.length + 1,
      stage: "OUTCOME",
      offense,
      defense,
      outcome: drive.resultType,
      why: decisionReason.why,
      evidence: {
        resultType: drive.resultType,
        pointsScored: drive.pointsScored,
        turnover: drive.turnover,
        primaryPlayerName: drive.primaryPlayerName,
        primaryDefenderName: drive.primaryDefenderName,
      },
    }),
  );

  logs.push(
    createLogEntry({
      driveSequence: drive.sequence,
      stepNumber: logs.length + 1,
      stage: "SCOREBOARD_UPDATE",
      offense,
      defense,
      outcome: `Score nach Drive: ${drive.endedHomeScore}-${drive.endedAwayScore}.`,
      why: [
        drive.pointsScored > 0
          ? `${drive.pointsScored} Punkte wurden dem Offense-Team gutgeschrieben.`
          : "Scoreboard blieb unveraendert.",
      ],
      evidence: {
        endedHomeScore: drive.endedHomeScore,
        endedAwayScore: drive.endedAwayScore,
        pointsScored: drive.pointsScored,
      },
    }),
  );

  return logs;
}

function buildDriveDebugEntry(
  context: SimulationMatchContext,
  drive: MatchDriveResult,
) {
  const decisionReason = buildDecisionReason(context, drive);
  const playOutcomeLogs = buildPlayOutcomeLogs(context, drive, decisionReason);
  const fourthDownWhy = buildFourthDownWhy(context, drive);

  return {
    drive: {
      sequence: drive.sequence,
      phaseLabel: drive.phaseLabel,
      offense: teamLabel(context, drive.offenseTeamId),
      defense: teamLabel(context, drive.defenseTeamId),
      clock: formatClock(drive.startSecondsRemainingInGame),
      scoreBefore: scoreBeforeDrive(drive),
      scoreAfter: scoreAfterDrive(drive),
      startFieldPosition: drive.startFieldPosition,
      endFieldPosition: drive.highestReachedFieldPosition,
      highestReachedFieldPosition: drive.highestReachedFieldPosition,
      result: drive.resultType,
      plays: drive.plays,
      passAttempts: drive.passAttempts,
      rushAttempts: drive.rushAttempts,
      totalYards: drive.totalYards,
      pointsScored: drive.pointsScored,
      turnover: drive.turnover,
      redZoneTrip: drive.redZoneTrip,
      primaryPlayerName: drive.primaryPlayerName,
      primaryDefenderName: drive.primaryDefenderName,
      fourthDown: {
        decision: drive.fourthDownDecision,
        ballPosition: drive.fourthDownBallPosition,
        distance: drive.fourthDownDistance,
        scoreDelta: drive.fourthDownScoreDelta,
        secondsRemaining: drive.fourthDownSecondsRemaining,
        coachingRiskProfile: drive.coachingRiskProfile,
        converted: drive.postFourthDownConverted,
        yardsAfterDecision: drive.postFourthDownYards,
        resolution: drive.aggressiveGoForItResolution,
        attempts: drive.fourthDownAttempts,
        why: fourthDownWhy.length > 0
          ? fourthDownWhy
          : ["Keine explizite Fourth-Down-Entscheidung in diesem Drive."],
      },
      summary: drive.summary,
      why: decisionReason.why,
      playOutcomeLogs,
    } satisfies SimulationDriveDebugEntry,
    decisionReason,
  };
}

export function analyzeSimulationDebug(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
  generatedAt = new Date().toISOString(),
): SimulationDebugReport {
  const entries = result.drives.map((drive) => buildDriveDebugEntry(context, drive));
  const driveDebug = entries.map((entry) => entry.drive);
  const decisionReasons = entries.map((entry) => entry.decisionReason);
  const playOutcomeLogs = driveDebug.flatMap((drive) => drive.playOutcomeLogs);
  const engineDecisionExamples = buildEngineDecisionExamples();
  const driveLogAvailable = driveDebug.length > 0;
  const whyReasonsAvailable = decisionReasons.every((reason) => reason.why.length > 0);
  const derivedPlayOutcomeLogsAvailable =
    driveLogAvailable && driveDebug.every((drive) => drive.playOutcomeLogs.length >= 4);
  const status: SimulationDebugStatus =
    driveLogAvailable && whyReasonsAvailable && derivedPlayOutcomeLogsAvailable
      ? "GRUEN"
      : "ROT";

  return {
    status,
    generatedAt,
    metadata: {
      matchId: context.matchId,
      seed: result.simulationSeed,
      kind: context.kind,
      seasonYear: context.seasonYear,
      week: context.week,
    },
    teams: {
      home: toTeamSummary(context.homeTeam, result.homeTeam, "home"),
      away: toTeamSummary(context.awayTeam, result.awayTeam, "away"),
    },
    finalScore: {
      home: result.homeScore,
      away: result.awayScore,
    },
    winner: resolveWinner(context, result),
    driveDebug,
    playOutcomeLogs,
    decisionReasons,
    checks: {
      driveLogAvailable,
      whyReasonsAvailable,
      derivedPlayOutcomeLogsAvailable,
      nativeSnapPlayByPlayAvailable: false,
      engineDecisionExamplesAvailable: engineDecisionExamples.length >= 10,
    },
    engineDecisionExamples,
    limitations: [
      "Die aktuelle Match Engine persistiert Drive-Level Outcomes, aber keine native Snap-fuer-Snap Play-by-Play-Historie.",
      "Play Outcome Logs sind deshalb deterministisch aus echten Drive-, Field-Position-, Score- und Fourth-Down-Daten abgeleitet.",
      "WHY-Begruendungen nutzen vorhandene Engine-Evidenzfelder und ersetzen keine interne Probability-Trace auf Random-Roll-Ebene.",
    ],
  };
}

export function createSimulationDebugReport(
  input: CreateSimulationDebugReportInput = {},
) {
  const context =
    input.context ??
    createProductionMatchContext(0, {
      matchId: input.matchId ?? "simulation-debug-game-1",
      seed: input.seed ?? "simulation-debug-seed-1",
    });
  const result = input.result ?? generateMatchStats(context);

  return analyzeSimulationDebug(
    context,
    result,
    input.generatedAt ?? new Date().toISOString(),
  );
}

function renderStatusPill(status: SimulationDebugStatus) {
  return `<span class="pill ${status === "GRUEN" ? "good" : "bad"}">Status: ${status}</span>`;
}

function renderTable(headers: string[], rows: Array<Array<string | number | boolean | null>>) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((value) => `<td>${escapeHtml(value ?? "-")}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderReasons(reasons: string[]) {
  return `<ul>${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`;
}

export function renderSimulationDebugHtml(report: SimulationDebugReport) {
  const driveRows = report.driveDebug.map((drive) => [
    drive.sequence,
    drive.clock,
    drive.offense,
    `${drive.scoreBefore.home}-${drive.scoreBefore.away}`,
    formatFieldPosition(drive.startFieldPosition),
    drive.result,
    drive.plays,
    drive.totalYards,
    drive.fourthDown.decision ?? "-",
    `${drive.scoreAfter.home}-${drive.scoreAfter.away}`,
  ]);
  const logRows = report.playOutcomeLogs.map((log) => [
    log.driveSequence,
    log.stepNumber,
    log.stage,
    log.offense,
    log.outcome,
    log.why.join(" "),
  ]);
  const whyRows = report.decisionReasons.map((reason) => [
    reason.driveSequence,
    reason.decisionType,
    reason.why.join(" "),
  ]);
  const engineDecisionRows = report.engineDecisionExamples.map((example) => [
    example.playNumber,
    example.title,
    example.stage,
    example.userSummary,
    example.footballReason,
  ]);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Simulation Debug Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f4;
      --panel: #ffffff;
      --ink: #1b2428;
      --muted: #657174;
      --line: #d7dedb;
      --good: #17613d;
      --bad: #9b2d25;
      --accent: #2c5d73;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }

    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }

    h1,
    h2,
    h3 {
      letter-spacing: 0;
      margin: 0;
    }

    h1 {
      font-size: 34px;
      line-height: 1.1;
    }

    h2 {
      margin-top: 32px;
      font-size: 22px;
    }

    h3 {
      margin-top: 18px;
      font-size: 16px;
    }

    p {
      color: var(--muted);
      margin: 8px 0 0;
    }

    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--line);
    }

    .pill-row,
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .pill,
    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 10px;
      font-weight: 700;
    }

    .pill.good {
      color: var(--good);
      border-color: color-mix(in srgb, var(--good), white 68%);
    }

    .pill.bad {
      color: var(--bad);
      border-color: color-mix(in srgb, var(--bad), white 68%);
    }

    .card {
      min-width: 160px;
      padding: 14px;
    }

    .label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }

    .value {
      margin-top: 4px;
      font-size: 20px;
      font-weight: 800;
    }

    table {
      width: 100%;
      margin-top: 12px;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    th,
    td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      color: var(--muted);
      background: #eef3f0;
      font-size: 12px;
      text-transform: uppercase;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    ul {
      margin: 10px 0 0;
      padding-left: 20px;
    }

    li {
      margin: 4px 0;
    }

    details {
      margin-top: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 10px 12px;
    }

    summary {
      cursor: pointer;
      font-weight: 800;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div>
        <h1>Simulation Debug Report</h1>
        <p>Step-by-Step Analyse, Drive Debug View, Play Outcome Logs und WHY-Begruendung.</p>
      </div>
      <div>${renderStatusPill(report.status)}</div>
    </div>

    <section>
      <h2>Uebersicht</h2>
      <div class="cards">
        <div class="card"><div class="label">Match</div><div class="value">${escapeHtml(report.metadata.matchId)}</div></div>
        <div class="card"><div class="label">Seed</div><div class="value">${escapeHtml(report.metadata.seed)}</div></div>
        <div class="card"><div class="label">Final</div><div class="value">${report.finalScore.home}-${report.finalScore.away}</div></div>
        <div class="card"><div class="label">Winner</div><div class="value">${escapeHtml(report.winner?.abbreviation ?? "Tie")}</div></div>
        <div class="card"><div class="label">Drives</div><div class="value">${report.driveDebug.length}</div></div>
        <div class="card"><div class="label">Logs</div><div class="value">${report.playOutcomeLogs.length}</div></div>
      </div>
      <div class="pill-row">
        <span class="pill ${report.checks.driveLogAvailable ? "good" : "bad"}">Drive Log: ${report.checks.driveLogAvailable ? "JA" : "NEIN"}</span>
        <span class="pill ${report.checks.whyReasonsAvailable ? "good" : "bad"}">WHY: ${report.checks.whyReasonsAvailable ? "JA" : "NEIN"}</span>
        <span class="pill ${report.checks.derivedPlayOutcomeLogsAvailable ? "good" : "bad"}">Play Outcome Logs: ${report.checks.derivedPlayOutcomeLogsAvailable ? "JA" : "NEIN"}</span>
        <span class="pill ${report.checks.engineDecisionExamplesAvailable ? "good" : "bad"}">Engine Decision Beispiele: ${report.checks.engineDecisionExamplesAvailable ? "JA" : "NEIN"}</span>
        <span class="pill bad">Native Snap Logs: NEIN</span>
      </div>
    </section>

    <section>
      <h2>Teams</h2>
      ${renderTable(
        ["Side", "Team", "Score", "Total Yards", "Turnovers", "TOP Sekunden"],
        [
          [
            "Home",
            `${report.teams.home.abbreviation} ${report.teams.home.name}`,
            report.teams.home.score,
            report.teams.home.totalYards,
            report.teams.home.turnovers,
            report.teams.home.timeOfPossessionSeconds,
          ],
          [
            "Away",
            `${report.teams.away.abbreviation} ${report.teams.away.name}`,
            report.teams.away.score,
            report.teams.away.totalYards,
            report.teams.away.turnovers,
            report.teams.away.timeOfPossessionSeconds,
          ],
        ],
      )}
    </section>

    <section>
      <h2>Drive Debug View</h2>
      ${renderTable(
        ["Drive", "Clock", "Offense", "Before", "Start", "Result", "Plays", "Yards", "4th", "After"],
        driveRows,
      )}
      ${report.driveDebug
        .map(
          (drive) => `<details>
            <summary>Drive ${drive.sequence}: ${escapeHtml(drive.result)} WHY</summary>
            ${renderReasons(drive.why)}
            <h3>Summary</h3>
            <p>${escapeHtml(drive.summary)}</p>
          </details>`,
        )
        .join("")}
    </section>

    <section>
      <h2>Neue Engine-Entscheidungen</h2>
      <p>Diese Tabelle erklaert die neuen Play-Resolution-Stufen in Anwendersprache. Entwickler koennen die Details darunter aufklappen.</p>
      ${renderTable(["#", "Play", "Bereich", "Anwender-Erklaerung", "Warum"], engineDecisionRows)}
      ${report.engineDecisionExamples
        .map(
          (example) => `<details>
            <summary>Play ${example.playNumber}: ${escapeHtml(example.title)}</summary>
            <p>${escapeHtml(example.userSummary)}</p>
            ${renderTable(
              ["Anzeige", "Wert", "Erklaerung"],
              example.developerDetails.map((detail) => [
                detail.label,
                detail.value,
                detail.explanation,
              ]),
            )}
          </details>`,
        )
        .join("")}
    </section>

    <section>
      <h2>Play Outcome Logs</h2>
      <p>Abgeleitete Step Logs aus dem Drive-Level-Modell der Match Engine.</p>
      ${renderTable(["Drive", "Step", "Stage", "Offense", "Outcome", "WHY"], logRows)}
    </section>

    <section>
      <h2>WHY Entscheidungsbegruendung</h2>
      ${renderTable(["Drive", "Decision", "WHY"], whyRows)}
    </section>

    <section>
      <h2>Limitierungen</h2>
      ${renderReasons(report.limitations)}
      <p>Generiert: <code>${escapeHtml(report.generatedAt)}</code></p>
    </section>
  </main>
</body>
</html>`;
}
