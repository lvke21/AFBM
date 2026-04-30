import { FirebaseOnlineLeagueRepository } from "./repositories/firebase-online-league-repository";
import { LocalOnlineLeagueRepository } from "./repositories/local-online-league-repository";
import type { OnlineBackendMode, OnlineLeagueRepository } from "./types";

let repositoryOverride: OnlineLeagueRepository | null = null;
const publicOnlineBackendMode = process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND;

export function getOnlineBackendMode(
  env: Record<string, string | undefined> = process.env,
): OnlineBackendMode {
  const value =
    env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND ?? publicOnlineBackendMode ?? env.AFBM_ONLINE_BACKEND;

  return value === "firebase" ? "firebase" : "local";
}

export function getOnlineLeagueRepository(): OnlineLeagueRepository {
  if (repositoryOverride) {
    return repositoryOverride;
  }

  return getOnlineBackendMode() === "firebase"
    ? new FirebaseOnlineLeagueRepository()
    : new LocalOnlineLeagueRepository();
}

export function setOnlineLeagueRepositoryForTest(repository: OnlineLeagueRepository | null) {
  repositoryOverride = repository;
}
