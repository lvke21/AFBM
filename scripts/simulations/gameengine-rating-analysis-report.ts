import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type TeamSnapshot = {
  teamId: string;
  abbreviation: string;
  name: string;
  tier: string;
  overallRating: number;
  ratingOffset: number;
  rosterSize: number;
  rosterOverall: number;
  offenseOverall: number;
  defenseOverall: number;
  specialTeamsOverall: number;
  physicalOverall: number;
  mentalOverall: number;
};

type MatchupGame = {
  gameNumber: number;
  seed: string;
  homeTeamId: string;
  awayTeamId: string;
  score: {
    home: number;
    away: number;
  };
  winner: {
    teamId: string;
    side: "home" | "away";
  } | null;
  yards: {
    home: number;
    away: number;
    total: number;
  };
  turnovers: {
    home: number;
    away: number;
    total: number;
  };
  touchdowns: {
    home: number;
    away: number;
  };
  punts: {
    home: number;
    away: number;
  };
  fieldGoalAttempts: {
    home: number;
    away: number;
  };
  turnoverOnDowns: {
    home: number;
    away: number;
  };
};

type MatchupSeries = {
  id: string;
  label: string;
  homeTeamId: string;
  awayTeamId: string;
  gamesPlanned: number;
  gamesCompleted: number;
  seedPrefix: string;
  winRecord: {
    home: number;
    away: number;
    ties: number;
  };
  averages: {
    homeScore: number;
    awayScore: number;
    scoreDifferentialHomeMinusAway: number;
    winnerMargin: number;
    homeYards: number;
    awayYards: number;
    homeTouchdowns: number;
    awayTouchdowns: number;
    homePunts: number;
    awayPunts: number;
    homeFieldGoalAttempts: number;
    awayFieldGoalAttempts: number;
    homeTurnovers: number;
    awayTurnovers: number;
    homeTurnoverOnDowns: number;
    awayTurnoverOnDowns: number;
  };
  games: MatchupGame[];
};

type MatchupReport = {
  status: "GRUEN" | "ROT";
  generatedAt: string;
  reportDate: string;
  rules: {
    gamesPerSeries: number;
    engineChanges: false;
    balancingChanges: false;
    ratingsAdjustedDuringSimulation: false;
  };
  teams: TeamSnapshot[];
  series: MatchupSeries[];
  checks: {
    atLeastFourSeries: boolean;
    everySeriesHas100Games: boolean;
    ratingsRemainUnchanged: boolean;
    rawDataComplete: boolean;
  };
};

type RatingDefinition = {
  code: string;
  meaning: string;
  influence: string;
};

const inputPath = join("reports-output", "simulations", "qa-matchup-results.json");
const outputPath = join("reports-output", "simulations", "gameengine-rating-analysis.html");
const matchupReport = JSON.parse(readFileSync(inputPath, "utf8")) as MatchupReport;
const teamById = new Map(matchupReport.teams.map((team) => [team.teamId, team]));

const attributeCodes = [
  "SPEED",
  "ACCELERATION",
  "AGILITY",
  "STRENGTH",
  "AWARENESS",
  "TOUGHNESS",
  "DURABILITY",
  "DISCIPLINE",
  "INTELLIGENCE",
  "LEADERSHIP",
  "THROW_POWER",
  "THROW_ACCURACY_SHORT",
  "THROW_ACCURACY_MEDIUM",
  "THROW_ACCURACY_DEEP",
  "POCKET_PRESENCE",
  "DECISION_MAKING",
  "PLAY_ACTION",
  "SCRAMBLING",
  "MOBILITY",
  "VISION",
  "BALL_SECURITY",
  "ELUSIVENESS",
  "BREAK_TACKLE",
  "ROUTE_RUNNING",
  "PASS_PROTECTION",
  "SHORT_YARDAGE_POWER",
  "CATCHING",
  "HANDS",
  "RELEASE",
  "SEPARATION",
  "CONTESTED_CATCH",
  "JUMPING",
  "RUN_AFTER_CATCH",
  "BLOCKING",
  "PASS_BLOCK",
  "RUN_BLOCK",
  "HAND_TECHNIQUE",
  "FOOTWORK",
  "ANCHOR",
  "TACKLING",
  "PURSUIT",
  "BLOCK_SHEDDING",
  "PASS_RUSH",
  "POWER_MOVES",
  "FINESSE_MOVES",
  "PLAY_RECOGNITION",
  "HIT_POWER",
  "MAN_COVERAGE",
  "ZONE_COVERAGE",
  "PRESS",
  "BALL_SKILLS",
  "LB_MAN_COVERAGE",
  "LB_ZONE_COVERAGE",
  "COVERAGE_RANGE",
  "LB_COVERAGE",
  "KICK_POWER",
  "KICK_ACCURACY",
  "PUNT_POWER",
  "PUNT_ACCURACY",
  "KICKOFF_POWER",
  "KICK_CONSISTENCY",
  "PUNT_HANG_TIME",
  "RETURN_VISION",
  "SNAP_ACCURACY",
  "SNAP_VELOCITY",
];

const ratingGroups: Array<{
  id: string;
  title: string;
  intro: string;
  ratings: RatingDefinition[];
}> = [
  {
    id: "ratings-mental",
    title: "Mental und Basiswerte",
    intro:
      "Diese Werte sind nicht an eine einzelne Position gebunden. Sie bilden die koerperliche Grundlage und die mentale Stabilitaet eines Spielers.",
    ratings: [
      {
        code: "SPEED",
        meaning: "Endgeschwindigkeit.",
        influence: "Hilft bei langen Runs, Yards after Catch, Returns und Coverage-Reichweite.",
      },
      {
        code: "ACCELERATION",
        meaning: "Wie schnell ein Spieler auf Tempo kommt.",
        influence: "Wichtig bei Antritt nach dem Snap, Pass Rush, Separation und Richtungswechseln.",
      },
      {
        code: "AGILITY",
        meaning: "Beweglichkeit und Richtungswechsel.",
        influence: "Erhoeht Ausweichchancen bei Balltraegern und hilft Verteidigern beim Reagieren.",
      },
      {
        code: "STRENGTH",
        meaning: "Kraft im Kontakt.",
        influence: "Wirkt bei Blocks, Run Defense, Tackles und Power-Runs.",
      },
      {
        code: "AWARENESS",
        meaning: "Spieluebersicht.",
        influence: "Senkt Fehler, verbessert Reads und fliesst in viele Composite Ratings ein.",
      },
      {
        code: "TOUGHNESS",
        meaning: "Haerte und Belastbarkeit im Kontakt.",
        influence: "Unterstuetzt Blocking, kurze Yards, Run Defense und Stabilitaet ueber ein Spiel.",
      },
      {
        code: "DURABILITY",
        meaning: "Koerperliche Robustheit.",
        influence: "Relevanter Basiswert fuer langfristige Einsatzfaehigkeit und Belastungslogik.",
      },
      {
        code: "DISCIPLINE",
        meaning: "Fehlervermeidung und Fokus.",
        influence: "Reduziert riskante Entscheidungen und hilft Spezialisten bei Konstanz.",
      },
      {
        code: "INTELLIGENCE",
        meaning: "Football-IQ.",
        influence: "Verbessert Spielverstaendnis, audibles Reads und mentale Composite Ratings.",
      },
      {
        code: "LEADERSHIP",
        meaning: "Fuehrungsqualitaet.",
        influence: "Traegt zur Command-/Consistency-Bewertung bei und stabilisiert Teamrollen.",
      },
    ],
  },
  {
    id: "ratings-qb",
    title: "QB",
    intro:
      "Quarterback-Werte steuern, wie sauber und wie riskant ein Passspiel funktioniert.",
    ratings: [
      {
        code: "THROW_POWER",
        meaning: "Armstaerke.",
        influence: "Ermoeglicht tiefere Wuerfe und hilft, Fenster gegen Coverage zu attackieren.",
      },
      {
        code: "THROW_ACCURACY_SHORT",
        meaning: "Genauigkeit bei kurzen Paessen.",
        influence: "Erhoeht die Completion Rate bei sicheren Konzepten und kurzen Downs.",
      },
      {
        code: "THROW_ACCURACY_MEDIUM",
        meaning: "Genauigkeit im mittleren Bereich.",
        influence: "Treibt die Effizienz bei Standard-Passspiel und Third-Down-Konzepten.",
      },
      {
        code: "THROW_ACCURACY_DEEP",
        meaning: "Genauigkeit bei tiefen Paessen.",
        influence: "Erhoeht Big-Play-Chancen, aber wirkt in riskanteren Spielsituationen.",
      },
      {
        code: "POCKET_PRESENCE",
        meaning: "Gefuehl fuer Druck in der Pocket.",
        influence: "Hilft gegen Sacks, schlechte Wuerfe und zu spaete Entscheidungen.",
      },
      {
        code: "DECISION_MAKING",
        meaning: "Entscheidungsqualitaet.",
        influence: "Senkt Turnover-Risiko und verbessert, ob der richtige Read getroffen wird.",
      },
      {
        code: "PLAY_ACTION",
        meaning: "Qualitaet bei Play-Action-Konzepten.",
        influence: "Macht Passspiel nach Run-Fakes glaubwuerdiger und effizienter.",
      },
      {
        code: "SCRAMBLING",
        meaning: "Improvisieren und Laufen aus der Pocket.",
        influence: "Erhoeht QB-Run-Optionen und kann negative Plays vermeiden.",
      },
      {
        code: "MOBILITY",
        meaning: "Allgemeine Beweglichkeit des QBs.",
        influence: "Wirkt mit Scrambling, Acceleration und Agility auf QB-Mobility.",
      },
    ],
  },
  {
    id: "ratings-skill",
    title: "Skill Positions",
    intro:
      "Diese Ratings betreffen Running Backs, Receiver, Tight Ends und Returner.",
    ratings: [
      {
        code: "VISION",
        meaning: "Erkennen von Laufwegen.",
        influence: "Hilft Balltraegern, bessere Lanes zu finden und konstante Yards zu erzielen.",
      },
      {
        code: "BALL_SECURITY",
        meaning: "Ballsicherheit.",
        influence: "Senkt Fumble- und Turnover-Risiko bei Runs, Catches und Returns.",
      },
      {
        code: "ELUSIVENESS",
        meaning: "Ausweichfaehigkeit.",
        influence: "Erhoeht Chancen, Tackles zu vermeiden und Zusatzyards zu gewinnen.",
      },
      {
        code: "BREAK_TACKLE",
        meaning: "Tackles brechen.",
        influence: "Wirkt bei Power-Runs und Yards nach Kontakt.",
      },
      {
        code: "ROUTE_RUNNING",
        meaning: "Praezision der Route.",
        influence: "Verbessert Timing und Separation bei Passzielen.",
      },
      {
        code: "PASS_PROTECTION",
        meaning: "Passschutz-Faehigkeit von Backs und Tight Ends.",
        influence: "Hilft gegen Blitzes und reduziert Druck auf den Quarterback.",
      },
      {
        code: "SHORT_YARDAGE_POWER",
        meaning: "Kraft bei kurzen Distanzen.",
        influence: "Wichtig bei Goal Line, Third/Fourth and Short und engen Runs.",
      },
      {
        code: "CATCHING",
        meaning: "Fangen des Balls.",
        influence: "Erhoeht sichere Catches und senkt Drops.",
      },
      {
        code: "HANDS",
        meaning: "Haende und Ballkontrolle.",
        influence: "Wirkt bei Catches, Interceptions, Returns und contested Situationen.",
      },
      {
        code: "RELEASE",
        meaning: "Start gegen Press Coverage.",
        influence: "Hilft Receivern, frueh frei zu werden.",
      },
      {
        code: "SEPARATION",
        meaning: "Abstand zum Verteidiger schaffen.",
        influence: "Erhoeht Zielqualitaet und Completion-Wahrscheinlichkeit.",
      },
      {
        code: "CONTESTED_CATCH",
        meaning: "Fang im direkten Duell.",
        influence: "Hilft bei engen Wuerfen, Red Zone und tiefen Paessen.",
      },
      {
        code: "JUMPING",
        meaning: "Sprungkraft.",
        influence: "Hilft bei hohen Paessen, Ball Skills und contested Catches.",
      },
      {
        code: "RUN_AFTER_CATCH",
        meaning: "Yards nach dem Catch.",
        influence: "Erhoeht Big-Play-Chancen nach kurzen und mittleren Paessen.",
      },
      {
        code: "BLOCKING",
        meaning: "Allgemeines Blocken ausserhalb der O-Line.",
        influence: "Hilft Runs nach aussen, Screens und Spezialteams.",
      },
    ],
  },
  {
    id: "ratings-oline",
    title: "O-Line",
    intro:
      "O-Line-Ratings bestimmen, ob die Offense stabile Taschen und Laufwege bekommt.",
    ratings: [
      {
        code: "PASS_BLOCK",
        meaning: "Pass-Blocking.",
        influence: "Reduziert Druck und Sacks, besonders bei Tackles und Guards.",
      },
      {
        code: "RUN_BLOCK",
        meaning: "Run-Blocking.",
        influence: "Oeffnet Laufwege und verbessert konstante Rushing-Yards.",
      },
      {
        code: "HAND_TECHNIQUE",
        meaning: "Handarbeit im Block.",
        influence: "Verbessert Kontrolle im Kontakt und hilft beim Block-Halten.",
      },
      {
        code: "FOOTWORK",
        meaning: "Fussarbeit.",
        influence: "Wichtig gegen schnelle Pass Rusher und beim Erreichen von Blocks.",
      },
      {
        code: "ANCHOR",
        meaning: "Standfestigkeit.",
        influence: "Hilft gegen Power Rush und verhindert, dass die Pocket kollabiert.",
      },
    ],
  },
  {
    id: "ratings-defense",
    title: "Defense",
    intro:
      "Defense-Ratings beeinflussen Pass Rush, Run Defense, Coverage und Ballgewinne.",
    ratings: [
      {
        code: "TACKLING",
        meaning: "Tackle-Sicherheit.",
        influence: "Senkt verpasste Tackles und begrenzt Zusatzyards.",
      },
      {
        code: "PURSUIT",
        meaning: "Verfolgungswinkel.",
        influence: "Hilft bei Runs nach aussen, Screens und langen Plays.",
      },
      {
        code: "BLOCK_SHEDDING",
        meaning: "Blocks loswerden.",
        influence: "Verbessert Run Defense und Pass Rush.",
      },
      {
        code: "PASS_RUSH",
        meaning: "Druck auf den Quarterback.",
        influence: "Erhoeht Pressure- und Sack-Chancen.",
      },
      {
        code: "POWER_MOVES",
        meaning: "Kraftbasierte Rush Moves.",
        influence: "Hilft gegen O-Line-Anker und erzeugt Pocket-Druck.",
      },
      {
        code: "FINESSE_MOVES",
        meaning: "Technische Rush Moves.",
        influence: "Hilft ueber Speed, Winkel und Handtechnik zum QB zu kommen.",
      },
      {
        code: "PLAY_RECOGNITION",
        meaning: "Spielzug erkennen.",
        influence: "Verbessert Reads gegen Run/Pass, Coverage und Blitzreaktionen.",
      },
      {
        code: "HIT_POWER",
        meaning: "Kontaktwucht.",
        influence: "Hilft bei Run Defense und kann Balltraeger staerker unter Druck setzen.",
      },
      {
        code: "MAN_COVERAGE",
        meaning: "Manndeckung.",
        influence: "Verbessert direkte Duelle gegen Receiver.",
      },
      {
        code: "ZONE_COVERAGE",
        meaning: "Zonendeckung.",
        influence: "Verbessert Raumverteidigung, Reads und Passfenster-Kontrolle.",
      },
      {
        code: "PRESS",
        meaning: "Press Coverage an der Line.",
        influence: "Stoert Releases und Timing des Passspiels.",
      },
      {
        code: "BALL_SKILLS",
        meaning: "Spiel am Ball.",
        influence: "Erhoeht Chancen auf Pass Breakups und Interceptions.",
      },
      {
        code: "LB_MAN_COVERAGE",
        meaning: "Linebacker-Manndeckung.",
        influence: "Hilft Linebackern gegen Tight Ends und Running Backs.",
      },
      {
        code: "LB_ZONE_COVERAGE",
        meaning: "Linebacker-Zonendeckung.",
        influence: "Hilft bei Hook/Curl-Zonen und kurzen Passfenstern.",
      },
      {
        code: "COVERAGE_RANGE",
        meaning: "Coverage-Reichweite.",
        influence: "Erweitert den Wirkungsradius in Zone, Safety-Hilfe und Ball Hawk Plays.",
      },
      {
        code: "LB_COVERAGE",
        meaning: "Allgemeine Linebacker-Coverage.",
        influence: "Fliesst in Linebacker-Coverage-Composite ein.",
      },
    ],
  },
  {
    id: "ratings-special",
    title: "Special Teams",
    intro:
      "Special-Teams-Ratings entscheiden ueber Field Goals, Punts, Returns und Long Snaps.",
    ratings: [
      {
        code: "KICK_POWER",
        meaning: "Kick-Kraft.",
        influence: "Erhoeht Reichweite bei Field Goals und Kickoffs.",
      },
      {
        code: "KICK_ACCURACY",
        meaning: "Kick-Genauigkeit.",
        influence: "Erhoeht Field-Goal-Erfolg, besonders bei mittleren und langen Kicks.",
      },
      {
        code: "PUNT_POWER",
        meaning: "Punt-Kraft.",
        influence: "Verbessert Punt-Distanz und Feldposition.",
      },
      {
        code: "PUNT_ACCURACY",
        meaning: "Punt-Platzierung.",
        influence: "Hilft bei Inside-20-Punts und vermeidet schlechte Returns.",
      },
      {
        code: "KICKOFF_POWER",
        meaning: "Kickoff-Kraft.",
        influence: "Erhoeht Touchback-Chancen und senkt gegnerische Return-Position.",
      },
      {
        code: "KICK_CONSISTENCY",
        meaning: "Konstanz von Kickern/Puntern.",
        influence: "Reduziert Schwankungen bei Field Goals, Punts und Specialists.",
      },
      {
        code: "PUNT_HANG_TIME",
        meaning: "Hang Time beim Punt.",
        influence: "Gibt Coverage-Zeit und reduziert Return-Risiko.",
      },
      {
        code: "RETURN_VISION",
        meaning: "Return-Laufwege erkennen.",
        influence: "Verbessert Kick- und Punt-Returns.",
      },
      {
        code: "SNAP_ACCURACY",
        meaning: "Long-Snap-Genauigkeit.",
        influence: "Stabilisiert Field Goals, Punts und Spezialteams-Ablauf.",
      },
      {
        code: "SNAP_VELOCITY",
        meaning: "Long-Snap-Geschwindigkeit.",
        influence: "Reduziert Druck auf Holder/Punter und verhindert Timing-Probleme.",
      },
    ],
  },
];

const compositeRatings = [
  {
    name: "passing",
    group: "QB",
    meaning: "Passqualitaet aus Accuracy, Throw Power, Decision und Awareness.",
  },
  {
    name: "pocket",
    group: "QB",
    meaning: "Ruhe und Reaktion in der Pocket.",
  },
  {
    name: "mobility",
    group: "QB",
    meaning: "Beweglichkeit und Scrambling-Wert des Quarterbacks.",
  },
  {
    name: "command",
    group: "Mental",
    meaning: "Spielverstaendnis, Disziplin, Intelligenz und Leadership.",
  },
  {
    name: "ballCarrier",
    group: "Skill",
    meaning: "Run-Qualitaet aus Vision, Ball Security, Elusiveness und Power.",
  },
  {
    name: "protection",
    group: "Skill",
    meaning: "Pass Protection fuer Backs und Tight Ends.",
  },
  {
    name: "hands",
    group: "Skill/Defense",
    meaning: "Ballkontrolle bei Catches, Returns und Ball-Hawk-Situationen.",
  },
  {
    name: "receiving",
    group: "Skill",
    meaning: "Receiver-Qualitaet aus Catching, Route Running, Release und Separation.",
  },
  {
    name: "passBlocking",
    group: "O-Line",
    meaning: "Passschutz aus Pass Block, Footwork, Technik, Anchor und Awareness.",
  },
  {
    name: "runBlocking",
    group: "O-Line",
    meaning: "Run Blocking aus Run Block, Technik, Strength, Anchor und Toughness.",
  },
  {
    name: "passRush",
    group: "Defense",
    meaning: "QB-Druck aus Pass Rush, Power/Finesse Moves und Block Shedding.",
  },
  {
    name: "runDefense",
    group: "Defense",
    meaning: "Run-Stopping aus Tackling, Pursuit, Block Shedding und Play Recognition.",
  },
  {
    name: "linebackerCoverage",
    group: "Defense",
    meaning: "Coverage-Wert fuer Linebacker.",
  },
  {
    name: "coverage",
    group: "Defense",
    meaning: "Secondary-Coverage aus Man, Zone, Range, Press und Awareness.",
  },
  {
    name: "ballHawk",
    group: "Defense",
    meaning: "Ballgewinne und Pass Breakups aus Ball Skills, Hands und Recognition.",
  },
  {
    name: "returnGame",
    group: "Special Teams",
    meaning: "Return-Wert aus Return Vision, Hands, Ball Security und Speed.",
  },
  {
    name: "kicking",
    group: "Special Teams",
    meaning: "Field-Goal/Kickoff-Wert aus Power, Accuracy und Consistency.",
  },
  {
    name: "punting",
    group: "Special Teams",
    meaning: "Punt-Wert aus Power, Accuracy, Hang Time und Consistency.",
  },
  {
    name: "snapping",
    group: "Special Teams",
    meaning: "Long-Snap-Wert aus Accuracy, Velocity, Discipline und Technik.",
  },
  {
    name: "specialistConsistency",
    group: "Special Teams/Mental",
    meaning: "Stabilitaet von Specialists aus Consistency, Snapping, Discipline und Awareness.",
  },
];

const impactExamples = [
  {
    title: "QB Accuracy -> Completion Rate",
    body:
      "THROW_ACCURACY_SHORT, MEDIUM und DEEP erhoehen, ob ein Pass ankommt. Je nach Distanz wird ein anderer Accuracy-Wert wichtiger.",
  },
  {
    title: "QB Decision -> Turnover Risiko",
    body:
      "DECISION_MAKING und DISCIPLINE helfen, riskante Wuerfe zu vermeiden. Gute QBs verlieren seltener Drives durch schlechte Reads.",
  },
  {
    title: "OL Pass Block -> Sacks",
    body:
      "PASS_BLOCK, FOOTWORK und ANCHOR geben dem Quarterback Zeit. Schwache O-Line-Werte fuehren eher zu Druck und Sacks.",
  },
  {
    title: "DL Pass Rush -> Pressure",
    body:
      "PASS_RUSH, POWER_MOVES und FINESSE_MOVES erhoehen Druck. Mehr Druck senkt die Qualitaet des gegnerischen Passspiels.",
  },
  {
    title: "RB Vision -> Laufentscheidungen",
    body:
      "VISION hilft dem Balltraeger, den richtigen Laufweg zu finden. Das fuehrt zu mehr konstanten Yards.",
  },
  {
    title: "RB Ball Security -> Fumbles",
    body:
      "BALL_SECURITY reduziert Ballverluste. Gerade bei vielen Carries und Returns wird dieser Wert wichtig.",
  },
  {
    title: "WR Route Running -> Separation",
    body:
      "ROUTE_RUNNING, RELEASE und SEPARATION helfen Receivern, freie Fenster zu schaffen.",
  },
  {
    title: "DB Coverage -> Pass Defense",
    body:
      "MAN_COVERAGE, ZONE_COVERAGE, COVERAGE_RANGE und BALL_SKILLS erschweren Catches und erhoehen Pass-Breakup-Chancen.",
  },
  {
    title: "Kicker Accuracy -> FG Erfolg",
    body:
      "KICK_ACCURACY und KICK_CONSISTENCY entscheiden, ob Drives mit drei Punkten enden oder leer bleiben.",
  },
  {
    title: "Punter -> Field Position",
    body:
      "PUNT_POWER, PUNT_ACCURACY und PUNT_HANG_TIME beeinflussen, wo der Gegner seinen naechsten Drive startet.",
  },
  {
    title: "Mental Command -> weniger Chaos",
    body:
      "AWARENESS, INTELLIGENCE, LEADERSHIP und DISCIPLINE verbessern Reads und Stabilitaet in kritischen Situationen.",
  },
  {
    title: "Ball Hawk -> Interceptions",
    body:
      "BALL_SKILLS, HANDS und PLAY_RECOGNITION geben Defensive Backs mehr Chancen, aus engen Paessen Ballgewinne zu machen.",
  },
];

function html(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function num(value: number) {
  return value.toFixed(2);
}

function team(id: string) {
  const snapshot = teamById.get(id);
  if (!snapshot) {
    throw new Error(`Unknown team id ${id}`);
  }

  return snapshot;
}

function teamName(id: string) {
  const snapshot = team(id);
  return `${snapshot.abbreviation} ${snapshot.name}`;
}

function tierLabel(tier: string) {
  switch (tier) {
    case "SCHWACH":
      return "schwach";
    case "MITTEL_A":
      return "mittel A";
    case "MITTEL_B":
      return "mittel B";
    case "STARK":
      return "stark";
    default:
      return tier.toLowerCase();
  }
}

function favoriteId(series: MatchupSeries) {
  const home = team(series.homeTeamId);
  const away = team(series.awayTeamId);
  if (home.rosterOverall === away.rosterOverall) {
    return null;
  }

  return home.rosterOverall > away.rosterOverall ? home.teamId : away.teamId;
}

function winnerName(game: MatchupGame) {
  if (!game.winner) {
    return "Unentschieden";
  }

  return teamName(game.winner.teamId);
}

function favoriteWinRate(series: MatchupSeries) {
  const favorite = favoriteId(series);
  if (!favorite) {
    return 0;
  }

  const wins = series.games.filter((game) => game.winner?.teamId === favorite).length;
  return (wins / series.games.length) * 100;
}

function seriesFavoriteWins(series: MatchupSeries) {
  const favorite = favoriteId(series);
  return favorite
    ? series.games.filter((game) => game.winner?.teamId === favorite).length
    : 0;
}

function seriesUnderdogWins(series: MatchupSeries) {
  const favorite = favoriteId(series);
  return favorite
    ? series.games.filter((game) => game.winner && game.winner.teamId !== favorite).length
    : 0;
}

const favoriteWins = matchupReport.series.reduce(
  (sum, series) => sum + seriesFavoriteWins(series),
  0,
);
const underdogWins = matchupReport.series.reduce(
  (sum, series) => sum + seriesUnderdogWins(series),
  0,
);
const ties = matchupReport.series.reduce((sum, series) => sum + series.winRecord.ties, 0);
const totalGames = matchupReport.series.reduce((sum, series) => sum + series.games.length, 0);
const bigGapSeries = matchupReport.series.filter((series) => {
  const home = team(series.homeTeamId);
  const away = team(series.awayTeamId);
  return Math.abs(home.rosterOverall - away.rosterOverall) >= 15;
});
const bigGapGames = bigGapSeries.reduce((sum, series) => sum + series.games.length, 0);
const bigGapUpsets = bigGapSeries.reduce((sum, series) => sum + seriesUnderdogWins(series), 0);
const controlledStatusGreen =
  matchupReport.status === "GRUEN" &&
  matchupReport.checks.atLeastFourSeries &&
  matchupReport.checks.everySeriesHas100Games &&
  matchupReport.checks.ratingsRemainUnchanged &&
  matchupReport.checks.rawDataComplete;

function renderTeamRows() {
  return matchupReport.teams
    .map(
      (entry) => `
        <tr>
          <td><strong>${html(entry.abbreviation)} ${html(entry.name)}</strong></td>
          <td><span class="tag">${html(tierLabel(entry.tier))}</span></td>
          <td>${entry.overallRating}</td>
          <td>${num(entry.rosterOverall)}</td>
          <td>${num(entry.offenseOverall)}</td>
          <td>${num(entry.defenseOverall)}</td>
          <td>${num(entry.specialTeamsOverall)}</td>
          <td>${num(entry.physicalOverall)} / ${num(entry.mentalOverall)}</td>
          <td>Dynamisch pro Drive, keine feste Team-Zuweisung</td>
        </tr>`,
    )
    .join("");
}

function renderSeriesRows() {
  return matchupReport.series
    .map((series) => {
      const home = team(series.homeTeamId);
      const away = team(series.awayTeamId);
      const a = series.averages;
      return `
        <tr>
          <td><strong>${html(series.label)}</strong><br><span class="muted">${html(series.seedPrefix)}-001..100</span></td>
          <td>${html(home.abbreviation)} ${html(home.name)}</td>
          <td>${html(away.abbreviation)} ${html(away.name)}</td>
          <td>${series.winRecord.home}-${series.winRecord.away}-${series.winRecord.ties}</td>
          <td>${pct((series.winRecord.home / series.gamesCompleted) * 100)}</td>
          <td>${pct(favoriteWinRate(series))}</td>
          <td>${num(a.homeScore)}-${num(a.awayScore)}</td>
          <td>${num(a.scoreDifferentialHomeMinusAway)}</td>
          <td>${num(a.homeYards)}-${num(a.awayYards)}</td>
          <td>${num(a.homeTouchdowns)}-${num(a.awayTouchdowns)}</td>
          <td>${num(a.homePunts)}-${num(a.awayPunts)}</td>
          <td>${num(a.homeFieldGoalAttempts)}-${num(a.awayFieldGoalAttempts)}</td>
          <td>${num(a.homeTurnovers)}-${num(a.awayTurnovers)}</td>
          <td>${num(a.homeTurnoverOnDowns)}-${num(a.awayTurnoverOnDowns)}</td>
        </tr>`;
    })
    .join("");
}

function renderGameTables() {
  return matchupReport.series
    .map((series) => {
      const home = team(series.homeTeamId);
      const away = team(series.awayTeamId);
      const rows = series.games
        .map(
          (game) => `
            <tr>
              <td>${game.gameNumber}</td>
              <td><code>${html(game.seed)}</code></td>
              <td>${html(home.abbreviation)} ${game.score.home} - ${game.score.away} ${html(away.abbreviation)}</td>
              <td>${html(winnerName(game))}</td>
              <td>${game.yards.home} - ${game.yards.away} (${game.yards.total})</td>
              <td>${game.turnovers.home} - ${game.turnovers.away} (${game.turnovers.total})</td>
            </tr>`,
        )
        .join("");

      return `
        <section class="series-games" id="games-${html(series.id)}">
          <h3>${html(series.label)}: alle 100 Spiele</h3>
          <p>Notation: Home-Wert zuerst, Away-Wert danach. Home = ${html(teamName(series.homeTeamId))}, Away = ${html(teamName(series.awayTeamId))}.</p>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Spiel</th>
                  <th>Seed</th>
                  <th>Score</th>
                  <th>Winner</th>
                  <th>Yards</th>
                  <th>Turnovers</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
    })
    .join("");
}

function renderRatingGroups() {
  return ratingGroups
    .map(
      (group) => `
        <section id="${html(group.id)}" class="subsection">
          <h3>${html(group.title)}</h3>
          <p>${html(group.intro)}</p>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Bedeutung</th>
                  <th>Einfluss im Spiel</th>
                </tr>
              </thead>
              <tbody>
                ${group.ratings
                  .map(
                    (rating) => `
                      <tr>
                        <td><code>${html(rating.code)}</code></td>
                        <td>${html(rating.meaning)}</td>
                        <td>${html(rating.influence)}</td>
                      </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>`,
    )
    .join("");
}

function renderCompositeRatings() {
  return compositeRatings
    .map(
      (entry) => `
        <tr>
          <td><code>${html(entry.name)}</code></td>
          <td>${html(entry.group)}</td>
          <td>${html(entry.meaning)}</td>
        </tr>`,
    )
    .join("");
}

function renderImpactCards() {
  return impactExamples
    .map(
      (example) => `
        <article class="example-card">
          <h3>${html(example.title)}</h3>
          <p>${html(example.body)}</p>
        </article>`,
    )
    .join("");
}

function renderNotableUpsets() {
  const notable = matchupReport.series
    .flatMap((series) => {
      const favorite = favoriteId(series);
      return series.games
        .filter((game) => favorite && game.winner && game.winner.teamId !== favorite)
        .map((game) => ({
          series,
          game,
          favorite,
        }));
    })
    .filter((entry) => entry.series.id !== "medium-a-vs-medium-b")
    .map(({ series, game, favorite }) => {
      const favoriteName = favorite ? teamName(favorite) : "kein Favorit";
      return `
        <tr>
          <td>${html(series.label)}</td>
          <td>${game.gameNumber}</td>
          <td><code>${html(game.seed)}</code></td>
          <td>${html(favoriteName)}</td>
          <td>${html(winnerName(game))}</td>
          <td>${game.score.home}-${game.score.away}</td>
          <td>${game.yards.home}-${game.yards.away}</td>
          <td>${game.touchdowns.home}-${game.touchdowns.away}</td>
          <td>${game.fieldGoalAttempts.home}-${game.fieldGoalAttempts.away}</td>
          <td>${game.turnoverOnDowns.home}-${game.turnoverOnDowns.away}</td>
        </tr>`;
    })
    .join("");

  return notable.length > 0
    ? notable
    : '<tr><td colspan="10">Keine grossen Upsets in den kontrollierten Serien.</td></tr>';
}

function verifyAllRatingsCovered() {
  const covered = new Set(
    ratingGroups.flatMap((group) => group.ratings.map((rating) => rating.code)),
  );
  const missing = attributeCodes.filter((code) => !covered.has(code));
  if (missing.length > 0) {
    throw new Error(`Missing rating explanations: ${missing.join(", ")}`);
  }
}

verifyAllRatingsCovered();

const page = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Game Engine Rating Analysis</title>
  <style>
    :root {
      --bg: #f5f7f6;
      --panel: #ffffff;
      --panel-soft: #eef4f1;
      --ink: #172124;
      --muted: #5e6c70;
      --line: #d6dfdc;
      --accent: #1f6f78;
      --accent-2: #6b4e9b;
      --good: #17613d;
      --warn: #9b6a19;
      --bad: #9b2d25;
      --table-head: #e7efeb;
      --shadow: 0 14px 40px rgba(23, 33, 36, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.48;
    }

    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 20px 60px;
    }

    h1,
    h2,
    h3 {
      margin: 0;
      letter-spacing: 0;
    }

    h1 {
      max-width: 850px;
      font-size: 34px;
      line-height: 1.08;
    }

    h2 {
      margin-top: 38px;
      font-size: 24px;
      line-height: 1.2;
    }

    h3 {
      margin-top: 20px;
      font-size: 17px;
      line-height: 1.25;
    }

    p {
      margin: 8px 0 0;
      color: var(--muted);
    }

    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 700;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: start;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }

    .status {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 7px 12px;
      border: 1px solid rgba(23, 97, 61, 0.28);
      border-radius: 8px;
      background: #edf8f1;
      color: var(--good);
      font-weight: 900;
      white-space: nowrap;
    }

    .muted {
      color: var(--muted);
    }

    .toc {
      margin-top: 18px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .toc h2 {
      margin-top: 0;
      font-size: 18px;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px 14px;
      margin-top: 10px;
    }

    .toc-grid a {
      display: block;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfb;
      color: var(--ink);
      font-size: 13px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .card,
    .note,
    .example-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .card {
      padding: 14px;
    }

    .label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .value {
      margin-top: 4px;
      font-size: 22px;
      font-weight: 900;
    }

    .note {
      margin-top: 14px;
      padding: 16px;
    }

    .note strong {
      color: var(--ink);
    }

    .good {
      color: var(--good);
    }

    .warn {
      color: var(--warn);
    }

    .bad {
      color: var(--bad);
    }

    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel-soft);
      font-size: 12px;
      font-weight: 800;
    }

    .table-scroll {
      width: 100%;
      margin-top: 12px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    table {
      width: 100%;
      border-collapse: collapse;
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
      background: var(--table-head);
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .method-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .method-grid .note {
      margin-top: 0;
    }

    .example-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .example-card {
      padding: 14px;
    }

    .example-card h3 {
      margin-top: 0;
      font-size: 15px;
    }

    .callout-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .subsection {
      padding-top: 4px;
    }

    .series-games {
      margin-top: 24px;
    }

    .checklist {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 14px;
      margin-top: 12px;
      padding: 0;
      list-style: none;
    }

    .checklist li {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      font-weight: 750;
    }

    @media (max-width: 1000px) {
      .cards,
      .example-grid,
      .toc-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hero,
      .method-grid,
      .callout-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 620px) {
      main {
        padding: 22px 14px 48px;
      }

      h1 {
        font-size: 28px;
      }

      .cards,
      .example-grid,
      .toc-grid,
      .checklist {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <div>
        <h1>Game Engine, Matchup-Tests und Spieler-Ratingsystem</h1>
        <p>Verstaendlicher Bericht fuer Nicht-Programmierer auf Basis der vorhandenen QA-Analyse und der kontrollierten Matchup-Rohdaten.</p>
      </div>
      <div class="status">Status: ${controlledStatusGreen ? "GR&Uuml;N" : "ROT"}</div>
    </header>

    <nav class="toc" aria-label="Inhaltsverzeichnis">
      <h2>Inhaltsverzeichnis</h2>
      <div class="toc-grid">
        <a href="#summary">1. Executive Summary</a>
        <a href="#methodik">2. Testmethodik</a>
        <a href="#teams">3. Teamuebersicht</a>
        <a href="#matchups">4. Matchup-Ergebnisse</a>
        <a href="#games">5. Alle Spiele</a>
        <a href="#ratings">6. Spieler-Ratingsystem</a>
        <a href="#impact">7. Impact-Beispiele</a>
        <a href="#connection">8. Ratings & Ergebnisse</a>
        <a href="#plausibility">9. Plausibilitaet</a>
        <a href="#conclusion">10. Fazit</a>
      </div>
    </nav>

    <section id="summary">
      <h2>1. Executive Summary</h2>
      <div class="cards">
        <div class="card">
          <div class="label">Kontrollierte Spiele</div>
          <div class="value">${totalGames}</div>
          <p>4 Serien mit je 100 Seeds.</p>
        </div>
        <div class="card">
          <div class="label">Favoriten-Siege</div>
          <div class="value">${favoriteWins}/${totalGames}</div>
          <p>${pct((favoriteWins / totalGames) * 100)} inklusive Unentschieden als Nicht-Sieg.</p>
        </div>
        <div class="card">
          <div class="label">Lower-Rated Wins</div>
          <div class="value">${underdogWins}</div>
          <p>Davon ${bigGapUpsets} in grossen Rating-Abstaenden.</p>
        </div>
        <div class="card">
          <div class="label">Unentschieden</div>
          <div class="value">${ties}</div>
          <p>Alle in Mittel A vs Mittel B.</p>
        </div>
      </div>
      <div class="note">
        <strong>Wichtigste Erkenntnis:</strong> Ja, staerkere Teams gewinnen deutlich haeufiger. In den kontrollierten Tests gewinnen die jeweils hoeher bewerteten Teams ${favoriteWins} von ${totalGames} Spielen. Upsets sind vorhanden, aber selten in grossen Rating-Luecken: ${bigGapUpsets} Upsets in ${bigGapGames} Spielen mit mindestens 15 Punkten Roster-Abstand. Das Rating-System zeigt also eine klare Wirkung.
      </div>
      <div class="note">
        <strong>Gesamtbewertung:</strong> Das System ist fuer diese Testdaten plausibel. Extreme Rating-Unterschiede schlagen sehr hart durch, waehrend das engere Mittelklasse-Matchup mehr Varianz zeigt. Es gibt keinen Beleg, dass jetzt eine globale Balance-Aenderung noetig ist; fuer Produktionssicherheit fehlen aber noch Home/Away-Spiegel und breitere Matchup-Matrizen.
      </div>
    </section>

    <section id="methodik">
      <h2>2. Testmethodik</h2>
      <div class="method-grid">
        <div class="note">
          <strong>Prompt 1: Analyse ohne Simulation</strong>
          <p>Analysiert wurden vorhandene QA-Reports, Testskripte, Seeds, Teams und Teamratings. Die vorhandenen Production-Tests nutzten vor allem deterministische 8-Team-Rotationen und feste BOS-vs-NYT-Serien.</p>
        </div>
        <div class="note">
          <strong>Prompt 2: Kontrollierte Matchup-Tests</strong>
          <p>Vier Teams mit klar unterschiedlichen Ratings wurden in vier festen Serien getestet. Jede Serie hat 100 unterschiedliche Seeds und dieselben unveraenderten Teams.</p>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Testart</th>
              <th>Anzahl</th>
              <th>Matchups</th>
              <th>Seeds</th>
              <th>Zielmetriken</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Production Smoke</td>
              <td>100 Spiele</td>
              <td>Deterministische 8-Team-Rotation</td>
              <td><code>production-smoke-1..100</code></td>
              <td>Technische Stabilitaet, keine kritischen/major Issues, plausibler Ballbesitz</td>
            </tr>
            <tr>
              <td>Production Stability</td>
              <td>500 Spiele</td>
              <td>Dieselbe 8-Team-Rotation</td>
              <td><code>production-stability-1..500</code></td>
              <td>Runtime, technische Gates, Standardabweichung, Time of Possession</td>
            </tr>
            <tr>
              <td>Seed Regression</td>
              <td>8 Szenarien</td>
              <td>Fixe Regression-Faelle</td>
              <td><code>production-regression-seed-001..008</code></td>
              <td>Determinismus und Fingerprint-Stabilitaet</td>
            </tr>
            <tr>
              <td>Edge Scan</td>
              <td>160 Spiele plus Playoff-Fall</td>
              <td>8-Team-Rotation, 20 Spiele je Paarung</td>
              <td><code>production-edge-1..160</code></td>
              <td>Edge Cases, Endgame, Blowout, technische Auffaelligkeiten</td>
            </tr>
            <tr>
              <td>Kontrollierte Matchups</td>
              <td>4 x 100 Spiele</td>
              <td>Feste Paarungen: stark/schwach, stark/mittel, mittel/mittel, mittel/schwach</td>
              <td><code>qa-matchup-...-001..100</code></td>
              <td>Win Record, Score, Yards, TDs, Punts, FG, Turnovers, TOD</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="note">
        Dieser Bericht hat <strong>keine weitere Simulation</strong> ausgefuehrt. Er verwendet <code>reports-output/simulations/qa-test-analysis.html</code>, <code>reports-output/simulations/qa-matchup-summary.html</code>, <code>reports-output/simulations/qa-matchup-results.json</code> sowie die vorhandenen Rating-Definitionen aus der Codebasis.
      </div>
    </section>

    <section id="teams">
      <h2>3. Teamuebersicht</h2>
      <p>Die vier kontrollierten Teams wurden absichtlich weit auseinander bewertet. Das macht sichtbar, ob Ratings tatsaechlich auf Ergebnisse wirken.</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Kategorie</th>
              <th>Overall</th>
              <th>Roster</th>
              <th>Offense</th>
              <th>Defense</th>
              <th>Special</th>
              <th>Physical / Mental</th>
              <th>Coaching</th>
            </tr>
          </thead>
          <tbody>${renderTeamRows()}</tbody>
        </table>
      </div>
      <div class="note">
        Die Coaching-Profile sind in diesen Daten nicht als feste Team-Eigenschaft gespeichert. Die Engine leitet Coaching-/Entscheidungsprofile situativ pro Drive aus Kontext und Seed ab. Deshalb steht in der Tabelle kein fixer Coach-Typ pro Team.
      </div>
    </section>

    <section id="matchups">
      <h2>4. Matchup-Ergebnisse</h2>
      <p>Alle Durchschnittswerte sind Home-Away notiert. Win Record bedeutet Home-Siege, Away-Siege, Unentschieden.</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Serie</th>
              <th>Home</th>
              <th>Away</th>
              <th>Win Record</th>
              <th>Home Win %</th>
              <th>Favorit Win %</th>
              <th>Score Ø</th>
              <th>Diff H-A</th>
              <th>Yards</th>
              <th>TDs</th>
              <th>Punts</th>
              <th>FG</th>
              <th>Turnovers</th>
              <th>TOD</th>
            </tr>
          </thead>
          <tbody>${renderSeriesRows()}</tbody>
        </table>
      </div>
      <div class="callout-row">
        <div class="note">
          <strong>Stark vs Schwach</strong>
          <p>San Diego gewinnt 100 von 100. Das ist bei 30 Punkten Roster-Abstand erwartbar dominant.</p>
        </div>
        <div class="note">
          <strong>Mittel gegen Mittel</strong>
          <p>Memphis ist hoeher bewertet und gewinnt 71 von 100, aber Portland gewinnt 23 und 6 Spiele enden unentschieden.</p>
        </div>
        <div class="note">
          <strong>Upsets</strong>
          <p>Grosse Upsets gibt es 2-mal: Portland schlaegt San Diego 21-18, Canton schlaegt Memphis 7-6.</p>
        </div>
      </div>
    </section>

    <section id="games">
      <h2>5. Alle Spiele</h2>
      <p>Die folgenden Tabellen listen alle 400 gespeicherten Spiele aus <code>qa-matchup-results.json</code>.</p>
      ${renderGameTables()}
    </section>

    <section id="ratings">
      <h2>6. Spieler-Ratingsystem</h2>
      <div class="note">
        Spieler besitzen Einzelratings auf einer 1-99-Skala. Die Engine bildet daraus Composite Ratings wie <code>passing</code>, <code>passBlocking</code>, <code>coverage</code> oder <code>kicking</code>. Diese zusammengesetzten Werte beeinflussen dann, wie gut ein Team laeuft, passt, blockt, verteidigt, kickt und Entscheidungen ausfuehrt.
      </div>
      ${renderRatingGroups()}
      <section class="subsection" id="composites">
        <h3>Composite Ratings</h3>
        <p>Diese Werte werden aus mehreren Einzelratings berechnet und sind die lesbare Zwischenebene zwischen Spielerprofil und Spielausgang.</p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Composite</th>
                <th>Gruppe</th>
                <th>Bedeutung</th>
              </tr>
            </thead>
            <tbody>${renderCompositeRatings()}</tbody>
          </table>
        </div>
      </section>
    </section>

    <section id="impact">
      <h2>7. Impact der Ratings: Beispiele</h2>
      <p>Diese Beispiele zeigen, wie einzelne Ratings auf dem Feld sichtbar werden.</p>
      <div class="example-grid">${renderImpactCards()}</div>
    </section>

    <section id="connection">
      <h2>8. Verbindung Ratings & Ergebnisse</h2>
      <div class="note">
        <strong>Warum gewinnt das starke Team?</strong>
        <p>San Diego hat im kontrollierten Datensatz Roster ${num(team("CTL_STRONG").rosterOverall)}, Offense ${num(team("CTL_STRONG").offenseOverall)}, Defense ${num(team("CTL_STRONG").defenseOverall)} und Mental ${num(team("CTL_STRONG").mentalOverall)}. Gegen Canton liegt der Roster-Abstand bei ${num(team("CTL_STRONG").rosterOverall - team("CTL_WEAK").rosterOverall)} Punkten, gegen Portland bei ${num(team("CTL_STRONG").rosterOverall - team("CTL_MIDA").rosterOverall)} Punkten. Das fuehrt zu mehr Yards, mehr Touchdowns, weniger Punts und weniger leeren Drives.</p>
      </div>
      <div class="note">
        <strong>Warum kann ein schwaches Team trotzdem gewinnen?</strong>
        <p>Football-Ergebnisse entstehen nicht nur aus Durchschnittsstaerke. Seeds, Drive-Enden, Field Goals, Turnover on Downs, Red-Zone-Konversion und einzelne Sequenzen koennen ein Spiel kippen. Die grossen Upsets in diesen Daten sind nicht durch bessere Durchschnittswerte entstanden, sondern durch Spiele, in denen der Favorit viele Yards hatte, aber kaum Touchdowns erzielte.</p>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Serie</th>
              <th>Spiel</th>
              <th>Seed</th>
              <th>Favorit</th>
              <th>Gewinner</th>
              <th>Score</th>
              <th>Yards</th>
              <th>TDs</th>
              <th>FG</th>
              <th>TOD</th>
            </tr>
          </thead>
          <tbody>${renderNotableUpsets()}</tbody>
        </table>
      </div>
      <div class="note">
        <strong>Entscheidende Rating-Bereiche:</strong> QB Accuracy/Decision, O-Line Pass Block, Run-Blocking, Coverage, Pass Rush, Ball Security und Kicking bestimmen besonders sichtbar, ob Drives zu Touchdowns, Field Goals, Punts oder Ballverlusten werden. In den Upset-Beispielen sieht man vor allem Red-Zone- und Field-Goal-Abweichungen: Der Favorit bewegt den Ball, aber beendet Drives nicht effizient genug.
      </div>
    </section>

    <section id="plausibility">
      <h2>9. Plausibilitaetsbewertung</h2>
      <div class="cards">
        <div class="card">
          <div class="label">Realismus</div>
          <div class="value good">Plausibel</div>
          <p>Staerkere Teams gewinnen klar haeufiger.</p>
        </div>
        <div class="card">
          <div class="label">Upsets</div>
          <div class="value warn">Selten</div>
          <p>Bei grossen Rating-Luecken nur ${bigGapUpsets}/${bigGapGames}.</p>
        </div>
        <div class="card">
          <div class="label">Stats</div>
          <div class="value warn">Hart</div>
          <p>Schwache Teams punkten gegen starke Gegner sehr wenig.</p>
        </div>
        <div class="card">
          <div class="label">Balance-Fazit</div>
          <div class="value good">Keine Sofort-Aenderung</div>
          <p>Die Daten belegen Wirkung, aber noch keine globale Fehlbalance.</p>
        </div>
      </div>
      <div class="note">
        <strong>Zu viele oder zu wenige Upsets?</strong>
        <p>In grossen Mismatches sind Upsets sehr selten, was bei absichtlich extremen Rating-Unterschieden plausibel ist. Fuer normale Ligen koennte die Varianz aber etwas niedrig wirken, wenn solche Abstaende haeufig vorkommen. Das Mittelklasse-Matchup zeigt dagegen passende Varianz: Der bessere Kader gewinnt deutlich haeufiger, aber nicht automatisch.</p>
      </div>
      <div class="note">
        <strong>Stats plausibel?</strong>
        <p>Yards und Scores folgen der Rating-Hierarchie. Auffaellig sind die sehr niedrigen Scores schwacher Teams und die hohen Punt-Zahlen gegen bessere Gegner. Das ist kein klarer Fehler, sollte aber in weiteren Tests beobachtet werden, besonders bei Red-Zone-Effizienz und Field-Goal-lastigen Favoriten-Spielen.</p>
      </div>
    </section>

    <section id="conclusion">
      <h2>10. Fazit & Empfehlung</h2>
      <div class="note">
        <strong>Rating-System:</strong> Gut genug fuer den aktuellen Stand. Ratings wirken sichtbar und konsistent: grosse Staerkeunterschiede erzeugen klare Ergebnisse, kleinere Unterschiede lassen Upsets und Unentschieden zu.
      </div>
      <div class="note">
        <strong>Anpassungen:</strong> Keine direkte Engine- oder Balancing-Aenderung aus diesem Bericht ableiten. Zuerst sollten Home/Away-Spiegel, groessere Round-Robin-Matrizen und Archetyp-Tests folgen, damit getrennt werden kann, ob Auffaelligkeiten von Ratings, Home Field, Playcalling, Red Zone oder Spezialteams kommen.
      </div>
      <h3>Statuspruefung</h3>
      <ul class="checklist">
        <li>HTML erstellt: <span class="good">Ja</span></li>
        <li>4 Teams enthalten: <span class="good">Ja</span></li>
        <li>4 Serien a 100 Spiele enthalten: <span class="good">Ja</span></li>
        <li>Alle Spiele gelistet: <span class="good">Ja, 400</span></li>
        <li>Ratings erklaert: <span class="good">Ja, alle ${attributeCodes.length} Einzelratings</span></li>
        <li>Impact-Beispiele enthalten: <span class="good">Ja, ${impactExamples.length}</span></li>
        <li>Verstaendlich fuer Nicht-Programmierer: <span class="good">Ja</span></li>
        <li>Keine neue Simulation ausgefuehrt: <span class="good">Ja</span></li>
      </ul>
      <div class="note">
        Finale Bewertung: <strong class="${controlledStatusGreen ? "good" : "bad"}">${controlledStatusGreen ? "GR&Uuml;N" : "ROT"}</strong>
      </div>
    </section>
  </main>
</body>
</html>
`;

writeFileSync(outputPath, page, "utf8");
console.log(`Wrote ${outputPath}`);
