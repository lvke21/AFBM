import { RosterStatus, type RosterStatus as RosterStatusValue } from "./enums";

const ROSTER_STATUS_VALUES = new Set<RosterStatusValue>(Object.values(RosterStatus));
const ACTIVE_ROSTER_LIMIT_STATUSES = new Set<RosterStatusValue>([
  RosterStatus.STARTER,
  RosterStatus.ROTATION,
  RosterStatus.BACKUP,
  RosterStatus.INACTIVE,
]);
const GAME_DAY_ELIGIBLE_STATUSES = new Set<RosterStatusValue>([
  RosterStatus.STARTER,
  RosterStatus.ROTATION,
  RosterStatus.BACKUP,
]);

export function isRosterStatus(value: string): value is RosterStatusValue {
  return ROSTER_STATUS_VALUES.has(value as RosterStatusValue);
}

export function parseRosterStatus(value: string): RosterStatusValue {
  if (!isRosterStatus(value)) {
    throw new Error(`Invalid roster status: ${value}`);
  }

  return value;
}

export function countsTowardActiveRosterLimit(status: RosterStatusValue | string) {
  return ACTIVE_ROSTER_LIMIT_STATUSES.has(status as RosterStatusValue);
}

export function isGameDayEligibleRosterStatus(status: RosterStatusValue | string) {
  return GAME_DAY_ELIGIBLE_STATUSES.has(status as RosterStatusValue);
}

export function shouldClearLineupAssignments(status: RosterStatusValue | string) {
  return !isGameDayEligibleRosterStatus(status);
}
