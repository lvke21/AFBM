import { normalizeMaxUsers } from "./online-league-creation";
import { normalizeOnlineSeasonNumber } from "./online-league-derived-state";
import { resetOnlineLeagueUserReadyState } from "./online-league-mappers";
import type {
  FranchiseStrategyType,
  OnlineLeague,
  OnlineGmExpectation,
  OnlineMediaExpectationGoal,
  OnlineLeagueStateRepairResult,
  OnlineLeagueStateValidationIssue,
  OnlineLeagueStateValidationResult,
  OnlineXFactorAbilityId,
  PlayerDevelopmentPath,
  TrainingIntensity,
  TrainingPlanSource,
  TrainingPrimaryFocus,
  TrainingRiskTolerance,
  TrainingSecondaryFocus,
  OnlineWeekFlowStatus,
} from "./online-league-types";

export function isOnlineWeekFlowStatus(value: unknown): value is OnlineWeekFlowStatus {
  return (
    value === "pre_week" ||
    value === "ready" ||
    value === "simulating" ||
    value === "completed" ||
    value === "post_game" ||
    value === "season_complete"
  );
}

export function isPlayerDevelopmentPath(value: unknown): value is PlayerDevelopmentPath {
  return value === "star" || value === "solid" || value === "bust";
}

export function isOnlineXFactorAbilityId(value: unknown): value is OnlineXFactorAbilityId {
  return value === "clutch" || value === "speed_burst" || value === "playmaker";
}

export function isOnlineMediaExpectationGoal(
  value: unknown,
): value is OnlineMediaExpectationGoal {
  return value === "rebuild" || value === "playoffs" || value === "championship";
}

export function isFranchiseStrategyType(value: unknown): value is FranchiseStrategyType {
  return (
    value === "rebuild" ||
    value === "win_now" ||
    value === "balanced" ||
    value === "youth_focus"
  );
}

export function isOnlineGmExpectation(value: unknown): value is OnlineGmExpectation {
  return (
    value === "rebuild" ||
    value === "competitive" ||
    value === "playoffs" ||
    value === "championship"
  );
}

export function isTrainingIntensity(value: unknown): value is TrainingIntensity {
  return value === "light" || value === "normal" || value === "hard" || value === "extreme";
}

export function isTrainingPrimaryFocus(value: unknown): value is TrainingPrimaryFocus {
  return (
    value === "offense" ||
    value === "defense" ||
    value === "balanced" ||
    value === "conditioning" ||
    value === "recovery" ||
    value === "player_development" ||
    value === "team_chemistry"
  );
}

export function isTrainingSecondaryFocus(value: unknown): value is TrainingSecondaryFocus {
  return (
    value === "passing_game" ||
    value === "running_game" ||
    value === "pass_protection" ||
    value === "pass_rush" ||
    value === "run_defense" ||
    value === "coverage" ||
    value === "turnovers" ||
    value === "red_zone" ||
    value === "two_minute_drill" ||
    value === "special_teams"
  );
}

export function isTrainingRiskTolerance(value: unknown): value is TrainingRiskTolerance {
  return value === "low" || value === "medium" || value === "high";
}

export function isTrainingPlanSource(value: unknown): value is TrainingPlanSource {
  return value === "gm_submitted" || value === "auto_default";
}

export function validateOnlineLeagueState(
  league: OnlineLeague,
): OnlineLeagueStateValidationResult {
  const issues: OnlineLeagueStateValidationIssue[] = [];
  const seenUserIds = new Set<string>();
  const seenAssignedTeamIds = new Set<string>();
  const activeUsers = league.users.filter((user) => user.teamStatus !== "vacant");

  if (!league.id.trim()) {
    issues.push({
      code: "missing-id",
      severity: "error",
      message: "Liga hat keine gültige ID.",
    });
  }

  if (league.status !== "waiting" && league.status !== "active") {
    issues.push({
      code: "invalid-status",
      severity: "error",
      message: "Liga hat keinen gültigen Status.",
    });
  }

  if (!Number.isFinite(league.currentWeek) || league.currentWeek < 1) {
    issues.push({
      code: "invalid-week",
      severity: "error",
      message: "Liga hat keine gültige aktuelle Woche.",
    });
  }

  if (
    league.currentSeason !== undefined &&
    (!Number.isFinite(league.currentSeason) || league.currentSeason < 1)
  ) {
    issues.push({
      code: "invalid-season",
      severity: "error",
      message: "Liga hat keine gültige aktuelle Saison.",
    });
  }

  if (!Number.isFinite(league.maxUsers) || league.maxUsers < 1) {
    issues.push({
      code: "invalid-max-users",
      severity: "error",
      message: "Liga hat keine gültige maximale Spieleranzahl.",
    });
  }

  if (activeUsers.length > league.maxUsers) {
    issues.push({
      code: "over-capacity",
      severity: "error",
      message: "Liga hat mehr aktive Mitglieder als erlaubte Slots.",
    });
  }

  for (const user of league.users) {
    if (seenUserIds.has(user.userId)) {
      issues.push({
        code: "duplicate-user",
        severity: "error",
        message: `User ${user.userId} ist mehrfach Mitglied derselben Liga.`,
      });
    }
    seenUserIds.add(user.userId);

    if (!user.teamId || !user.teamName) {
      issues.push({
        code: "missing-team-assignment",
        severity: "error",
        message: `User ${user.username} hat keine vollständige Team-Zuweisung.`,
      });
    }

    if (user.teamStatus === "vacant" && user.readyForWeek) {
      issues.push({
        code: "ready-vacant-member",
        severity: "warning",
        message: `Vakantes Team ${user.teamDisplayName ?? user.teamName} ist noch ready markiert.`,
      });
    }

    if (user.teamStatus !== "vacant") {
      const assignmentKey = user.teamId;

      if (seenAssignedTeamIds.has(assignmentKey)) {
        issues.push({
          code: "duplicate-team",
          severity: "error",
          message: `Team ${user.teamDisplayName ?? user.teamName} ist mehrfach vergeben.`,
        });
      }
      seenAssignedTeamIds.add(assignmentKey);
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export function repairOnlineLeagueState(league: OnlineLeague): OnlineLeagueStateRepairResult {
  const before = validateOnlineLeagueState(league);
  const seenUserIds = new Set<string>();
  let repaired = false;

  const repairedUsers = league.users
    .filter((user) => {
      if (seenUserIds.has(user.userId)) {
        repaired = true;
        return false;
      }

      seenUserIds.add(user.userId);
      return true;
    })
    .map((user) => {
      if (user.teamStatus === "vacant" && user.readyForWeek) {
        repaired = true;
        return resetOnlineLeagueUserReadyState(user);
      }

      return user;
    });

  const safeLeague: OnlineLeague = {
    ...league,
    currentWeek:
      Number.isFinite(league.currentWeek) && league.currentWeek >= 1
        ? Math.floor(league.currentWeek)
        : 1,
    currentSeason:
      league.currentSeason === undefined
        ? league.currentSeason
        : normalizeOnlineSeasonNumber(league.currentSeason),
    maxUsers: normalizeMaxUsers(league.maxUsers),
    weekStatus: isOnlineWeekFlowStatus(league.weekStatus) ? league.weekStatus : "pre_week",
    users: repairedUsers,
  };

  if (
    safeLeague.currentWeek !== league.currentWeek ||
    safeLeague.currentSeason !== league.currentSeason ||
    safeLeague.maxUsers !== league.maxUsers ||
    safeLeague.weekStatus !== league.weekStatus
  ) {
    repaired = true;
  }

  return {
    league: safeLeague,
    repaired,
    issues: before.issues,
  };
}
