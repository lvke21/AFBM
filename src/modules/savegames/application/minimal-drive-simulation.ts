import { createRng, randomSourceNext, type RandomSource } from "@/lib/random/seeded-rng";

type MinimalDriveTeam = {
  abbreviation: string;
  id: string;
  name: string;
  overallRating: number;
};

type GeneratedDrive = {
  defenseTeamAbbreviation: string;
  defenseTeamId: string;
  endedAwayScore: number;
  endedHomeScore: number;
  offenseTeamAbbreviation: string;
  offenseTeamId: string;
  passAttempts: number;
  phaseLabel: string;
  plays: number;
  pointsScored: number;
  primaryDefenderName: string | null;
  primaryPlayerName: string | null;
  redZoneTrip: boolean;
  resultType: "FIELD_GOAL" | "PUNT" | "TOUCHDOWN" | "TURNOVER";
  rushAttempts: number;
  sequence: number;
  startedAwayScore: number;
  startedHomeScore: number;
  summary: string;
  timeOfPossessionSeconds: number;
  totalYards: number;
  turnover: boolean;
};

type GeneratedTeamStats = {
  explosivePlays: number;
  firstDowns: number;
  passingYards: number;
  redZoneTouchdowns: number;
  redZoneTrips: number;
  rushingYards: number;
  sacks: number;
  timeOfPossessionSeconds: number;
  totalYards: number;
  turnovers: number;
};

export type MinimalDriveSimulationResult = {
  awayScore: number;
  awayStats: GeneratedTeamStats;
  drives: GeneratedDrive[];
  homeScore: number;
  homeStats: GeneratedTeamStats;
  seed: string;
};

type SimulationInput = {
  awayTeam: MinimalDriveTeam;
  homeTeam: MinimalDriveTeam;
  matchId: string;
  week: number;
};

type GameProfile = {
  fieldGoalWeight: number;
  puntWeight: number;
  touchdownWeight: number;
  turnoverWeight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function selectGameProfile(random: () => number): GameProfile {
  const profileRoll = random();
  const scoringVariance = random() * 0.04 - 0.02;

  if (profileRoll < 0.3) {
    return {
      fieldGoalWeight: 0.15 + scoringVariance,
      puntWeight: 0.63 - scoringVariance,
      touchdownWeight: 0.12 + scoringVariance,
      turnoverWeight: 0.1,
    };
  }

  if (profileRoll < 0.6) {
    return {
      fieldGoalWeight: 0.21 + scoringVariance,
      puntWeight: 0.45 - scoringVariance,
      touchdownWeight: 0.25 + scoringVariance,
      turnoverWeight: 0.09,
    };
  }

  return {
    fieldGoalWeight: 0.18 + scoringVariance,
    puntWeight: 0.53 - scoringVariance,
    touchdownWeight: 0.18 + scoringVariance,
    turnoverWeight: 0.11,
  };
}

function emptyStats(): GeneratedTeamStats {
  return {
    explosivePlays: 0,
    firstDowns: 0,
    passingYards: 0,
    redZoneTouchdowns: 0,
    redZoneTrips: 0,
    rushingYards: 0,
    sacks: 0,
    timeOfPossessionSeconds: 0,
    totalYards: 0,
    turnovers: 0,
  };
}

function formatClock(seconds: number) {
  const clamped = clamp(Math.floor(seconds), 0, 15 * 60);
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = String(clamped % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function driveResult(
  random: () => number,
  offense: MinimalDriveTeam,
  defense: MinimalDriveTeam,
  profile: GameProfile,
): GeneratedDrive["resultType"] {
  const ratingEdge = clamp((offense.overallRating - defense.overallRating) / 100, -0.1, 0.1);
  const touchdownWeight = clamp(profile.touchdownWeight + ratingEdge * 0.55, 0.08, 0.34);
  const fieldGoalWeight = clamp(profile.fieldGoalWeight + ratingEdge * 0.25, 0.1, 0.28);
  const turnoverWeight = clamp(profile.turnoverWeight - ratingEdge * 0.25, 0.05, 0.15);
  const puntWeight = clamp(profile.puntWeight - ratingEdge * 0.55, 0.35, 0.68);
  const totalWeight = touchdownWeight + fieldGoalWeight + turnoverWeight + puntWeight;
  const roll = random() * totalWeight;

  if (roll < touchdownWeight) {
    return "TOUCHDOWN";
  }

  if (roll < touchdownWeight + fieldGoalWeight) {
    return "FIELD_GOAL";
  }

  if (roll < touchdownWeight + fieldGoalWeight + turnoverWeight) {
    return "TURNOVER";
  }

  return "PUNT";
}

function yardsForResult(random: () => number, result: GeneratedDrive["resultType"]) {
  if (result === "TOUCHDOWN") {
    return randInt(random, 64, 82);
  }

  if (result === "FIELD_GOAL") {
    return randInt(random, 38, 61);
  }

  if (result === "TURNOVER") {
    return randInt(random, -4, 47);
  }

  return randInt(random, 6, 43);
}

function driveSummary(input: {
  clock: string;
  offense: MinimalDriveTeam;
  plays: number;
  result: GeneratedDrive["resultType"];
  yards: number;
}) {
  const start = `${input.clock}: ${input.offense.abbreviation} startet an der eigenen 25.`;

  if (input.result === "TOUCHDOWN") {
    return `${start} Big Play bringt den Drive in die Red Zone. Touchdown nach ${input.plays} Plays und ${input.yards} Yards.`;
  }

  if (input.result === "FIELD_GOAL") {
    return `${start} Red Zone erreicht, aber die Defense haelt. Field Goal nach ${input.plays} Plays und ${input.yards} Yards.`;
  }

  if (input.result === "TURNOVER") {
    return `${start} Der Drive kippt nach ${input.plays} Plays: Turnover nach ${input.yards} Yards.`;
  }

  if (input.yards >= 32) {
    return `${start} Ein Big Play bewegt die Chains, aber der Drive endet nach ${input.plays} Plays mit Punt.`;
  }

  return `${start} Die Defense erzwingt nach ${input.plays} Plays einen Punt.`;
}

function applyDriveStats(stats: GeneratedTeamStats, drive: GeneratedDrive) {
  const positiveYards = Math.max(drive.totalYards, 0);

  stats.totalYards += drive.totalYards;
  stats.passingYards += Math.round(positiveYards * (drive.passAttempts / Math.max(drive.plays, 1)));
  stats.rushingYards += Math.max(0, positiveYards - Math.round(positiveYards * (drive.passAttempts / Math.max(drive.plays, 1))));
  stats.firstDowns += Math.max(0, Math.floor(positiveYards / 10));
  stats.explosivePlays += drive.totalYards >= 45 ? 1 : 0;
  stats.redZoneTrips += drive.redZoneTrip ? 1 : 0;
  stats.redZoneTouchdowns += drive.resultType === "TOUCHDOWN" ? 1 : 0;
  stats.timeOfPossessionSeconds += drive.timeOfPossessionSeconds;
  stats.turnovers += drive.turnover ? 1 : 0;
}

function buildMinimalDriveSeed(input: SimulationInput) {
  return `minimal-drive:${input.matchId}:w${input.week}:${input.homeTeam.overallRating}-${input.awayTeam.overallRating}`;
}

export function simulateMinimalDriveGame(
  input: SimulationInput,
  rng: RandomSource = createRng(buildMinimalDriveSeed(input)),
): MinimalDriveSimulationResult {
  const seed = buildMinimalDriveSeed(input);
  const random = randomSourceNext(rng);
  const drives: GeneratedDrive[] = [];
  const homeStats = emptyStats();
  const awayStats = emptyStats();
  const gameProfile = selectGameProfile(random);
  let homeScore = 0;
  let awayScore = 0;
  let offense = random() >= 0.5 ? input.homeTeam : input.awayTeam;
  let defense = offense.id === input.homeTeam.id ? input.awayTeam : input.homeTeam;

  for (let quarter = 1; quarter <= 4; quarter += 1) {
    let clock = 15 * 60;

    while (clock > 0 && drives.length < quarter * 4) {
      const startedHomeScore = homeScore;
      const startedAwayScore = awayScore;
      const result = driveResult(random, offense, defense, gameProfile);
      const plays = result === "PUNT" ? randInt(random, 3, 7) : randInt(random, 5, 10);
      const passAttempts = clamp(randInt(random, Math.floor(plays * 0.35), Math.ceil(plays * 0.65)), 1, plays - 1);
      const rushAttempts = plays - passAttempts;
      const totalYards = yardsForResult(random, result);
      const pointsScored = result === "TOUCHDOWN" ? 7 : result === "FIELD_GOAL" ? 3 : 0;
      const timeOfPossessionSeconds = clamp(randInt(random, plays * 24, plays * 42), 75, clock);
      const phaseLabel = `Q${quarter} ${formatClock(clock)}`;
      const redZoneTrip = result === "TOUCHDOWN" || result === "FIELD_GOAL";

      if (offense.id === input.homeTeam.id) {
        homeScore += pointsScored;
      } else {
        awayScore += pointsScored;
      }

      const drive: GeneratedDrive = {
        defenseTeamAbbreviation: defense.abbreviation,
        defenseTeamId: defense.id,
        endedAwayScore: awayScore,
        endedHomeScore: homeScore,
        offenseTeamAbbreviation: offense.abbreviation,
        offenseTeamId: offense.id,
        passAttempts,
        phaseLabel,
        plays,
        pointsScored,
        primaryDefenderName: null,
        primaryPlayerName: null,
        redZoneTrip,
        resultType: result,
        rushAttempts,
        sequence: drives.length + 1,
        startedAwayScore,
        startedHomeScore,
        summary: driveSummary({
          clock: phaseLabel,
          offense,
          plays,
          result,
          yards: totalYards,
        }),
        timeOfPossessionSeconds,
        totalYards,
        turnover: result === "TURNOVER",
      };

      drives.push(drive);
      applyDriveStats(offense.id === input.homeTeam.id ? homeStats : awayStats, drive);

      clock -= timeOfPossessionSeconds;
      [offense, defense] = [defense, offense];
    }
  }

  if (homeScore === awayScore) {
    const offenseWinsTiebreak =
      input.homeTeam.overallRating === input.awayTeam.overallRating
        ? random() >= 0.5
        : input.homeTeam.overallRating > input.awayTeam.overallRating;
    const offenseTeam = offenseWinsTiebreak ? input.homeTeam : input.awayTeam;
    const defenseTeam = offenseWinsTiebreak ? input.awayTeam : input.homeTeam;
    const startedHomeScore = homeScore;
    const startedAwayScore = awayScore;

    if (offenseTeam.id === input.homeTeam.id) {
      homeScore += 3;
    } else {
      awayScore += 3;
    }

    const drive: GeneratedDrive = {
      defenseTeamAbbreviation: defenseTeam.abbreviation,
      defenseTeamId: defenseTeam.id,
      endedAwayScore: awayScore,
      endedHomeScore: homeScore,
      offenseTeamAbbreviation: offenseTeam.abbreviation,
      offenseTeamId: offenseTeam.id,
      passAttempts: 3,
      phaseLabel: "Q4 0:38",
      plays: 6,
      pointsScored: 3,
      primaryDefenderName: null,
      primaryPlayerName: null,
      redZoneTrip: true,
      resultType: "FIELD_GOAL",
      rushAttempts: 3,
      sequence: drives.length + 1,
      startedAwayScore,
      startedHomeScore,
      summary: `Q4 0:38: ${offenseTeam.abbreviation} bekommt den letzten Drive. Red Zone erreicht, Field Goal entscheidet das Spiel.`,
      timeOfPossessionSeconds: 38,
      totalYards: 41,
      turnover: false,
    };

    drives.push(drive);
    applyDriveStats(offenseTeam.id === input.homeTeam.id ? homeStats : awayStats, drive);
  }

  return {
    awayScore,
    awayStats,
    drives,
    homeScore,
    homeStats,
    seed,
  };
}
