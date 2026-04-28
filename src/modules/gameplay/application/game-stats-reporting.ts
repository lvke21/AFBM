import {
  type DriveResultType,
  type DriveStats,
  type GameStats,
  type PlayerStats,
  type PlayStats,
  type TeamStats,
} from "../domain/game-stats";
import { aggregateGameStats } from "./game-stats-aggregation";

export type GameStatsReportOptions = {
  aggregateBeforeReport?: boolean;
  maxKeyPlays?: number;
  maxTopPerformers?: number;
};

export type TeamStatsReportRow = {
  teamId: string;
  opponentTeamId: string;
  points: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  firstDowns: number;
  timeOfPossessionSeconds: number;
  timeOfPossession: string;
  sacks: number;
  explosivePlays: number;
  redZone: string;
};

export type PlayerStatsReportTables = {
  passing: PassingPlayerReportRow[];
  rushing: RushingPlayerReportRow[];
  receiving: ReceivingPlayerReportRow[];
  defensive: DefensivePlayerReportRow[];
  specialTeams: SpecialTeamsPlayerReportRow[];
};

export type PassingPlayerReportRow = {
  playerId: string;
  teamId: string;
  name: string;
  attempts: number;
  completions: number;
  yards: number;
  touchdowns: number;
  interceptions: number;
  sacksTaken: number;
};

export type RushingPlayerReportRow = {
  playerId: string;
  teamId: string;
  name: string;
  carries: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
};

export type ReceivingPlayerReportRow = {
  playerId: string;
  teamId: string;
  name: string;
  targets: number;
  receptions: number;
  yards: number;
  touchdowns: number;
};

export type DefensivePlayerReportRow = {
  playerId: string;
  teamId: string;
  name: string;
  tackles: number;
  sacks: number;
  interceptions: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
};

export type SpecialTeamsPlayerReportRow = {
  playerId: string;
  teamId: string;
  name: string;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  punts: number;
  puntYards: number;
};

export type DriveSummaryReportRow = {
  driveId: string;
  sequence: number;
  offenseTeamId: string;
  defenseTeamId: string;
  startPosition: string;
  plays: number;
  yards: number;
  result: DriveResultType;
  pointsScored: number;
  timeOfPossessionSeconds: number;
  timeOfPossession: string;
};

export type KeyPlayReportRow = {
  playId: string;
  driveId: string;
  sequenceInGame: number;
  offenseTeamId: string;
  defenseTeamId: string;
  playType: string;
  yards: number;
  pointsScored: number;
  tags: string[];
  description: string;
};

export type TopPerformerReportRow = {
  playerId: string;
  teamId: string;
  name: string;
  category: "PASSING" | "RUSHING" | "RECEIVING" | "DEFENSE" | "SPECIAL_TEAMS";
  value: number;
  label: string;
};

export type GameStatsReport = {
  gameId: string;
  source: GameStats["source"];
  score: {
    homeTeamId: string;
    awayTeamId: string;
    home: number;
    away: number;
  };
  teamStats: TeamStatsReportRow[];
  playerTables: PlayerStatsReportTables;
  drives: DriveSummaryReportRow[];
  keyPlays: KeyPlayReportRow[];
  topPerformers: TopPerformerReportRow[];
};

const DEFAULT_KEY_PLAY_LIMIT = 12;
const DEFAULT_TOP_PERFORMER_LIMIT = 8;

export function createGameStatsReport(
  gameStats: GameStats,
  options: GameStatsReportOptions = {},
): GameStatsReport {
  const normalized =
    options.aggregateBeforeReport === false
      ? gameStats
      : aggregateGameStats(gameStats);

  return {
    gameId: normalized.gameId,
    source: normalized.source,
    score: {
      homeTeamId: normalized.homeTeamId,
      awayTeamId: normalized.awayTeamId,
      home: normalized.finalScore.home,
      away: normalized.finalScore.away,
    },
    teamStats: normalized.teamStats
      .map(toTeamStatsReportRow)
      .sort((left, right) => right.points - left.points),
    playerTables: createPlayerTables(normalized.playerStats),
    drives: normalized.drives.map(toDriveSummaryReportRow),
    keyPlays: createKeyPlays(normalized.drives).slice(
      0,
      options.maxKeyPlays ?? DEFAULT_KEY_PLAY_LIMIT,
    ),
    topPerformers: createTopPerformers(normalized.playerStats).slice(
      0,
      options.maxTopPerformers ?? DEFAULT_TOP_PERFORMER_LIMIT,
    ),
  };
}

export function exportGameStatsReportJson(
  report: GameStatsReport,
  pretty = true,
) {
  return JSON.stringify(report, null, pretty ? 2 : 0);
}

export function exportGameStatsJson(
  gameStats: GameStats,
  options: GameStatsReportOptions & { pretty?: boolean } = {},
) {
  return exportGameStatsReportJson(
    createGameStatsReport(gameStats, options),
    options.pretty ?? true,
  );
}

export function renderGameStatsHtmlReport(report: GameStatsReport) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Game Stats Report ${escapeHtml(report.gameId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #1f2937; }
    h1, h2 { margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 28px; }
    th, td { border-bottom: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; font-weight: 700; }
    .score { font-size: 24px; font-weight: 700; margin: 8px 0 24px; }
    .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #e5e7eb; margin-right: 4px; }
  </style>
</head>
<body>
  <h1>Game Stats Report</h1>
  <div class="score">${escapeHtml(report.score.homeTeamId)} ${report.score.home} - ${report.score.away} ${escapeHtml(report.score.awayTeamId)}</div>
  <section>
    <h2>Team Stats</h2>
    ${renderTable(report.teamStats, [
      ["Team", "teamId"],
      ["Pts", "points"],
      ["Yards", "totalYards"],
      ["Pass", "passingYards"],
      ["Rush", "rushingYards"],
      ["1st", "firstDowns"],
      ["TO", "turnovers"],
      ["TOP", "timeOfPossession"],
      ["Sacks", "sacks"],
      ["Expl", "explosivePlays"],
      ["RZ", "redZone"],
    ])}
  </section>
  <section>
    <h2>Top Performer</h2>
    ${renderTable(report.topPerformers, [
      ["Player", "name"],
      ["Team", "teamId"],
      ["Kategorie", "category"],
      ["Wert", "value"],
      ["Label", "label"],
    ])}
  </section>
  <section>
    <h2>Player Passing</h2>
    ${renderTable(report.playerTables.passing, [
      ["Player", "name"],
      ["Team", "teamId"],
      ["Comp", "completions"],
      ["Att", "attempts"],
      ["Yards", "yards"],
      ["TD", "touchdowns"],
      ["INT", "interceptions"],
      ["Sacks", "sacksTaken"],
    ])}
  </section>
  <section>
    <h2>Player Rushing</h2>
    ${renderTable(report.playerTables.rushing, [
      ["Player", "name"],
      ["Team", "teamId"],
      ["Car", "carries"],
      ["Yards", "yards"],
      ["TD", "touchdowns"],
      ["Fum", "fumbles"],
    ])}
  </section>
  <section>
    <h2>Player Receiving</h2>
    ${renderTable(report.playerTables.receiving, [
      ["Player", "name"],
      ["Team", "teamId"],
      ["Rec", "receptions"],
      ["Tgt", "targets"],
      ["Yards", "yards"],
      ["TD", "touchdowns"],
    ])}
  </section>
  <section>
    <h2>Player Defense</h2>
    ${renderTable(report.playerTables.defensive, [
      ["Player", "name"],
      ["Team", "teamId"],
      ["Tkl", "tackles"],
      ["Sack", "sacks"],
      ["INT", "interceptions"],
      ["FF", "forcedFumbles"],
      ["FR", "fumbleRecoveries"],
    ])}
  </section>
  <section>
    <h2>Drive Summary</h2>
    ${renderTable(report.drives, [
      ["#", "sequence"],
      ["Off", "offenseTeamId"],
      ["Start", "startPosition"],
      ["Plays", "plays"],
      ["Yards", "yards"],
      ["Result", "result"],
      ["Pts", "pointsScored"],
      ["TOP", "timeOfPossession"],
    ])}
  </section>
  <section>
    <h2>Key Plays</h2>
    ${renderKeyPlayTable(report.keyPlays)}
  </section>
</body>
</html>`;
}

export function renderGameStatsHtmlReportFromStats(
  gameStats: GameStats,
  options: GameStatsReportOptions = {},
) {
  return renderGameStatsHtmlReport(createGameStatsReport(gameStats, options));
}

function toTeamStatsReportRow(stats: TeamStats): TeamStatsReportRow {
  return {
    teamId: stats.teamId,
    opponentTeamId: stats.opponentTeamId,
    points: stats.points,
    totalYards: stats.totalYards,
    passingYards: stats.passingYards,
    rushingYards: stats.rushingYards,
    turnovers: stats.turnovers,
    firstDowns: stats.firstDowns,
    timeOfPossessionSeconds: stats.timeOfPossessionSeconds,
    timeOfPossession: formatClock(stats.timeOfPossessionSeconds),
    sacks: stats.sacks,
    explosivePlays: stats.explosivePlays,
    redZone: `${stats.redZoneTouchdowns}/${stats.redZoneTrips}`,
  };
}

function createPlayerTables(players: PlayerStats[]): PlayerStatsReportTables {
  return {
    passing: players
      .filter((player) => player.passing.attempts > 0 || player.passing.sacksTaken > 0)
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        attempts: player.passing.attempts,
        completions: player.passing.completions,
        yards: player.passing.yards,
        touchdowns: player.passing.touchdowns,
        interceptions: player.passing.interceptions,
        sacksTaken: player.passing.sacksTaken,
      }))
      .sort((left, right) => right.yards - left.yards),
    rushing: players
      .filter((player) => player.rushing.carries > 0)
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        carries: player.rushing.carries,
        yards: player.rushing.yards,
        touchdowns: player.rushing.touchdowns,
        fumbles: player.rushing.fumbles,
      }))
      .sort((left, right) => right.yards - left.yards),
    receiving: players
      .filter((player) => player.receiving.targets > 0 || player.receiving.receptions > 0)
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        targets: player.receiving.targets,
        receptions: player.receiving.receptions,
        yards: player.receiving.yards,
        touchdowns: player.receiving.touchdowns,
      }))
      .sort((left, right) => right.yards - left.yards),
    defensive: players
      .filter((player) =>
        player.defensive.tackles > 0 ||
        player.defensive.sacks > 0 ||
        player.defensive.interceptions > 0 ||
        player.defensive.forcedFumbles > 0 ||
        player.defensive.fumbleRecoveries > 0,
      )
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        tackles: player.defensive.tackles,
        sacks: player.defensive.sacks,
        interceptions: player.defensive.interceptions,
        forcedFumbles: player.defensive.forcedFumbles,
        fumbleRecoveries: player.defensive.fumbleRecoveries,
      }))
      .sort((left, right) => defensiveValue(right) - defensiveValue(left)),
    specialTeams: players
      .filter((player) =>
        player.specialTeams.fieldGoalsAttempted > 0 ||
        player.specialTeams.punts > 0,
      )
      .map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        fieldGoalsMade: player.specialTeams.fieldGoalsMade,
        fieldGoalsAttempted: player.specialTeams.fieldGoalsAttempted,
        punts: player.specialTeams.punts,
        puntYards: player.specialTeams.puntYards,
      }))
      .sort((left, right) =>
        right.fieldGoalsMade - left.fieldGoalsMade ||
        right.puntYards - left.puntYards,
      ),
  };
}

function toDriveSummaryReportRow(drive: DriveStats): DriveSummaryReportRow {
  return {
    driveId: drive.driveId,
    sequence: drive.sequence,
    offenseTeamId: drive.offenseTeamId,
    defenseTeamId: drive.defenseTeamId,
    startPosition: formatFieldPosition(drive.startState.fieldPosition.yardLine),
    plays: drive.playCount,
    yards: drive.yards,
    result: drive.result,
    pointsScored: drive.pointsScored,
    timeOfPossessionSeconds: drive.timeOfPossessionSeconds,
    timeOfPossession: formatClock(drive.timeOfPossessionSeconds),
  };
}

function createKeyPlays(drives: DriveStats[]) {
  return drives
    .flatMap((drive) => drive.plays)
    .map(toKeyPlayReportRow)
    .filter((play) => play.tags.length > 0)
    .sort((left, right) => keyPlayValue(right) - keyPlayValue(left));
}

function toKeyPlayReportRow(play: PlayStats): KeyPlayReportRow {
  const tags = [
    ...play.resultTypes.filter((result) =>
      ["EXPLOSIVE", "TOUCHDOWN", "TURNOVER", "NEGATIVE"].includes(result),
    ),
    play.playType === "SACK" ? "SACK" : null,
    play.playType === "FIELD_GOAL" && play.pointsScored > 0 ? "FIELD_GOAL" : null,
  ].filter((tag): tag is string => tag != null);

  return {
    playId: play.playId,
    driveId: play.driveId,
    sequenceInGame: play.sequenceInGame,
    offenseTeamId: play.offenseTeamId,
    defenseTeamId: play.defenseTeamId,
    playType: play.playType,
    yards: play.yardsGained,
    pointsScored: play.pointsScored,
    tags,
    description: describePlay(play, tags),
  };
}

function createTopPerformers(players: PlayerStats[]) {
  const performers: TopPerformerReportRow[] = [];

  for (const player of players) {
    if (player.passing.yards > 0) {
      performers.push({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        category: "PASSING",
        value: player.passing.yards,
        label: `${player.passing.completions}/${player.passing.attempts}, ${player.passing.yards} yds`,
      });
    }

    if (player.rushing.yards > 0) {
      performers.push({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        category: "RUSHING",
        value: player.rushing.yards,
        label: `${player.rushing.carries} car, ${player.rushing.yards} yds`,
      });
    }

    if (player.receiving.yards > 0) {
      performers.push({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        category: "RECEIVING",
        value: player.receiving.yards,
        label: `${player.receiving.receptions} rec, ${player.receiving.yards} yds`,
      });
    }

    const defenseScore = defensivePlayerValue(player);
    if (defenseScore > 0) {
      performers.push({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        category: "DEFENSE",
        value: defenseScore,
        label: `${player.defensive.tackles} tkl, ${player.defensive.sacks} sack, ${player.defensive.interceptions} int`,
      });
    }

    if (player.specialTeams.fieldGoalsMade > 0) {
      performers.push({
        playerId: player.playerId,
        teamId: player.teamId,
        name: playerName(player),
        category: "SPECIAL_TEAMS",
        value: player.specialTeams.fieldGoalsMade * 3,
        label: `${player.specialTeams.fieldGoalsMade}/${player.specialTeams.fieldGoalsAttempted} FG`,
      });
    }
  }

  return performers.sort((left, right) => right.value - left.value);
}

function describePlay(play: PlayStats, tags: string[]) {
  const tagText = tags.length > 0 ? `${tags.join(", ")} ` : "";
  const yardText = play.yardsGained === 1 ? "1 yard" : `${play.yardsGained} yards`;
  const pointText = play.pointsScored > 0 ? `, ${play.pointsScored} points` : "";

  return `${tagText}${play.playType} by ${play.offenseTeamId} for ${yardText}${pointText}`;
}

function keyPlayValue(play: KeyPlayReportRow) {
  return (
    Math.abs(play.yards) +
    play.pointsScored * 20 +
    (play.tags.includes("TOUCHDOWN") ? 40 : 0) +
    (play.tags.includes("TURNOVER") ? 35 : 0) +
    (play.tags.includes("EXPLOSIVE") ? 20 : 0) +
    (play.tags.includes("SACK") ? 14 : 0)
  );
}

function defensivePlayerValue(player: PlayerStats) {
  return (
    player.defensive.tackles +
    player.defensive.sacks * 6 +
    player.defensive.interceptions * 8 +
    player.defensive.forcedFumbles * 5 +
    player.defensive.fumbleRecoveries * 5
  );
}

function defensiveValue(player: DefensivePlayerReportRow) {
  return (
    player.tackles +
    player.sacks * 6 +
    player.interceptions * 8 +
    player.forcedFumbles * 5 +
    player.fumbleRecoveries * 5
  );
}

function playerName(player: PlayerStats) {
  return player.snapshotFullName ?? player.playerId;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.abs(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatFieldPosition(yardLine: number) {
  if (yardLine === 50) {
    return "50";
  }

  return yardLine < 50 ? `Own ${yardLine}` : `Opp ${100 - yardLine}`;
}

function renderKeyPlayTable(rows: KeyPlayReportRow[]) {
  if (rows.length === 0) {
    return "<p>Keine Key Plays.</p>";
  }

  const body = rows
    .map(
      (row) => `<tr><td>${row.sequenceInGame}</td><td>${escapeHtml(row.offenseTeamId)}</td><td>${escapeHtml(row.playType)}</td><td>${row.yards}</td><td>${row.pointsScored}</td><td>${row.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</td><td>${escapeHtml(row.description)}</td></tr>`,
    )
    .join("");

  return `<table><thead><tr><th>#</th><th>Off</th><th>Type</th><th>Yards</th><th>Pts</th><th>Tags</th><th>Beschreibung</th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderTable<TRow extends Record<string, unknown>>(
  rows: TRow[],
  columns: Array<[string, keyof TRow]>,
) {
  if (rows.length === 0) {
    return "<p>Keine Daten.</p>";
  }

  const header = columns
    .map(([label]) => `<th>${escapeHtml(label)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(([, key]) => `<td>${escapeHtml(String(row[key] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
