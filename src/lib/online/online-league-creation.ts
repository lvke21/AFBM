import type { OnlineLeague } from "./online-league-types";
import { ONLINE_MVP_TEAM_POOL } from "./online-league-constants";

export function createUserFacingLeagueId(name: string, existingLeagues: OnlineLeague[]) {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "online-liga";
  let nextId = base;
  let suffix = 2;
  const existingIds = new Set(existingLeagues.map((league) => league.id));

  while (existingIds.has(nextId)) {
    nextId = `${base}-${suffix}`;
    suffix += 1;
  }

  return nextId;
}

export function normalizeMaxUsers(maxUsers: number | undefined) {
  if (typeof maxUsers !== "number" || !Number.isFinite(maxUsers)) {
    return ONLINE_MVP_TEAM_POOL.length;
  }

  return Math.min(Math.max(Math.floor(maxUsers), 1), ONLINE_MVP_TEAM_POOL.length);
}

export function normalizeStartWeek(startWeek: number | undefined) {
  if (typeof startWeek !== "number" || !Number.isFinite(startWeek)) {
    return 1;
  }

  return Math.max(Math.floor(startWeek), 1);
}
