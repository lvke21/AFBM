import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import {
  evaluateUnderdogObjectives,
  evaluateMoralVictory,
  type MoralVictoryAssessment,
  type UnderdogObjectiveAssessment,
} from "@/modules/seasons/domain/weak-team-goals";

type MatchTeamStats = {
  firstDowns: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
} | null;

export type MatchReportTeam = {
  name: string;
  abbreviation: string;
  gameplanSummary?: {
    aggression: string | null;
    aiStrategyArchetype: string | null;
    defenseFocus: string | null;
    label: string;
    offenseFocus: string | null;
    summary: string;
  } | null;
  managerControlled?: boolean;
  overallRating?: number;
  score: number | null;
  stats: MatchTeamStats;
  schemes?: {
    offense?: {
      name: string;
    } | null;
    defense?: {
      name: string;
    } | null;
    specialTeams?: {
      name: string;
    } | null;
  };
  xFactorPlan?: {
    offense?: Partial<PreGameXFactorPlan> | null;
    defense?: Partial<PreGameXFactorPlan> | null;
  };
};

export type MatchReportLeader = {
  fullName: string;
  teamAbbreviation: string;
  positionCode: string;
  passingYards: number;
  rushingYards: number;
  receivingYards: number;
  tackles: number;
  sacks: number;
  interceptions: number;
  fieldGoalsMade: number;
  puntsInside20: number;
};

export type MatchReportDrive = {
  sequence: number;
  phaseLabel: string;
  offenseTeamAbbreviation: string;
  defenseTeamAbbreviation: string;
  startedScore: string;
  endedScore: string;
  plays: number;
  passAttempts: number;
  rushAttempts: number;
  totalYards: number;
  resultType: string;
  turnover: boolean;
  redZoneTrip: boolean;
  summary: string;
  pointsScored: number;
  primaryPlayerName: string | null;
  primaryDefenderName: string | null;
  engineDecisionSummary?: string | null;
  developerDebugAvailable?: boolean;
};

export type MatchReport = {
  status: string;
  stadiumName: string | null;
  summary: string;
  homeTeam: MatchReportTeam;
  awayTeam: MatchReportTeam;
  leaders: Record<string, MatchReportLeader | null>;
  drives: MatchReportDrive[];
};

export type BoxScoreRow = {
  label: string;
  home: number | string;
  away: number | string;
};

export type EngineDecisionInsight = {
  sequence: number;
  label: string;
  playCall: string;
  pressure: string;
  decisionTime: string;
  keyReasons: string[];
  sourceNote: string;
  developerDebugAvailable: boolean;
};

export type WhyGameFactor = {
  label: string;
  weight: number;
  winnerValue: string;
  loserValue: string;
  explanation: string;
};

export type WhyGameInsight = {
  label: string;
  explanation: string;
  tone: "positive" | "warning" | "default";
};

export type WhyGameOutcome = {
  title: string;
  verdict: string;
  perspective: "won" | "lost" | "neutral";
  winnerName: string | null;
  loserName: string | null;
  keyFactors: WhyGameFactor[];
  insights: WhyGameInsight[];
  emptyMessage: string;
};

export type MatchFeedbackItem = {
  label: string;
  tone?: "default" | "positive" | "warning";
  value: string;
  explanation: string;
};

export type MatchFeedbackState = {
  title: string;
  items: MatchFeedbackItem[];
  emptyMessage: string;
};

export type PostGameSummaryState = {
  title: string;
  result: string;
  insight: string;
  nextActionLabel: string;
  tone: "default" | "positive" | "warning";
  emptyMessage: string;
};

export type MoralVictoryState = {
  assessment: MoralVictoryAssessment | null;
  title: string;
  emptyMessage: string;
};

export type UnderdogObjectiveState = {
  assessment: UnderdogObjectiveAssessment | null;
  title: string;
  emptyMessage: string;
};

export type MatchupExplanationReason = {
  label: string;
  value: string;
  explanation: string;
  tone?: "default" | "positive" | "warning";
};

export type MatchupExplanationState = {
  title: string;
  expectationLabel: string;
  difficulty: string;
  ratingComparison: string;
  resultLabel: string;
  summary: string;
  reasons: MatchupExplanationReason[];
  emptyMessage: string;
};

export function formatRedZone(stats: MatchTeamStats) {
  return stats ? `${stats.redZoneTouchdowns}/${stats.redZoneTrips}` : "-";
}

export function buildBoxScoreRows(match: Pick<MatchReport, "homeTeam" | "awayTeam">): BoxScoreRow[] {
  const homeStats = match.homeTeam.stats;
  const awayStats = match.awayTeam.stats;

  return [
    { label: "First Downs", home: homeStats?.firstDowns ?? "-", away: awayStats?.firstDowns ?? "-" },
    { label: "Total Yards", home: homeStats?.totalYards ?? "-", away: awayStats?.totalYards ?? "-" },
    { label: "Passing Yards", home: homeStats?.passingYards ?? "-", away: awayStats?.passingYards ?? "-" },
    { label: "Rushing Yards", home: homeStats?.rushingYards ?? "-", away: awayStats?.rushingYards ?? "-" },
    { label: "Turnovers", home: homeStats?.turnovers ?? "-", away: awayStats?.turnovers ?? "-" },
    { label: "Explosive Plays", home: homeStats?.explosivePlays ?? "-", away: awayStats?.explosivePlays ?? "-" },
    { label: "Red Zone TD", home: formatRedZone(homeStats), away: formatRedZone(awayStats) },
  ];
}

export function buildScoreboardState(match: Pick<
  MatchReport,
  "homeTeam" | "awayTeam" | "status" | "summary"
>) {
  return {
    homeScore: match.homeTeam.score ?? "-",
    awayScore: match.awayTeam.score ?? "-",
    hasFinalScore: match.homeTeam.score != null && match.awayTeam.score != null,
    statusLabel: match.status.replaceAll("_", " "),
    summary: match.summary,
  };
}

export function buildTopPerformerCards(leaders: MatchReport["leaders"]) {
  return Object.entries(leaders).map(([category, leader]) => ({
    category,
    leader,
    isEmpty: !leader,
  }));
}

export function buildDriveLogState(drives: MatchReportDrive[]) {
  return {
    drives,
    hasDrives: drives.length > 0,
    hasEngineExplanations: drives.some((drive) => drive.plays > 0),
    emptyMessage:
      "Noch kein persistierter Drive-Log vorhanden. Bei abgeschlossenen oder laufenden Simulationen erscheinen die Drives hier automatisch.",
  };
}

function describePlayCall(drive: MatchReportDrive) {
  const passRatio = drive.passAttempts / Math.max(drive.plays, 1);
  const rushRatio = drive.rushAttempts / Math.max(drive.plays, 1);

  if (drive.passAttempts === 0 && drive.rushAttempts > 0) {
    return "Run Call: Die Offense blieb am Boden und wollte Uhr, Feldposition oder kurze Distanz kontrollieren.";
  }

  if (passRatio >= 0.62) {
    return "Pass Call: Der Drive war klar passlastig, die Offense suchte schnelle Yards oder musste aufholen.";
  }

  if (rushRatio >= 0.62) {
    return "Run Call: Der Drive war lauflastig, die Offense vertraute auf Ballkontrolle und Line-Blocking.";
  }

  return "Balanced Call: Die Offense mischte Lauf und Pass, um die Defense nicht eindeutig lesen zu lassen.";
}

function classifyDrivePressure(drive: MatchReportDrive) {
  const yardsPerPlay = drive.totalYards / Math.max(drive.plays, 1);
  const passRatio = drive.passAttempts / Math.max(drive.plays, 1);

  if (drive.turnover || drive.resultType === "TURNOVER_ON_DOWNS") {
    return "Hoch: Der Drive endete unter Fehlerdruck oder in einer kritischen Entscheidung.";
  }

  if (drive.resultType === "PUNT" && yardsPerPlay < 4) {
    return "Hoch: Die Defense zwang kurze Plays und beendete den Drive ohne Punkte.";
  }

  if (passRatio >= 0.6 && yardsPerPlay < 5) {
    return "Mittel bis hoch: Viele Passversuche, aber begrenzter Raumgewinn deuten auf Druck im Timing.";
  }

  if (drive.pointsScored > 0 || yardsPerPlay >= 6) {
    return "Niedrig: Die Offense blieb im Rhythmus und gewann genug Raum pro Play.";
  }

  return "Mittel: Die Defense setzte Grenzen, ohne den Drive komplett zu kippen.";
}

function describeDecisionTime(drive: MatchReportDrive) {
  const yardsPerPlay = drive.totalYards / Math.max(drive.plays, 1);
  const passRatio = drive.passAttempts / Math.max(drive.plays, 1);

  if (drive.passAttempts === 0) {
    return "Nicht zentral: Der Drive wurde ueber Laufspiel entschieden.";
  }

  if (drive.turnover || (passRatio >= 0.6 && yardsPerPlay < 4)) {
    return "Kurz: Der QB musste frueh reagieren; tiefe Konzepte waren schwer sauber zu entwickeln.";
  }

  if (yardsPerPlay >= 6 || drive.pointsScored > 0) {
    return "Ausreichend: Die Offense bekam genug Zeit fuer entwickelte Targets oder klare Entscheidungen.";
  }

  return "Normal: Kurze und mittlere Optionen waren realistischer als lange Entwicklungsrouten.";
}

function buildDriveKeyReasons(drive: MatchReportDrive) {
  const reasons: string[] = [];
  const yardsPerPlay = drive.totalYards / Math.max(drive.plays, 1);

  reasons.push(`${drive.passAttempts} Passes / ${drive.rushAttempts} Runs zeigen die Spielidee des Drives.`);

  if (drive.turnover) {
    reasons.push("Turnover: Ein Fehler hat den Drive sofort stark beeinflusst.");
  } else if (drive.pointsScored > 0) {
    reasons.push(`Scoring Drive: ${drive.pointsScored} Punkte bestaetigen, dass die Offense den Plan verwerten konnte.`);
  } else if (drive.resultType === "PUNT") {
    reasons.push("Punt: Die Defense gewann genug fruehe Downs, um den Drive zu stoppen.");
  } else if (drive.resultType === "FIELD_GOAL_MADE") {
    reasons.push("Field Goal: Die Offense kam in Reichweite, aber nicht sauber bis in die Endzone.");
  }

  if (drive.redZoneTrip && drive.pointsScored < 7) {
    reasons.push("Red Zone: Nahe der Endzone wurde das Feld enger, deshalb wurde der Drive schwerer zu finishen.");
  }

  if (yardsPerPlay >= 7) {
    reasons.push("Explosivitaet: Hoher Raumgewinn pro Play machte den Drive effizient.");
  } else if (yardsPerPlay < 3.5 && drive.plays >= 4) {
    reasons.push("Wenig Raumgewinn: Die Defense hielt den Drive lange vor den entscheidenden Zonen.");
  }

  if (drive.primaryPlayerName) {
    reasons.push(`Schluesselspieler Offense: ${drive.primaryPlayerName}.`);
  }

  if (drive.primaryDefenderName) {
    reasons.push(`Defensive Antwort: ${drive.primaryDefenderName}.`);
  }

  return reasons.slice(0, 5);
}

function buildDerivedEngineDecisionInsight(drive: MatchReportDrive): EngineDecisionInsight {
  return {
    sequence: drive.sequence,
    label: `${drive.offenseTeamAbbreviation} Drive ${drive.sequence}`,
    playCall: describePlayCall(drive),
    pressure: classifyDrivePressure(drive),
    decisionTime: describeDecisionTime(drive),
    keyReasons: buildDriveKeyReasons(drive),
    sourceNote:
      "Aus dem gespeicherten Drive-Verlauf abgeleitet: Play-Mix, Ergebnis, Punkte, Turnover, Red-Zone und Yards.",
    developerDebugAvailable: drive.developerDebugAvailable === true,
  };
}

export function buildEngineDecisionPanelState(drives: MatchReportDrive[]) {
  const explainedDrives = drives.filter((drive) => drive.plays > 0).map(buildDerivedEngineDecisionInsight);

  return {
    explainedDrives,
    hasExplanations: explainedDrives.length > 0,
    developerDebugAvailable: explainedDrives.some((drive) => drive.developerDebugAvailable),
    emptyMessage:
      "Noch keine Engine-Erklaerungen fuer diesen Spielbericht vorhanden. Sobald Drives gespeichert sind, erscheinen Play Call, Pressure, Decision Time und Key Reasons.",
  };
}

function formatTeamPlan(team: MatchReportTeam) {
  if (team.gameplanSummary?.summary) {
    return team.gameplanSummary.summary;
  }

  const offense = summarizeOffenseXFactor(team.xFactorPlan?.offense);
  const defense = summarizeDefenseXFactor(team.xFactorPlan?.defense);
  const notes = [offense, defense].filter(Boolean).join(" ");

  if (!notes) {
    return "AI-/Gameplan-Zusammenfassung nicht verfuegbar.";
  }

  return notes;
}

function buildScoreFeedback(match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">) {
  if (
    match.status !== "COMPLETED" ||
    match.homeTeam.score == null ||
    match.awayTeam.score == null
  ) {
    return null;
  }

  const margin = Math.abs(match.homeTeam.score - match.awayTeam.score);

  return {
    label: "Match-Ergebnis",
    value: `${match.homeTeam.abbreviation} ${match.homeTeam.score} - ${match.awayTeam.score} ${match.awayTeam.abbreviation}`,
    explanation:
      margin >= 21
        ? "Deutlicher Ausschlag: Scoreboard und Drive-Verlauf sollten Blowout-, Turnover- oder Red-Zone-Faktoren zeigen."
        : margin <= 7
          ? "Enges Spiel: einzelne Drives, Turnovers und Red-Zone-Entscheidungen waren wahrscheinlich entscheidend."
          : "Kontrollierter Abstand: das bessere Team hat Vorteile aufgebaut, ohne dass das Spiel komplett gekippt ist.",
  };
}

function buildTeamConditionFeedback(team: MatchReportTeam) {
  if (!team.stats) {
    return {
      label: `${team.abbreviation} Verfassung`,
      value: "Noch keine Teamwerte",
      explanation:
        "Fatigue, Recovery und Injuries werden nach Simulation und Wochenwechsel sichtbar, sobald belastbare Stats vorhanden sind.",
    };
  }

  return {
    label: `${team.abbreviation} Wirkung`,
    value: `${team.stats.totalYards} Yards, ${team.stats.turnovers} Turnover`,
    explanation:
      "Yards, Turnovers und Explosive Plays zeigen, ob Ratings, Gameplan, Fatigue oder Verletzungen in der Performance sichtbar wurden.",
  };
}

function getManagerMatchup(match: Pick<MatchReport, "homeTeam" | "awayTeam">) {
  const managerTeam = match.homeTeam.managerControlled
    ? match.homeTeam
    : match.awayTeam.managerControlled
      ? match.awayTeam
      : null;

  if (!managerTeam) {
    return null;
  }

  return {
    managerTeam,
    opponent: managerTeam === match.homeTeam ? match.awayTeam : match.homeTeam,
  };
}

export function buildPostGameSummaryState(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">,
): PostGameSummaryState {
  if (
    match.status !== "COMPLETED" ||
    match.homeTeam.score == null ||
    match.awayTeam.score == null
  ) {
    return {
      title: "Match Result Summary",
      result: "Noch kein finales Ergebnis",
      insight: "Die kompakte Auswertung erscheint, sobald das Spiel abgeschlossen ist.",
      nextActionLabel: "Setup pruefen",
      tone: "default",
      emptyMessage: "Noch keine finale Auswertung verfuegbar.",
    };
  }

  const matchup = getManagerMatchup(match);
  const managerTeam = matchup?.managerTeam ?? match.homeTeam;
  const opponent = matchup?.opponent ?? match.awayTeam;
  const managerScore = managerTeam.score ?? 0;
  const opponentScore = opponent.score ?? 0;
  const margin = managerScore - opponentScore;
  const absoluteMargin = Math.abs(margin);
  const result =
    matchup && margin > 0
      ? `Gewonnen ${managerScore}:${opponentScore}`
      : matchup && margin < 0
        ? `Verloren ${managerScore}:${opponentScore}`
        : matchup
          ? `Unentschieden ${managerScore}:${opponentScore}`
          : `${match.homeTeam.abbreviation} ${match.homeTeam.score} - ${match.awayTeam.score} ${match.awayTeam.abbreviation}`;

  let insight = "Pruefe Depth Chart, Rollen und die naechste beste Aktion fuer die kommende Woche.";

  if (!matchup) {
    insight = "Finaler Score ist verfuegbar; fuer Team-Erkenntnisse fehlt ein Manager-Team.";
  } else if (margin > 0) {
    insight = "Sieg: Aufstellung und Gameplan haben genug Vorteile erzeugt.";
  } else if (absoluteMargin <= 7) {
    insight = "Enges Spiel: einzelne Drives, Turnovers und Red-Zone-Situationen waren entscheidend.";
  } else if (!managerTeam.stats || !opponent.stats) {
    insight = "Die wichtigsten Team-Details fehlen; nutze den Dashboard-Status als naechsten Schritt.";
  } else if (managerTeam.stats.turnovers > opponent.stats.turnovers) {
    insight = "Ballverluste waren der groesste Hebel fuer die naechste Woche.";
  } else if (managerTeam.stats.totalYards + 40 < opponent.stats.totalYards) {
    insight = "Der Gegner erzeugte deutlich mehr Raumgewinn; pruefe Starter und Matchups.";
  }

  return {
    title: "Match Result Summary",
    result,
    insight,
    nextActionLabel: "Naechste Aktion pruefen",
    tone: matchup && margin > 0 ? "positive" : matchup && margin < 0 ? "warning" : "default",
    emptyMessage: "Noch keine finale Auswertung verfuegbar.",
  };
}

export function buildMoralVictoryState(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">,
): MoralVictoryState {
  const matchup = getManagerMatchup(match);

  if (!matchup) {
    return {
      assessment: null,
      title: "Moral Victories",
      emptyMessage: "Kein managerkontrolliertes Team im Report markiert.",
    };
  }

  const { managerTeam, opponent } = matchup;

  return {
    assessment: evaluateMoralVictory({
      opponentName: opponent.name,
      opponentRating: opponent.overallRating,
      opponentScore: opponent.score,
      opponentTurnovers: opponent.stats?.turnovers,
      teamName: managerTeam.name,
      teamRating: managerTeam.overallRating,
      teamScore: managerTeam.score,
      teamTurnovers: managerTeam.stats?.turnovers,
    }),
    title: "Moral Victories",
    emptyMessage: "Moral-Victory-Auswertung erscheint, sobald Matchup und Ergebnis verfuegbar sind.",
  };
}

export function buildUnderdogObjectiveState(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">,
): UnderdogObjectiveState {
  const matchup = getManagerMatchup(match);

  if (!matchup) {
    return {
      assessment: null,
      title: "Underdog Objectives",
      emptyMessage: "Kein managerkontrolliertes Team im Report markiert.",
    };
  }

  const { managerTeam, opponent } = matchup;

  return {
    assessment: evaluateUnderdogObjectives({
      opponentName: opponent.name,
      opponentRating: opponent.overallRating,
      opponentScore: opponent.score,
      opponentTurnovers: opponent.stats?.turnovers,
      teamName: managerTeam.name,
      teamRating: managerTeam.overallRating,
      teamScore: managerTeam.score,
      teamTurnovers: managerTeam.stats?.turnovers,
    }),
    title: "Underdog Objectives",
    emptyMessage: "Underdog Objectives erscheinen nur fuer Underdog- oder Heavy-Underdog-Matchups.",
  };
}

function formatRating(value: number | undefined) {
  return typeof value === "number" ? String(value) : "n/a";
}

function describeDifficulty(category: string) {
  if (category === "heavy underdog") {
    return "Sehr schwer";
  }

  if (category === "underdog") {
    return "Schwer";
  }

  if (category === "favorite") {
    return "Vorteil erwartet";
  }

  return "Ausgeglichen";
}

function buildResultLabel(assessment: MoralVictoryAssessment) {
  if (assessment.status === "upset") {
    return "Klar ueber Erwartung";
  }

  if (assessment.status === "moral victory") {
    return "Ueber Erwartung";
  }

  if (assessment.status === "missed opportunity") {
    return "Unter Erwartung";
  }

  return "Im Rahmen der Erwartung";
}

function buildTurnoverExplanation(managerTeam: MatchReportTeam, opponent: MatchReportTeam): MatchupExplanationReason | null {
  if (!managerTeam.stats || !opponent.stats) {
    return null;
  }

  const diff = managerTeam.stats.turnovers - opponent.stats.turnovers;

  if (diff < 0) {
    return {
      label: "Turnovers",
      tone: "positive",
      value: `${managerTeam.stats.turnovers}:${opponent.stats.turnovers}`,
      explanation: "Dein Team schuetzte den Ball besser als der Gegner und bekam dadurch stabilere Drives.",
    };
  }

  if (diff > 0) {
    return {
      label: "Turnovers",
      tone: "warning",
      value: `${managerTeam.stats.turnovers}:${opponent.stats.turnovers}`,
      explanation: "Ballverluste haben das Ergebnis belastet und dem Gegner zusaetzliche Chancen gegeben.",
    };
  }

  return {
    label: "Turnovers",
    value: `${managerTeam.stats.turnovers}:${opponent.stats.turnovers}`,
    explanation: "Die Turnover-Bilanz war ausgeglichen; andere Faktoren haben staerker entschieden.",
  };
}

function buildProductionExplanation(managerTeam: MatchReportTeam, opponent: MatchReportTeam): MatchupExplanationReason | null {
  if (!managerTeam.stats || !opponent.stats) {
    return null;
  }

  const yardDiff = managerTeam.stats.totalYards - opponent.stats.totalYards;
  const explosiveDiff = managerTeam.stats.explosivePlays - opponent.stats.explosivePlays;
  const strongPositive = yardDiff >= 40 || explosiveDiff >= 2;
  const strongNegative = yardDiff <= -40 || explosiveDiff <= -2;

  return {
    label: "On-Field Wirkung",
    tone: strongPositive ? "positive" : strongNegative ? "warning" : "default",
    value: `${managerTeam.stats.totalYards}:${opponent.stats.totalYards} Yards`,
    explanation:
      strongPositive
        ? "Yards und explosive Plays zeigen, dass dein Plan genug Raumgewinn erzeugt hat."
        : strongNegative
          ? "Der Gegner gewann zu viele direkte Matchups und erzeugte mehr Raum oder explosive Plays."
          : "Die Produktionswerte lagen nah beieinander; einzelne Drives und Red-Zone-Situationen waren wichtiger.",
  };
}

function buildGameplanExplanation(managerTeam: MatchReportTeam, opponent: MatchReportTeam): MatchupExplanationReason {
  return {
    label: "Gameplan / AI",
    value: managerTeam.abbreviation,
    explanation: `${formatTeamPlan(managerTeam)} Gegner: ${formatTeamPlan(opponent)}`,
  };
}

export function buildMatchupExplanationState(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">,
): MatchupExplanationState {
  const matchup = getManagerMatchup(match);

  if (!matchup) {
    return {
      title: "Matchup Expectation",
      expectationLabel: "Nicht verfuegbar",
      difficulty: "Unbekannt",
      ratingComparison: "n/a",
      resultLabel: "Nicht verfuegbar",
      summary: "Kein managerkontrolliertes Team im Report markiert.",
      reasons: [],
      emptyMessage: "Matchup-Erklaerung ist nur fuer das eigene Team verfuegbar.",
    };
  }

  const { managerTeam, opponent } = matchup;
  const moralState = buildMoralVictoryState(match);
  const assessment = moralState.assessment;

  if (!assessment) {
    return {
      title: "Matchup Expectation",
      expectationLabel: "Nicht verfuegbar",
      difficulty: "Unbekannt",
      ratingComparison: `${managerTeam.abbreviation} ${formatRating(managerTeam.overallRating)} - ${opponent.abbreviation} ${formatRating(opponent.overallRating)}`,
      resultLabel: "Nicht verfuegbar",
      summary: "Nicht genug Daten fuer eine faire Matchup-Erklaerung.",
      reasons: [],
      emptyMessage: "Matchup-Erklaerung ist noch nicht verfuegbar.",
    };
  }

  const completed =
    match.status === "COMPLETED" &&
    managerTeam.score != null &&
    opponent.score != null;
  const scoreDiff = completed ? managerTeam.score! - opponent.score! : null;
  const matchupReason: MatchupExplanationReason = {
    label: "Rating / Matchup",
    value: `${managerTeam.abbreviation} ${formatRating(managerTeam.overallRating)} - ${opponent.abbreviation} ${formatRating(opponent.overallRating)}`,
    explanation: assessment.expectation.summary,
    tone:
      assessment.expectation.category === "favorite"
        ? "positive"
        : assessment.expectation.category === "heavy underdog"
          ? "warning"
          : "default",
  };
  const resultReason: MatchupExplanationReason = {
    label: "Ergebnis vs Erwartung",
    tone:
      assessment.status === "upset" || assessment.status === "moral victory"
        ? "positive"
        : assessment.status === "missed opportunity"
          ? "warning"
          : "default",
    value: completed ? `${managerTeam.score}:${opponent.score}` : "Noch offen",
    explanation: completed
      ? assessment.summary
      : "Vor dem Spiel zeigt diese Sektion die Erwartung; nach dem Spiel wird sie mit dem Ergebnis verglichen.",
  };
  const reasons = [
    matchupReason,
    resultReason,
    buildTurnoverExplanation(managerTeam, opponent),
    buildProductionExplanation(managerTeam, opponent),
    buildGameplanExplanation(managerTeam, opponent),
  ].filter((reason): reason is MatchupExplanationReason => reason !== null).slice(0, 5);

  return {
    title: "Matchup Expectation",
    expectationLabel: assessment.expectation.category,
    difficulty: describeDifficulty(assessment.expectation.category),
    ratingComparison: `${managerTeam.abbreviation} ${formatRating(managerTeam.overallRating)} - ${opponent.abbreviation} ${formatRating(opponent.overallRating)}`,
    resultLabel: completed ? buildResultLabel(assessment) : "Noch nicht gespielt",
    summary: completed
      ? scoreDiff! > 0
        ? `${managerTeam.name} gewann mit ${scoreDiff} Punkt(en). ${assessment.summary}`
        : scoreDiff === 0
          ? `${managerTeam.name} spielte unentschieden. ${assessment.summary}`
          : `${managerTeam.name} verlor mit ${Math.abs(scoreDiff!)} Punkt(en). ${assessment.summary}`
      : assessment.expectation.summary,
    reasons,
    emptyMessage: "Noch nicht genug Daten fuer eine Matchup-Erklaerung.",
  };
}

function buildMoralVictoryFeedback(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">,
): MatchFeedbackItem | null {
  const state = buildMoralVictoryState(match);

  if (!state.assessment) {
    return null;
  }

  const { assessment } = state;
  const reward =
    assessment.moraleDelta > 0 || assessment.progressionXpBonus > 0
      ? ` Leichter Reward-Hinweis: +${assessment.moraleDelta} Morale, +${assessment.progressionXpBonus} Development XP.`
      : " Kein Reward-Hinweis, weil Ergebnis und Teilziele nicht ueber Erwartung lagen.";

  return {
    label: assessment.status === "upset" ? "Upset" : "Moral Victory",
    tone:
      assessment.status === "upset" || assessment.status === "moral victory"
        ? "positive"
        : assessment.status === "missed opportunity"
          ? "warning"
          : "default",
    value: assessment.expectation.category,
    explanation: `${assessment.expectation.summary} ${assessment.summary}${reward}`,
  };
}

function buildUnderdogObjectiveFeedback(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">,
): MatchFeedbackItem | null {
  const state = buildUnderdogObjectiveState(match);

  if (!state.assessment || state.assessment.objectives.length === 0) {
    return null;
  }

  const fulfilled = state.assessment.objectives.filter((objective) => objective.status === "fulfilled").length;
  const partial = state.assessment.objectives.filter((objective) => objective.status === "partial").length;

  return {
    label: "Underdog Objectives",
    tone: state.assessment.rebuildSignal ? "positive" : fulfilled > 0 || partial > 0 ? "default" : "warning",
    value: `${fulfilled}/${state.assessment.objectives.length}`,
    explanation: `${state.assessment.summary} Leichter Signal-Hinweis: +${state.assessment.moraleSignal} Morale, +${state.assessment.progressionSignal} Development XP; AP35 Rebuild-Signal: ${state.assessment.rebuildSignal ? "ja" : "nein"}.`,
  };
}

export function buildMatchFeedbackState(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status" | "drives">,
): MatchFeedbackState {
  const scoreFeedback = buildScoreFeedback(match);
  const moralVictoryFeedback = buildMoralVictoryFeedback(match);
  const underdogObjectiveFeedback = buildUnderdogObjectiveFeedback(match);
  const managerTeam = match.homeTeam.managerControlled ? match.homeTeam : match.awayTeam.managerControlled ? match.awayTeam : null;
  const cpuTeam = managerTeam
    ? managerTeam === match.homeTeam ? match.awayTeam : match.homeTeam
    : match.awayTeam;
  const items: MatchFeedbackItem[] = [
    ...(scoreFeedback ? [scoreFeedback] : []),
    ...(moralVictoryFeedback ? [moralVictoryFeedback] : []),
    ...(underdogObjectiveFeedback ? [underdogObjectiveFeedback] : []),
    {
      label: managerTeam ? "Dein Gameplan" : "Gameplan",
      value: managerTeam ? managerTeam.abbreviation : "Neutral",
      explanation: managerTeam
        ? formatTeamPlan(managerTeam)
        : "Kein managerkontrolliertes Team im Report markiert.",
    },
    {
      label: "AI/Gameplan",
      value: cpuTeam.abbreviation,
      explanation: formatTeamPlan(cpuTeam),
    },
    buildTeamConditionFeedback(match.homeTeam),
    buildTeamConditionFeedback(match.awayTeam),
    {
      label: "Drive-Erklaerung",
      value: `${match.drives.length} Drives`,
      explanation:
        match.drives.length > 0
          ? "Drive-Log und Warum-ist-es-passiert-Panel leiten Play-Mix, Druck, Decision Time und Key Reasons aus den gespeicherten Drives ab."
          : "Noch keine Drives vorhanden; der Report bleibt deshalb bewusst knapp.",
    },
  ];

  return {
    title: "Feedback Summary",
    items,
    emptyMessage:
      "Noch nicht genug Daten fuer Feedback vorhanden. Nach dem Spiel erscheinen Gameplan, Ergebnis, Drives und Teamwirkung.",
  };
}

function redZoneRate(stats: MatchTeamStats) {
  if (!stats || stats.redZoneTrips === 0) {
    return 0;
  }

  return stats.redZoneTouchdowns / stats.redZoneTrips;
}

function scoringDrivesForTeam(drives: MatchReportDrive[], abbreviation: string) {
  return drives.filter(
    (drive) => drive.offenseTeamAbbreviation === abbreviation && drive.pointsScored > 0,
  ).length;
}

function emptyDrivesForTeam(drives: MatchReportDrive[], abbreviation: string) {
  return drives.filter(
    (drive) =>
      drive.offenseTeamAbbreviation === abbreviation &&
      drive.pointsScored === 0 &&
      !drive.turnover,
  ).length;
}

function pressureStopsForTeam(drives: MatchReportDrive[], defenseAbbreviation: string) {
  return drives.filter(
    (drive) =>
      drive.defenseTeamAbbreviation === defenseAbbreviation &&
      (drive.turnover ||
        drive.resultType === "PUNT" ||
        drive.resultType === "TURNOVER_ON_DOWNS" ||
        drive.resultType === "SAFETY"),
  ).length;
}

function driveTurnoversForTeam(drives: MatchReportDrive[], offenseAbbreviation: string) {
  return drives.filter(
    (drive) => drive.offenseTeamAbbreviation === offenseAbbreviation && drive.turnover,
  ).length;
}

function selectWinner(match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">) {
  if (
    match.status !== "COMPLETED" ||
    match.homeTeam.score == null ||
    match.awayTeam.score == null ||
    match.homeTeam.score === match.awayTeam.score
  ) {
    return null;
  }

  const homeWon = match.homeTeam.score > match.awayTeam.score;

  return {
    winner: homeWon ? match.homeTeam : match.awayTeam,
    loser: homeWon ? match.awayTeam : match.homeTeam,
  };
}

function buildTurnoverFactor(
  winner: MatchReportTeam,
  loser: MatchReportTeam,
  drives: MatchReportDrive[],
): WhyGameFactor | null {
  const winnerTurnovers = winner.stats?.turnovers ?? driveTurnoversForTeam(drives, winner.abbreviation);
  const loserTurnovers = loser.stats?.turnovers ?? driveTurnoversForTeam(drives, loser.abbreviation);
  const margin = loserTurnovers - winnerTurnovers;

  if (margin <= 0) {
    return null;
  }

  return {
    label: "Turnovers",
    weight: Math.min(25, 12 + margin * 6),
    winnerValue: `${winnerTurnovers}`,
    loserValue: `${loserTurnovers}`,
    explanation:
      margin >= 2
        ? `${winner.name} bekam mehrere zusaetzliche Chancen, weil ${loser.name} den Ball zu oft verlor.`
        : `${winner.name} schuetzte den Ball etwas besser und vermied den teuren Fehler.`
  };
}

function buildRedZoneFactor(winner: MatchReportTeam, loser: MatchReportTeam): WhyGameFactor | null {
  if (!winner.stats || !loser.stats || (winner.stats.redZoneTrips === 0 && loser.stats.redZoneTrips === 0)) {
    return null;
  }

  const winnerRate = redZoneRate(winner.stats);
  const loserRate = redZoneRate(loser.stats);
  const rateGap = winnerRate - loserRate;

  if (rateGap <= 0 && winner.stats.redZoneTouchdowns <= loser.stats.redZoneTouchdowns) {
    return null;
  }

  return {
    label: "Red Zone",
    weight: Math.min(20, 10 + Math.max(rateGap, 0) * 12),
    winnerValue: `${winner.stats.redZoneTouchdowns}/${winner.stats.redZoneTrips}`,
    loserValue: `${loser.stats.redZoneTouchdowns}/${loser.stats.redZoneTrips}`,
    explanation: `${winner.name} verwandelte mehr gute Feldpositionen in Touchdowns statt nur in leere Drives oder Field Goals.`,
  };
}

function buildMatchupFactor(winner: MatchReportTeam, loser: MatchReportTeam): WhyGameFactor | null {
  if (!winner.stats || !loser.stats) {
    return null;
  }

  const yardGap = winner.stats.totalYards - loser.stats.totalYards;
  const explosiveGap = winner.stats.explosivePlays - loser.stats.explosivePlays;
  const ratingGap =
    winner.overallRating != null && loser.overallRating != null
      ? winner.overallRating - loser.overallRating
      : 0;

  if (yardGap < 35 && explosiveGap <= 0 && ratingGap <= 0) {
    return null;
  }

  const ratingText =
    winner.overallRating != null && loser.overallRating != null
      ? ` Ratings ${winner.overallRating}:${loser.overallRating}.`
      : "";

  return {
    label: "Ratings & Matchups",
    weight: Math.min(20, 8 + Math.max(yardGap, 0) / 25 + Math.max(explosiveGap, 0) * 2),
    winnerValue: `${winner.stats.totalYards} Yards, ${winner.stats.explosivePlays} Big Plays`,
    loserValue: `${loser.stats.totalYards} Yards, ${loser.stats.explosivePlays} Big Plays`,
    explanation: `${winner.name} gewann genug direkte Duelle, um mehr Raum und mehr explosive Plays zu erzeugen.${ratingText}`,
  };
}

function buildPressureFactor(
  winner: MatchReportTeam,
  loser: MatchReportTeam,
  drives: MatchReportDrive[],
): WhyGameFactor | null {
  if (drives.length === 0) {
    return null;
  }

  const winnerStops = pressureStopsForTeam(drives, winner.abbreviation);
  const loserStops = pressureStopsForTeam(drives, loser.abbreviation);
  const stopGap = winnerStops - loserStops;

  if (stopGap <= 0) {
    return null;
  }

  return {
    label: "Pressure & Drive Stops",
    weight: Math.min(15, 7 + stopGap * 2),
    winnerValue: `${winnerStops} Stops`,
    loserValue: `${loserStops} Stops`,
    explanation: `${winner.name} beendete mehr gegnerische Drives durch Druck, Stops oder erzwungene Fehler.`,
  };
}

function buildGameplanFactor(
  winner: MatchReportTeam,
  loser: MatchReportTeam,
  drives: MatchReportDrive[],
): WhyGameFactor | null {
  if (drives.length === 0) {
    return null;
  }

  const winnerScoringDrives = scoringDrivesForTeam(drives, winner.abbreviation);
  const loserEmptyDrives = emptyDrivesForTeam(drives, loser.abbreviation);
  const winnerScheme = winner.schemes?.offense?.name ?? "Gameplan";
  const winnerOffensePlan = summarizeOffenseXFactor(winner.xFactorPlan?.offense);
  const winnerDefensePlan = summarizeDefenseXFactor(winner.xFactorPlan?.defense);
  const planText =
    winner.gameplanSummary?.summary ??
    [winnerOffensePlan, winnerDefensePlan].filter(Boolean).join(" ");

  if (winnerScoringDrives === 0 && loserEmptyDrives < 2) {
    return null;
  }

  return {
    label: "Gameplan & X-Factor",
    weight: planText ? 14 : 10,
    winnerValue: `${winnerScoringDrives} Scoring Drives`,
    loserValue: `${loserEmptyDrives} leere Drives`,
    explanation: `${winner.name} bekam aus dem ${winnerScheme} genug verwertbare Drives, waehrend ${loser.name} zu oft ohne Punkte blieb.${planText ? ` ${planText}` : ""}`,
  };
}

function summarizeOffenseXFactor(plan: Partial<PreGameXFactorPlan> | null | undefined) {
  if (!plan) {
    return "";
  }

  const notes: string[] = [];

  if (plan.offensiveFocus && plan.offensiveFocus !== "BALANCED") {
    notes.push(`Offense-Fokus ${formatPlanValue(plan.offensiveFocus)}`);
  }

  if (plan.protectionPlan && plan.protectionPlan !== "STANDARD") {
    notes.push(`Protection ${formatPlanValue(plan.protectionPlan)}`);
  }

  if (plan.offensiveMatchupFocus && plan.offensiveMatchupFocus !== "BALANCED") {
    notes.push(`Matchup ${formatPlanValue(plan.offensiveMatchupFocus)}`);
  }

  if (notes.length === 0) {
    return "";
  }

  return `Manager-Entscheidung: ${notes.slice(0, 2).join(", ")}.`;
}

function summarizeDefenseXFactor(plan: Partial<PreGameXFactorPlan> | null | undefined) {
  if (!plan) {
    return "";
  }

  const notes: string[] = [];

  if (plan.defensiveFocus && plan.defensiveFocus !== "BALANCED") {
    notes.push(`Defense-Fokus ${formatPlanValue(plan.defensiveFocus)}`);
  }

  if (plan.defensiveMatchupFocus && plan.defensiveMatchupFocus !== "BALANCED") {
    notes.push(`Matchup ${formatPlanValue(plan.defensiveMatchupFocus)}`);
  }

  if (plan.turnoverPlan && plan.turnoverPlan !== "BALANCED") {
    notes.push(`Takeaways ${formatPlanValue(plan.turnoverPlan)}`);
  }

  if (notes.length === 0) {
    return "";
  }

  return `Defensiver Plan: ${notes.slice(0, 2).join(", ")}.`;
}

function formatPlanValue(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function fallbackFactor(winner: MatchReportTeam, loser: MatchReportTeam): WhyGameFactor {
  const scoreGap = (winner.score ?? 0) - (loser.score ?? 0);

  return {
    label: "Scoreboard",
    weight: 10,
    winnerValue: `${winner.score ?? "-"}`,
    loserValue: `${loser.score ?? "-"}`,
    explanation: `${winner.name} gewann die entscheidenden Situationen und setzte sich mit ${scoreGap} Punkt(en) Abstand durch.`,
  };
}

function normalizeFactors(factors: WhyGameFactor[]) {
  return [...factors]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 5)
    .map((factor) => ({
      ...factor,
      weight: Math.round(factor.weight),
    }));
}

function insightForFactor(
  factor: WhyGameFactor,
  perspective: WhyGameOutcome["perspective"],
): WhyGameInsight {
  const won = perspective === "won";
  const lost = perspective === "lost";
  const tone: WhyGameInsight["tone"] = won ? "positive" : lost ? "warning" : "default";

  if (factor.label === "Turnovers") {
    return {
      label: won ? "Ball gesichert" : lost ? "Ballverluste zu teuer" : "Turnovers entschieden",
      explanation: won
        ? "Dein Team machte weniger teure Fehler und bekam stabilere Drives."
        : lost
          ? "Der Gegner bekam durch Ballverluste zu viele Zusatzchancen."
          : "Ballverluste verschoben die Chancen im Spiel.",
      tone,
    };
  }

  if (factor.label === "Red Zone") {
    return {
      label: won ? "Offense effizient" : lost ? "Offense ineffizient" : "Red Zone entschied",
      explanation: won
        ? "Gute Feldpositionen wurden haeufiger in Punkte verwandelt."
        : lost
          ? "Zu viele gute Feldpositionen brachten nicht genug Punkte."
          : "Red-Zone-Situationen hatten grossen Einfluss auf das Ergebnis.",
      tone,
    };
  }

  if (factor.label === "Ratings & Matchups") {
    return {
      label: won ? "Matchup gewonnen" : lost ? "Matchup verloren" : "Matchup-Vorteil",
      explanation: won
        ? "Dein Team gewann genug direkte Duelle fuer Raumgewinn und Big Plays."
        : lost
          ? "Der Gegner gewann zu viele direkte Duelle und erzeugte mehr Wirkung."
          : "Direkte Matchups gaben dem Sieger den groesseren Vorteil.",
      tone,
    };
  }

  if (factor.label === "Pressure & Drive Stops") {
    return {
      label: won ? "Defense staerker" : lost ? "Defense ohne genug Stops" : "Defense entschied",
      explanation: won
        ? "Die Defense stoppte mehr Drives und nahm dem Gegner Rhythmus."
        : lost
          ? "Der Gegner bekam zu viele Drives ohne klare Stops."
          : "Defensive Stops waren ein sichtbarer Unterschied.",
      tone,
    };
  }

  if (factor.label === "Gameplan & X-Factor") {
    return {
      label: won ? "Gameplan griff" : lost ? "Gameplan griff beim Gegner" : "Gameplan wirkte",
      explanation: won
        ? "Der Plan erzeugte genug verwertbare Drives."
        : lost
          ? "Der Gegner bekam mehr aus seinem Plan heraus."
          : "Der Spielplan beeinflusste die entscheidenden Drives.",
      tone,
    };
  }

  return {
    label: won ? "Entscheidende Situationen gewonnen" : lost ? "Entscheidende Situationen verloren" : "Entscheidende Situationen",
    explanation: won
      ? "Dein Team war in den wichtigsten Momenten stabiler."
      : lost
        ? "Der Gegner war in den wichtigsten Momenten stabiler."
        : "Die wichtigsten Momente kippten den Spielausgang.",
    tone,
  };
}

function buildSimpleInsights(
  keyFactors: WhyGameFactor[],
  perspective: WhyGameOutcome["perspective"],
): WhyGameInsight[] {
  return keyFactors.slice(0, 3).map((factor) => insightForFactor(factor, perspective));
}

export function buildWhyGameOutcomeState(
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status" | "drives">,
): WhyGameOutcome {
  const result = selectWinner(match);
  const emptyMessage =
    "Warum Sieg oder Niederlage entstanden ist, erscheint nach dem finalen Ergebnis mit BoxScore und Drives.";

  if (!result) {
    return {
      title: "Why you won/lost",
      verdict: "Noch kein finales Ergebnis fuer eine faire Ursachenanalyse.",
      perspective: "neutral",
      winnerName: null,
      loserName: null,
      keyFactors: [],
      insights: [],
      emptyMessage,
    };
  }

  const { winner, loser } = result;
  const perspective = winner.managerControlled ? "won" : loser.managerControlled ? "lost" : "neutral";
  const factors = normalizeFactors(
    [
      buildTurnoverFactor(winner, loser, match.drives),
      buildRedZoneFactor(winner, loser),
      buildMatchupFactor(winner, loser),
      buildPressureFactor(winner, loser, match.drives),
      buildGameplanFactor(winner, loser, match.drives),
    ].filter((factor): factor is WhyGameFactor => factor !== null),
  );
  const keyFactors = factors.length > 0 ? factors : [fallbackFactor(winner, loser)];
  const perspectiveText =
    perspective === "won"
      ? "Du hast gewonnen"
      : perspective === "lost"
        ? "Du hast verloren"
        : `${winner.name} hat gewonnen`;
  const topReason = keyFactors[0]?.label ?? "entscheidende Situationen";

  return {
    title: "Why you won/lost",
    verdict: `${perspectiveText}: ${topReason} war der wichtigste Faktor.`,
    perspective,
    winnerName: winner.name,
    loserName: loser.name,
    keyFactors,
    insights: buildSimpleInsights(keyFactors, perspective),
    emptyMessage,
  };
}
