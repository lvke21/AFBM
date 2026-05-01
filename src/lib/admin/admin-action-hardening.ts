import { isSafeOnlineSyncId } from "@/lib/online/sync-guards";

export function isSafeAdminEntityId(id: string | null | undefined): id is string {
  return isSafeOnlineSyncId(id);
}

export function normalizeBoundedAdminInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const normalized = Math.floor(value ?? fallback);

  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  return Math.min(Math.max(normalized, min), max);
}

export function createAdminSimulationLockId(leagueId: string, season: number, week: number) {
  return `${leagueId}-simulate-s${season}-w${week}`;
}

export function normalizeExpectedAdminSimulationStep(input: {
  season?: number;
  week?: number;
}) {
  const season = Math.floor(input.season ?? 0);
  const week = Math.floor(input.week ?? 0);

  if (!Number.isFinite(season) || season < 1 || !Number.isFinite(week) || week < 1 || week > 18) {
    return null;
  }

  return {
    season,
    week,
  };
}
