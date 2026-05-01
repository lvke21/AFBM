import { FirebaseOnlineLeagueRepository } from "./repositories/firebase-online-league-repository";
import { LocalOnlineLeagueRepository } from "./repositories/local-online-league-repository";
import type { OnlineBackendMode, OnlineLeagueRepository } from "./types";

let repositoryOverride: OnlineLeagueRepository | null = null;
let cachedRepository: OnlineLeagueRepository | null = null;
let cachedRepositoryMode: OnlineBackendMode | null = null;
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

  const mode = getOnlineBackendMode();

  if (cachedRepository && cachedRepositoryMode === mode) {
    return cachedRepository;
  }

  cachedRepository =
    mode === "firebase"
      ? new FirebaseOnlineLeagueRepository()
      : new LocalOnlineLeagueRepository();
  cachedRepositoryMode = mode;

  return cachedRepository;
}

export function setOnlineLeagueRepositoryForTest(repository: OnlineLeagueRepository | null) {
  repositoryOverride = repository;
  cachedRepository = null;
  cachedRepositoryMode = null;
}
