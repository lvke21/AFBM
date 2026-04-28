import type { PlayerCompositeRatings } from "@/modules/players/domain/player-rating";

function clamp(value: number, min = 45, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

type TeamSchemeCodes = {
  offense: string | null;
  defense: string | null;
  specialTeams: string | null;
};

type SchemeFitInput = {
  positionGroupCode: string;
  playerSchemeCode: string | null;
  teamSchemes: TeamSchemeCodes;
  compositeRatings: PlayerCompositeRatings;
};

function schemeScoreForOffense(
  schemeCode: string,
  ratings: PlayerCompositeRatings,
) {
  switch (schemeCode) {
    case "POWER_RUN":
      return (
        ratings.runBlocking * 0.38 +
        ratings.ballCarrier * 0.32 +
        ratings.protection * 0.18 +
        ratings.command * 0.12
      );
    case "SPREAD_ATTACK":
      return (
        ratings.receiving * 0.34 +
        ratings.passing * 0.26 +
        ratings.mobility * 0.2 +
        ratings.hands * 0.2
      );
    case "WEST_COAST":
      return (
        ratings.passing * 0.3 +
        ratings.command * 0.25 +
        ratings.receiving * 0.23 +
        ratings.hands * 0.22
      );
    case "AIR_RAID":
      return (
        ratings.passing * 0.4 +
        ratings.receiving * 0.3 +
        ratings.mobility * 0.18 +
        ratings.hands * 0.12
      );
    case "BALANCED_OFFENSE":
    default:
      return (
        ratings.passing * 0.24 +
        ratings.ballCarrier * 0.2 +
        ratings.receiving * 0.2 +
        ratings.runBlocking * 0.2 +
        ratings.protection * 0.16
      );
  }
}

function schemeScoreForDefense(
  schemeCode: string,
  ratings: PlayerCompositeRatings,
) {
  switch (schemeCode) {
    case "THREE_FOUR_FRONT":
      return (
        ratings.passRush * 0.32 +
        ratings.runDefense * 0.28 +
        ratings.linebackerCoverage * 0.22 +
        ratings.command * 0.18
      );
    case "PRESS_MAN":
      return ratings.coverage * 0.55 + ratings.ballHawk * 0.45;
    case "ZONE_DISCIPLINE":
      return (
        ratings.coverage * 0.4 +
        ratings.linebackerCoverage * 0.32 +
        ratings.command * 0.28
      );
    case "FOUR_THREE_FRONT":
    default:
      return ratings.passRush * 0.48 + ratings.runDefense * 0.38 + ratings.command * 0.14;
  }
}

function schemeScoreForSpecialTeams(
  schemeCode: string,
  ratings: PlayerCompositeRatings,
) {
  switch (schemeCode) {
    case "POWER_LEG":
      return ratings.kicking * 0.45 + ratings.punting * 0.35 + ratings.specialistConsistency * 0.2;
    case "RETURN_SPARK":
      return ratings.returnGame * 0.52 + ratings.hands * 0.2 + ratings.specialistConsistency * 0.28;
    case "FIELD_POSITION":
    default:
      return ratings.punting * 0.4 + ratings.snapping * 0.25 + ratings.specialistConsistency * 0.35;
  }
}

function resolveTeamSchemeCode(positionGroupCode: string, teamSchemes: TeamSchemeCodes) {
  if (positionGroupCode === "OFFENSE") {
    return teamSchemes.offense;
  }

  if (positionGroupCode === "DEFENSE") {
    return teamSchemes.defense;
  }

  return teamSchemes.specialTeams;
}

export function computePlayerSchemeFitScore({
  positionGroupCode,
  playerSchemeCode,
  teamSchemes,
  compositeRatings,
}: SchemeFitInput) {
  const teamSchemeCode = resolveTeamSchemeCode(positionGroupCode, teamSchemes);

  if (!teamSchemeCode) {
    return null;
  }

  const rawScore =
    positionGroupCode === "OFFENSE"
      ? schemeScoreForOffense(teamSchemeCode, compositeRatings)
      : positionGroupCode === "DEFENSE"
        ? schemeScoreForDefense(teamSchemeCode, compositeRatings)
        : schemeScoreForSpecialTeams(teamSchemeCode, compositeRatings);

  const preferenceBonus =
    playerSchemeCode == null ? 0 : playerSchemeCode === teamSchemeCode ? 8 : -3;

  return clamp(rawScore + preferenceBonus);
}
