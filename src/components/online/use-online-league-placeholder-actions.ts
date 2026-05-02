import { useCallback, type Dispatch, type SetStateAction } from "react";

import {
  acceptOnlineTradeProposal,
  claimVacantOnlineTeam,
  declineOnlineTradeProposal,
  makeOnlineDraftPick,
  scoutOnlineProspect,
} from "@/lib/online/online-league-service";
import type { OnlineLeague } from "@/lib/online/online-league-types";
import type { OnlineUser } from "@/lib/online/online-user-service";
import type { OnlineBackendMode } from "@/lib/online/types";

import {
  FIREBASE_MVP_LOCAL_ACTION_MESSAGE,
} from "./online-firebase-mvp-action-guard";

type OnlineActionFeedback = {
  tone: "success" | "warning";
  message: string;
};

type UseOnlineLeaguePlaceholderActionsInput = {
  currentUser: OnlineUser | null;
  leagueId: string;
  mode: OnlineBackendMode;
  setActionFeedback: Dispatch<SetStateAction<OnlineActionFeedback | null>>;
  setDraftFeedback: Dispatch<SetStateAction<string | null>>;
  setLeague: Dispatch<SetStateAction<OnlineLeague | null>>;
  setTradeFeedback: Dispatch<SetStateAction<string | null>>;
};

export function useOnlineLeaguePlaceholderActions({
  currentUser,
  leagueId,
  mode,
  setActionFeedback,
  setDraftFeedback,
  setLeague,
  setTradeFeedback,
}: UseOnlineLeaguePlaceholderActionsInput) {
  const handleClaimVacantTeam = useCallback(
    (teamId: string) => {
      if (!currentUser) {
        return;
      }

      if (mode === "firebase") {
        setActionFeedback({
          tone: "warning",
          message: FIREBASE_MVP_LOCAL_ACTION_MESSAGE,
        });
        return;
      }

      const result = claimVacantOnlineTeam(leagueId, teamId, currentUser);
      setLeague(result.league);
    },
    [currentUser, leagueId, mode, setActionFeedback, setLeague],
  );

  const handleAcceptTrade = useCallback(
    (tradeId: string) => {
      if (!currentUser) {
        return;
      }

      if (mode === "firebase") {
        setTradeFeedback(FIREBASE_MVP_LOCAL_ACTION_MESSAGE);
        return;
      }

      const result = acceptOnlineTradeProposal(leagueId, tradeId, currentUser.userId);

      setLeague(result.league);
      setTradeFeedback(result.message);
    },
    [currentUser, leagueId, mode, setLeague, setTradeFeedback],
  );

  const handleDeclineTrade = useCallback(
    (tradeId: string) => {
      if (!currentUser) {
        return;
      }

      if (mode === "firebase") {
        setTradeFeedback(FIREBASE_MVP_LOCAL_ACTION_MESSAGE);
        return;
      }

      const result = declineOnlineTradeProposal(leagueId, tradeId, currentUser.userId);

      setLeague(result.league);
      setTradeFeedback(result.message);
    },
    [currentUser, leagueId, mode, setLeague, setTradeFeedback],
  );

  const handleScoutProspect = useCallback(
    (prospectId: string) => {
      if (!currentUser) {
        return;
      }

      if (mode === "firebase") {
        setDraftFeedback(FIREBASE_MVP_LOCAL_ACTION_MESSAGE);
        return;
      }

      const result = scoutOnlineProspect(leagueId, currentUser.userId, prospectId);

      if (result.league) {
        setLeague(result.league);
      }
      setDraftFeedback(result.message);
    },
    [currentUser, leagueId, mode, setDraftFeedback, setLeague],
  );

  const handleDraftProspect = useCallback(
    (prospectId: string) => {
      if (!currentUser) {
        return;
      }

      if (mode === "firebase") {
        setDraftFeedback(FIREBASE_MVP_LOCAL_ACTION_MESSAGE);
        return;
      }

      const result = makeOnlineDraftPick(leagueId, currentUser.userId, prospectId);

      if (result.league) {
        setLeague(result.league);
      }
      setDraftFeedback(result.message);
    },
    [currentUser, leagueId, mode, setDraftFeedback, setLeague],
  );

  return {
    handleAcceptTrade,
    handleClaimVacantTeam,
    handleDeclineTrade,
    handleDraftProspect,
    handleScoutProspect,
  };
}
