"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { OnlineLeague } from "@/lib/online/online-league-types";
import { getOnlineRecoveryCopy } from "@/lib/online/error-recovery";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { getOnlineLeagueById } from "@/lib/online/online-league-service";
import type { OnlineLeagueReadOptions, OnlineLeagueRepository } from "@/lib/online/types";
import { ensureCurrentOnlineUser, type OnlineUser } from "@/lib/online/online-user-service";
import {
  shouldAttemptOnlineLeagueRouteJoin,
  validateOnlineLeagueRouteState,
} from "./online-league-route-state-model";

export type OnlineLeagueRouteState = {
  repository: OnlineLeagueRepository;
  league: OnlineLeague | null;
  setLeague: Dispatch<SetStateAction<OnlineLeague | null>>;
  currentUser: OnlineUser | null;
  loaded: boolean;
  loadError: string | null;
  loadErrorRequiresSearch: boolean;
  retryLoad: () => void;
};

const OnlineLeagueRouteStateContext = createContext<OnlineLeagueRouteState | null>(null);

export function useOnlineLeagueRouteStateValue(
  leagueId: string,
  readOptions?: OnlineLeagueReadOptions,
): OnlineLeagueRouteState {
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const [league, setLeague] = useState<OnlineLeague | null>(null);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorRequiresSearch, setLoadErrorRequiresSearch] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const repositoryReadOptions = useMemo<OnlineLeagueReadOptions>(
    () => ({
      draftPlayerLimit: readOptions?.draftPlayerLimit,
      includeDraftPlayerPool: readOptions?.includeDraftPlayerPool,
    }),
    [readOptions?.draftPlayerLimit, readOptions?.includeDraftPlayerPool],
  );

  function retryLoad() {
    setLoaded(false);
    setLoadError(null);
    setLoadErrorRequiresSearch(false);
    setReloadToken((currentToken) => currentToken + 1);
  }

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {
      // no active subscription yet
    };

    function failRouteLoad(message: string, requiresSearch: boolean) {
      if (requiresSearch) {
        repository.clearLastLeagueId(leagueId);
      }

      setLeague(null);
      setLoadError(message);
      setLoadErrorRequiresSearch(requiresSearch);
      setLoaded(true);
    }

    function acceptLeagueRouteState(nextLeague: OnlineLeague | null, user: OnlineUser) {
      const validationIssue = validateOnlineLeagueRouteState({
        league: nextLeague,
        user,
      });

      if (validationIssue) {
        failRouteLoad(validationIssue.message, validationIssue.requiresSearch);
        return;
      }

      setLeague(nextLeague);
      setLoadError(null);
      setLoadErrorRequiresSearch(false);
      setLoaded(true);
    }

    function subscribeToAcceptedRouteLeague(user: OnlineUser) {
      unsubscribe = repository.subscribeToLeague(
        leagueId,
        (loadedLeague) => {
          if (!active) {
            return;
          }

          acceptLeagueRouteState(loadedLeague, user);
        },
        (error) => {
          if (!active) {
            return;
          }

          if (repository.mode === "local") {
            acceptLeagueRouteState(getOnlineLeagueById(leagueId), user);
            return;
          }

          const recovery = getOnlineRecoveryCopy(error, {
            title: "Online-Liga konnte nicht geladen werden.",
            message: error.message || "Online-Liga konnte nicht aus Firebase geladen werden.",
            helper: "Bitte versuche es erneut.",
          });

          failRouteLoad(
            recovery.message,
            recovery.kind === "permission" || recovery.kind === "not-found",
          );
        },
        repositoryReadOptions,
      );
    }

    async function loadRouteState() {
      setLoaded(false);
      setLeague(null);
      setCurrentUser(null);
      setLoadError(null);
      setLoadErrorRequiresSearch(false);

      let user: OnlineUser;

      if (!leagueId.trim()) {
        failRouteLoad("Online-Liga nicht gefunden.", true);
        return;
      }

      try {
        user = await repository.getCurrentUser();
      } catch (error) {
        if (!active) {
          return;
        }

        if (repository.mode === "local") {
          user = ensureCurrentOnlineUser();
        } else {
          const recovery = getOnlineRecoveryCopy(error, {
            title: "Online-Identitaet nicht verfuegbar",
            message: "Firebase Auth konnte nicht initialisiert werden.",
            helper: "Lade die Seite neu.",
          });

          failRouteLoad(recovery.message, false);
          return;
        }
      }

      if (!active) {
        return;
      }

      setCurrentUser(user);

      try {
        const initialLeague = await repository.getLeagueById(leagueId, repositoryReadOptions);

        if (!active) {
          return;
        }

        const initialValidationIssue = validateOnlineLeagueRouteState({
          league: initialLeague,
          user,
        });

        if (initialValidationIssue) {
          if (shouldAttemptOnlineLeagueRouteJoin({ league: initialLeague, user })) {
            const joinResult = await repository.joinLeague(leagueId);

            if (!active) {
              return;
            }

            if (joinResult.status === "joined" || joinResult.status === "already-member") {
              acceptLeagueRouteState(joinResult.league, user);
              subscribeToAcceptedRouteLeague(user);
              return;
            }

            if (
              joinResult.status === "missing-league" ||
              joinResult.status === "full" ||
              joinResult.status === "invalid-team-identity" ||
              joinResult.status === "team-identity-taken"
            ) {
              failRouteLoad(joinResult.message, true);
              return;
            }

            failRouteLoad(initialValidationIssue.message, initialValidationIssue.requiresSearch);
            return;
          }

          failRouteLoad(initialValidationIssue.message, initialValidationIssue.requiresSearch);
          return;
        }

        acceptLeagueRouteState(initialLeague, user);
        subscribeToAcceptedRouteLeague(user);
      } catch (error) {
        if (!active) {
          return;
        }

        if (repository.mode === "local") {
          acceptLeagueRouteState(getOnlineLeagueById(leagueId), user);
          return;
        }

        const recovery = getOnlineRecoveryCopy(error, {
          title: "Online-Liga konnte nicht geladen werden.",
          message:
            error instanceof Error
              ? error.message
              : "Online-Liga konnte nicht aus Firebase geladen werden.",
          helper: "Bitte versuche es erneut.",
        });

        failRouteLoad(
          recovery.message,
          recovery.kind === "permission" || recovery.kind === "not-found",
        );
      }
    }

    void loadRouteState();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    leagueId,
    repository,
    repositoryReadOptions,
    reloadToken,
  ]);

  return {
    repository,
    league,
    setLeague,
    currentUser,
    loaded,
    loadError,
    loadErrorRequiresSearch,
    retryLoad,
  };
}

export function OnlineLeagueRouteStateProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: OnlineLeagueRouteState;
}) {
  return (
    <OnlineLeagueRouteStateContext.Provider value={value}>
      {children}
    </OnlineLeagueRouteStateContext.Provider>
  );
}

export function useOnlineLeagueRouteState() {
  const value = useContext(OnlineLeagueRouteStateContext);

  if (!value) {
    throw new Error("useOnlineLeagueRouteState must be used within OnlineLeagueRouteStateProvider.");
  }

  return value;
}
