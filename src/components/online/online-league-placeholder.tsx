"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  acceptOnlineTradeProposal,
  claimVacantOnlineTeam,
  createOnlineTradeProposal,
  declineOnlineTradeProposal,
  extendOnlinePlayerContract,
  fireOnlineCoach,
  getOnlineLeagueById,
  hireOnlineCoach,
  makeOnlineDraftPick,
  releaseOnlinePlayer,
  scoutOnlineProspect,
  setOnlineFranchiseStrategy,
  setOnlineLeagueUserReadyState,
  setOnlineMediaExpectation,
  setOnlineStadiumPricing,
  signOnlineFreeAgent,
  submitWeeklyTrainingPlan,
  type CoachRole,
  type FranchiseStrategyType,
  type OnlineLeague,
  type OnlineMediaExpectationGoal,
  type TrainingIntensity,
  type TrainingPrimaryFocus,
  type TrainingRiskTolerance,
  type TrainingSecondaryFocus,
} from "@/lib/online/online-league-service";
import {
  getMissingPlayerRecoveryCopy,
  getMissingTeamRecoveryCopy,
  getOnlineRecoveryCopy,
} from "@/lib/online/error-recovery";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { ensureCurrentOnlineUser, type OnlineUser } from "@/lib/online/online-user-service";
import { GlossaryTerm } from "./online-glossary";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";
import {
  getOnlineLeaguePriceChangeHint,
  toOnlineLeagueDetailState,
} from "./online-league-detail-model";
import {
  OnlineLeagueRulesSection,
  OnlineLeagueWeekFlowSection,
} from "./online-league-overview-sections";
import {
  AdminControlsPanel,
  DraftStatusPanel,
  ErrorState,
  LeagueHeader,
  LeagueStatusPanel,
  LoadingState,
  PlayerActionsPanel,
  ReadyStatePanel,
  TeamOverviewCard,
} from "./online-league-dashboard-panels";
import {
  EXPERT_MODE_STORAGE_KEY,
  FRANCHISE_STRATEGIES,
  MEDIA_EXPECTATION_GOALS,
  TRAINING_INTENSITIES,
  TRAINING_PRIMARY_FOCI,
  TRAINING_RISK_LEVELS,
  TRAINING_SECONDARY_FOCI,
  getExtensionWarningText,
  getFreeAgentWarningText,
  getReleaseWarningText,
  getToneClass,
  getTrainingFocusLabel,
  getTrainingIntensityLabel,
  getTrainingPreview,
  getTrainingRiskLabel,
} from "./online-league-dashboard-utils";

export function OnlineLeaguePlaceholder({ leagueId }: { leagueId: string }) {
  const [league, setLeague] = useState<OnlineLeague | null>(null);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorRequiresSearch, setLoadErrorRequiresSearch] = useState(false);
  const [trainingIntensity, setTrainingIntensity] = useState<TrainingIntensity>("normal");
  const [trainingPrimaryFocus, setTrainingPrimaryFocus] =
    useState<TrainingPrimaryFocus>("balanced");
  const [trainingSecondaryFocus, setTrainingSecondaryFocus] =
    useState<TrainingSecondaryFocus | "none">("none");
  const [trainingRiskTolerance, setTrainingRiskTolerance] =
    useState<TrainingRiskTolerance>("medium");
  const [youngPlayerPriority, setYoungPlayerPriority] = useState(50);
  const [veteranMaintenance, setVeteranMaintenance] = useState(50);
  const [trainingNotes, setTrainingNotes] = useState("");
  const [trainingFeedback, setTrainingFeedback] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [contractFeedback, setContractFeedback] = useState<string | null>(null);
  const [tradeFeedback, setTradeFeedback] = useState<string | null>(null);
  const [draftFeedback, setDraftFeedback] = useState<string | null>(null);
  const [fantasyDraftFeedback, setFantasyDraftFeedback] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);
  const [pendingFantasyDraftPickId, setPendingFantasyDraftPickId] = useState<string | null>(null);
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [mediaFeedback, setMediaFeedback] = useState<string | null>(null);
  const [franchiseStrategy, setFranchiseStrategy] =
    useState<FranchiseStrategyType>("balanced");
  const [strategyFeedback, setStrategyFeedback] = useState<string | null>(null);
  const [ticketPriceLevel, setTicketPriceLevel] = useState(55);
  const [merchPriceLevel, setMerchPriceLevel] = useState(55);
  const [pricingFeedback, setPricingFeedback] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const router = useRouter();
  const detailState = toOnlineLeagueDetailState(league, currentUser);
  const modeStatus = getOnlineModeStatusCopy(repository.mode);
  const isFirebaseMvpMode = repository.mode === "firebase";
  const showAdvancedLocalActions = !isFirebaseMvpMode && expertMode;
  const firebaseLocalActionMessage =
    "Diese Aktion ist im Firebase-Multiplayer noch nicht synchronisiert. Es wurden keine lokalen Ersatzdaten geschrieben.";

  function handleRetryLoad() {
    setLoaded(false);
    setLoadError(null);
    setLoadErrorRequiresSearch(false);
    setReloadToken((currentToken) => currentToken + 1);
  }

  function handleSearchLeagueAgain() {
    repository.clearLastLeagueId(leagueId);
    router.push("/online");
  }

  useEffect(() => {
    setExpertMode(window.localStorage.getItem(EXPERT_MODE_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    let active = true;

    repository
      .getCurrentUser()
      .then((user) => {
        if (!active) {
          return;
        }

        setCurrentUser(user);
        setLoadError(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (repository.mode === "local") {
          setCurrentUser(ensureCurrentOnlineUser());
          setLoadError(null);
          return;
        }

        setCurrentUser(null);
        const recovery = getOnlineRecoveryCopy(error, {
          title: "Online-Identitaet nicht verfuegbar",
          message: "Firebase Auth konnte nicht initialisiert werden.",
          helper: "Lade die Seite neu.",
        });
        setLoadError(recovery.message);
        setLoadErrorRequiresSearch(false);
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [repository, reloadToken]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let active = true;

    setLoaded(false);
    setLoadError(null);
    setLoadErrorRequiresSearch(false);

    let unsubscribe = () => {
      // no active subscription yet
    };

    repository.getLeagueById(leagueId)
      .then((initialLeague) => {
        if (!active) {
          return;
        }

        if (!initialLeague) {
          repository.clearLastLeagueId(leagueId);
          setLeague(null);
          setLoadError("Die Online-Liga ist fuer diesen Account nicht erreichbar.");
          setLoadErrorRequiresSearch(true);
          setLoaded(true);
          return;
        }

        setLeague(initialLeague);
        const leagueUser = initialLeague.users.find(
          (candidate) => candidate.userId === currentUser.userId,
        );
        if (leagueUser?.stadiumProfile) {
          setTicketPriceLevel(leagueUser.stadiumProfile.ticketPriceLevel);
          setMerchPriceLevel(leagueUser.stadiumProfile.merchPriceLevel);
        }
        if (leagueUser?.franchiseStrategy) {
          setFranchiseStrategy(
            leagueUser.franchiseStrategy.strategyType ?? leagueUser.franchiseStrategy.strategy,
          );
        }
        unsubscribe = repository.subscribeToLeague(
          leagueId,
          (loadedLeague) => {
            if (!active) {
              return;
            }

            setLeague(loadedLeague);
            const nextLeagueUser = loadedLeague?.users.find(
              (candidate) => candidate.userId === currentUser.userId,
            );
            if (nextLeagueUser?.stadiumProfile) {
              setTicketPriceLevel(nextLeagueUser.stadiumProfile.ticketPriceLevel);
              setMerchPriceLevel(nextLeagueUser.stadiumProfile.merchPriceLevel);
            }
            if (nextLeagueUser?.franchiseStrategy) {
              setFranchiseStrategy(
                nextLeagueUser.franchiseStrategy.strategyType ?? nextLeagueUser.franchiseStrategy.strategy,
              );
            }
            setLoaded(true);
          },
          (error) => {
            if (!active) {
              return;
            }

            if (repository.mode === "local") {
              setLeague(getOnlineLeagueById(leagueId));
              setLoaded(true);
              return;
            }

            const recovery = getOnlineRecoveryCopy(error, {
              title: "Online-Liga konnte nicht geladen werden.",
              message: error.message || "Online-Liga konnte nicht aus Firebase geladen werden.",
              helper: "Bitte versuche es erneut.",
            });

            if (recovery.kind === "permission" || recovery.kind === "not-found") {
              repository.clearLastLeagueId(leagueId);
              setLoadErrorRequiresSearch(true);
            }

            setLeague(null);
            setLoadError(recovery.message);
            setLoaded(true);
          },
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (repository.mode === "local") {
          setLeague(getOnlineLeagueById(leagueId));
          setLoaded(true);
          return;
        }

        const recovery = getOnlineRecoveryCopy(error, {
          title: "Online-Liga konnte nicht geladen werden.",
          message: error.message || "Online-Liga konnte nicht aus Firebase geladen werden.",
          helper: "Bitte versuche es erneut.",
        });

        if (recovery.kind === "permission" || recovery.kind === "not-found") {
          repository.clearLastLeagueId(leagueId);
          setLoadErrorRequiresSearch(true);
        }

        setLeague(null);
        setLoadError(recovery.message);
        setLoaded(true);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser, leagueId, repository, reloadToken]);

  async function handleReadyForWeek(ready: boolean) {
    if (!currentUser || pendingAction) {
      return;
    }

    setPendingAction("ready");

    try {
      const updatedLeague =
        repository.mode === "firebase"
          ? await repository.setUserReady(leagueId, ready)
          : setOnlineLeagueUserReadyState(leagueId, currentUser.userId, ready);

      if (updatedLeague) {
        setLeague(updatedLeague);
        setActionFeedback({
          tone: "success",
          message: ready
            ? `Du bist bereit für Week ${updatedLeague.currentWeek}.`
            : `Ready für Week ${updatedLeague.currentWeek} wurde zurückgenommen.`,
        });
      } else {
        setActionFeedback({
          tone: "warning",
          message: "Bereitschaft konnte nicht gespeichert werden. Bitte versuche es erneut.",
        });
      }
    } catch {
      setActionFeedback({
        tone: "warning",
        message: "Bereitschaft konnte nicht gespeichert werden. Deine Woche wurde nicht freigegeben.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  function handleToggleExpertMode() {
    const nextExpertMode = !expertMode;

    setExpertMode(nextExpertMode);
    window.localStorage.setItem(EXPERT_MODE_STORAGE_KEY, String(nextExpertMode));
  }

  function handleClaimVacantTeam(teamId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setActionFeedback({
        tone: "warning",
        message: firebaseLocalActionMessage,
      });
      return;
    }

    const result = claimVacantOnlineTeam(leagueId, teamId, currentUser);
    setLeague(result.league);
  }

  function handleSaveFranchiseStrategy() {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setStrategyFeedback(firebaseLocalActionMessage);
      return;
    }

    const updatedLeague = setOnlineFranchiseStrategy(
      leagueId,
      currentUser.userId,
      franchiseStrategy,
    );

    if (updatedLeague) {
      setLeague(updatedLeague);
      const updatedUser = updatedLeague.users.find(
        (user) => user.userId === currentUser.userId,
      );
      const storedStrategy =
        updatedUser?.franchiseStrategy?.strategyType ?? updatedUser?.franchiseStrategy?.strategy;

      setStrategyFeedback(
        storedStrategy === franchiseStrategy
          ? "Franchise-Strategie gespeichert."
          : "Strategie kann nur in der Offseason geändert werden.",
      );
    }
  }

  function handleSubmitTrainingPlan() {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setTrainingFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = submitWeeklyTrainingPlan(leagueId, currentUser.userId, {
      intensity: trainingIntensity,
      primaryFocus: trainingPrimaryFocus,
      secondaryFocus:
        trainingSecondaryFocus === "none" ? undefined : trainingSecondaryFocus,
      riskTolerance: trainingRiskTolerance,
      youngPlayerPriority,
      veteranMaintenance,
      notes: trainingNotes,
    });

    setLeague(result.league);
    setTrainingFeedback(
      result.status === "submitted"
        ? "Trainingsplan gespeichert."
        : result.message,
    );
  }

  function getCurrentLeagueUser() {
    return league?.users.find((user) => user.userId === currentUser?.userId) ?? null;
  }

  function handleExtendContract(playerId: string) {
    const leagueUser = getCurrentLeagueUser();
    const player = leagueUser?.contractRoster?.find(
      (candidate) => candidate.playerId === playerId,
    );
    const displayPlayer = detailState.status === "found"
      ? detailState.contracts?.players.find((candidate) => candidate.playerId === playerId)
      : null;

    if (!currentUser || !player) {
      return;
    }

    if (repository.mode === "firebase") {
      setContractFeedback(firebaseLocalActionMessage);
      return;
    }

    if (
      displayPlayer &&
      detailState.status === "found" &&
      detailState.contracts &&
      !window.confirm(getExtensionWarningText(displayPlayer, detailState.contracts))
    ) {
      setContractFeedback("Verlängerung abgebrochen. Keine Vertragsdaten wurden geändert.");
      return;
    }

    const yearsRemaining = Math.max(1, player.contract.yearsRemaining + 1);
    const signingBonus = player.contract.signingBonus;
    const result = extendOnlinePlayerContract(
      leagueId,
      currentUser.userId,
      playerId,
      {
        salaryPerYear: player.contract.salaryPerYear,
        yearsRemaining,
        totalValue: player.contract.salaryPerYear * yearsRemaining + signingBonus,
        guaranteedMoney: player.contract.guaranteedMoney,
        signingBonus,
        contractType: player.contract.contractType,
        capHitPerYear: Math.round(player.contract.salaryPerYear + signingBonus / yearsRemaining),
        deadCapPerYear: Math.round(
          (player.contract.guaranteedMoney + signingBonus) / yearsRemaining,
        ),
      },
    );

    setLeague(result.league);
    setContractFeedback(result.message);
  }

  function handleReleasePlayer(playerId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setContractFeedback(firebaseLocalActionMessage);
      return;
    }

    const displayPlayer = detailState.status === "found"
      ? detailState.contracts?.players.find((candidate) => candidate.playerId === playerId)
      : null;

    if (
      displayPlayer &&
      detailState.status === "found" &&
      detailState.contracts &&
      !window.confirm(getReleaseWarningText(displayPlayer, detailState.contracts))
    ) {
      setContractFeedback("Entlassung abgebrochen. Keine Vertragsdaten wurden geändert.");
      return;
    }

    const result = releaseOnlinePlayer(leagueId, currentUser.userId, playerId);

    setLeague(result.league);
    setContractFeedback(result.message);
  }

  function handleSignFreeAgent(playerId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setContractFeedback(firebaseLocalActionMessage);
      return;
    }

    const displayPlayer = detailState.status === "found"
      ? detailState.contracts?.freeAgents.find((candidate) => candidate.playerId === playerId)
      : null;

    if (
      displayPlayer &&
      detailState.status === "found" &&
      detailState.contracts &&
      !window.confirm(getFreeAgentWarningText(displayPlayer, detailState.contracts))
    ) {
      setContractFeedback("Verpflichtung abgebrochen. Keine Vertragsdaten wurden geändert.");
      return;
    }

    const result = signOnlineFreeAgent(leagueId, currentUser.userId, playerId, undefined);

    setLeague(result.league);
    setContractFeedback(result.message);
  }

  function handleCreateSuggestedTrade() {
    const leagueUser = getCurrentLeagueUser();
    const partner = league?.users.find((user) => user.userId !== currentUser?.userId);
    const ownPlayer = leagueUser?.contractRoster?.find((player) => player.status === "active");
    const requestedPlayer = partner?.contractRoster?.find((player) => player.status === "active");

    if (!currentUser || !partner || !ownPlayer || !requestedPlayer) {
      setTradeFeedback("Für einen Trade werden zwei Teams mit aktiven Spielern benötigt.");
      return;
    }

    if (repository.mode === "firebase") {
      setTradeFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = createOnlineTradeProposal(leagueId, currentUser.userId, {
      toUserId: partner.userId,
      playersOffered: [ownPlayer.playerId],
      playersRequested: [requestedPlayer.playerId],
      picksOffered: leagueUser?.draftPicks?.[0] ? [leagueUser.draftPicks[0].pickId] : [],
      picksRequested: [],
    });

    setLeague(result.league);
    setTradeFeedback(result.message);
  }

  function handleAcceptTrade(tradeId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setTradeFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = acceptOnlineTradeProposal(leagueId, tradeId, currentUser.userId);

    setLeague(result.league);
    setTradeFeedback(result.message);
  }

  function handleDeclineTrade(tradeId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setTradeFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = declineOnlineTradeProposal(leagueId, tradeId, currentUser.userId);

    setLeague(result.league);
    setTradeFeedback(result.message);
  }

  function handleScoutProspect(prospectId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setDraftFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = scoutOnlineProspect(leagueId, currentUser.userId, prospectId);

    if (result.league) {
      setLeague(result.league);
    }
    setDraftFeedback(result.message);
  }

  function handleDraftProspect(prospectId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setDraftFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = makeOnlineDraftPick(leagueId, currentUser.userId, prospectId);

    if (result.league) {
      setLeague(result.league);
    }
    setDraftFeedback(result.message);
  }

  async function handleFantasyDraftPick(playerId: string) {
    if (!currentUser || !currentLeagueUser || pendingFantasyDraftPickId) {
      return;
    }

    setPendingFantasyDraftPickId(playerId);
    setFantasyDraftFeedback(null);

    try {
      const result = await repository.makeFantasyDraftPick(
        leagueId,
        currentLeagueUser.teamId,
        playerId,
      );

      if (result.league) {
        setLeague(result.league);
      }

      setFantasyDraftFeedback({
        tone: result.status === "success" || result.status === "completed" ? "success" : "warning",
        message: result.message,
      });
    } catch (error) {
      setFantasyDraftFeedback({
        tone: "warning",
        message:
          error instanceof Error
            ? error.message
            : "Pick konnte nicht gespeichert werden. Bitte versuche es erneut.",
      });
    } finally {
      setPendingFantasyDraftPickId(null);
    }
  }

  function handleHireCoach(coachId: string) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setCoachFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = hireOnlineCoach(leagueId, currentUser.userId, coachId);

    if (result.league) {
      setLeague(result.league);
    }
    setCoachFeedback(result.message);
  }

  function handleFireCoach(role: CoachRole) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setCoachFeedback(firebaseLocalActionMessage);
      return;
    }

    const result = fireOnlineCoach(leagueId, currentUser.userId, role);

    if (result.league) {
      setLeague(result.league);
    }
    setCoachFeedback(result.message);
  }

  function handleSetMediaExpectation(goal: OnlineMediaExpectationGoal) {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setMediaFeedback(firebaseLocalActionMessage);
      return;
    }

    const updatedLeague = setOnlineMediaExpectation(
      leagueId,
      currentUser.userId,
      goal,
    );

    if (updatedLeague) {
      setLeague(updatedLeague);
      setMediaFeedback("Teamziel wurde gesetzt.");
    }
  }

  function handleSavePricing() {
    if (!currentUser) {
      return;
    }

    if (repository.mode === "firebase") {
      setPricingFeedback(firebaseLocalActionMessage);
      return;
    }

    const updatedLeague = setOnlineStadiumPricing(leagueId, currentUser.userId, {
      ticketPriceLevel,
      merchPriceLevel,
    });

    if (updatedLeague) {
      setLeague(updatedLeague);
      setPricingFeedback("Preise wurden gespeichert.");
    }
  }

  if (!loaded) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <ErrorState
        copy={getOnlineRecoveryCopy(loadError, {
          title: "Online-Liga konnte nicht geladen werden.",
          message: loadError,
          helper: "Bitte versuche es erneut. Lokale Daten werden dabei nicht ueberschrieben.",
        })}
        onRetry={loadErrorRequiresSearch ? handleSearchLeagueAgain : handleRetryLoad}
        retryLabel={loadErrorRequiresSearch ? "Liga neu suchen" : "Liga erneut laden"}
      />
    );
  }

  if (detailState.status === "missing") {
    return (
      <ErrorState
        copy={{
          kind: "not-found",
          title: detailState.message,
          message: "Diese Online-Liga konnte nicht geladen werden.",
          helper: modeStatus.missingLeagueHelper,
        }}
        onRetry={handleSearchLeagueAgain}
        retryLabel="Liga neu suchen"
      />
    );
  }

  const currentLeagueUser =
    league?.users.find((user) => user.userId === currentUser?.userId) ?? null;

  if (league && currentUser && !currentLeagueUser) {
    return (
      <ErrorState
        copy={getMissingPlayerRecoveryCopy()}
        onRetry={handleRetryLoad}
        retryLabel="Liga erneut laden"
      />
    );
  }

  if (
    currentLeagueUser &&
    (!currentLeagueUser.teamId || currentLeagueUser.teamStatus === "vacant")
  ) {
    return (
      <ErrorState
        copy={getMissingTeamRecoveryCopy()}
        onRetry={handleRetryLoad}
        retryLabel="Team erneut laden"
      />
    );
  }

  if (
    league &&
    currentUser &&
    league.fantasyDraft &&
    league.fantasyDraft.status !== "completed"
  ) {
    return (
      <DraftStatusPanel
        league={league}
        currentUser={currentUser}
        pendingPickPlayerId={pendingFantasyDraftPickId}
        feedback={fantasyDraftFeedback}
        onPickPlayer={handleFantasyDraftPick}
      />
    );
  }

  const teamStepCompleted =
    detailState.firstSteps.items.find((step) => step.id === "team")?.completed ?? false;
  const trainingStepCompleted =
    detailState.firstSteps.items.find((step) => step.id === "training")?.completed ?? false;
  const optionalPlanningCompleted =
    Boolean(detailState.roster?.depthChart.length) || Boolean(detailState.franchise);
  const trainingPreview = getTrainingPreview(
    trainingIntensity,
    trainingPrimaryFocus,
    trainingRiskTolerance,
    youngPlayerPriority,
    veteranMaintenance,
  );
  const ticketPriceHint = getOnlineLeaguePriceChangeHint("ticket", ticketPriceLevel);
  const merchPriceHint = getOnlineLeaguePriceChangeHint("merch", merchPriceLevel);
  const readyGuidanceItems = [
    {
      label: "Team geprüft",
      completed: teamStepCompleted,
      statusLabel: teamStepCompleted ? "Erledigt" : "Empfohlen",
    },
    {
      label: "Training geprüft",
      completed: trainingStepCompleted,
      statusLabel: trainingStepCompleted ? "Erledigt" : "Empfohlen",
    },
    {
      label: "Strategie/Depth Chart optional geprüft",
      completed: optionalPlanningCompleted,
      statusLabel: optionalPlanningCompleted ? "Geprüft" : "Optional",
    },
  ];

  return (
    <section className="w-full rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
      <LeagueHeader detailState={detailState} />
      <ReadyStatePanel
        detailState={detailState}
        actionFeedback={actionFeedback}
        readyGuidanceItems={readyGuidanceItems}
        pendingAction={pendingAction}
        onReadyForWeek={handleReadyForWeek}
      />
      <OnlineLeagueRulesSection detailState={detailState} expertMode={expertMode} />
      <OnlineLeagueWeekFlowSection detailState={detailState} />
      <AdminControlsPanel />

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <TeamOverviewCard
          detailState={detailState}
          isFirebaseMvpMode={isFirebaseMvpMode}
          showAdvancedLocalActions={showAdvancedLocalActions}
          mediaFeedback={mediaFeedback}
          mediaExpectationGoals={MEDIA_EXPECTATION_GOALS}
          onClaimVacantTeam={handleClaimVacantTeam}
          onSetMediaExpectation={handleSetMediaExpectation}
        />
        <LeagueStatusPanel detailState={detailState} />
      </div>

      <PlayerActionsPanel detailState={detailState} />

      <section className="mt-8 rounded-lg border border-white/10 bg-[#07111d]/80 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Ansicht
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {isFirebaseMvpMode ? "Multiplayer MVP" : "Beginner Mode"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {isFirebaseMvpMode ? (
                <>
                  Im Firebase-MVP bleiben nur synchronisierte Aktionen sichtbar: Fantasy Draft,
                  <GlossaryTerm term="readyState"> Ready-State</GlossaryTerm>,
                  gespeicherte Ergebnisse und Liga-Status.
                </>
              ) : (
                <>
                  Standardmäßig bleiben Wochenablauf, Team, Training und <GlossaryTerm term="readyState">Ready-State</GlossaryTerm> im Fokus.
                  Verträge, Trades, <GlossaryTerm term="draft">Draft</GlossaryTerm>, Finanzen, Coaches und <GlossaryTerm term="owner">Owner</GlossaryTerm>-Druck bleiben erreichbar.
                </>
              )}
            </p>
          </div>
          {!isFirebaseMvpMode ? (
            <button
              type="button"
              aria-expanded={expertMode}
              onClick={handleToggleExpertMode}
              className="w-fit rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
            >
              {expertMode ? "Expertenmodus ausblenden" : "Expertenmodus anzeigen"}
            </button>
          ) : null}
        </div>
      </section>

      {showAdvancedLocalActions && detailState.franchise ? (
        <section className="mt-8 rounded-lg border border-cyan-200/20 bg-[#07111d]/80 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                <GlossaryTerm term="franchise">Franchise</GlossaryTerm>
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {detailState.franchise.stadiumName}
              </h2>
              <p className="mt-2 text-sm font-semibold text-cyan-50">
                Strategie: {detailState.franchise.strategyLabel}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {detailState.franchise.capacityLabel}
            </p>
          </div>
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            {detailState.franchise.dataContextLabel}
          </p>

          <div className="mt-5 rounded-lg border border-cyan-200/20 bg-cyan-300/10 p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="grid gap-2 text-sm font-semibold text-slate-100">
                <GlossaryTerm term="franchise">Franchise</GlossaryTerm>-Strategie
                <select
                  value={franchiseStrategy}
                  onChange={(event) =>
                    setFranchiseStrategy(event.target.value as FranchiseStrategyType)
                  }
                  className="rounded-lg border border-white/10 bg-[#09131f] px-3 py-3 text-sm font-semibold text-white"
                >
                  {FRANCHISE_STRATEGIES.map((strategy) => (
                    <option key={strategy} value={strategy}>
                      {strategy === "rebuild"
                        ? "Rebuild"
                        : strategy === "win_now"
                          ? "Win Now"
                          : strategy === "youth_focus"
                            ? "Youth Focus"
                          : "Balanced"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleSaveFranchiseStrategy}
                className="w-fit rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/16"
              >
                Strategie speichern
              </button>
            </div>
            <p className="mt-3 text-sm text-cyan-50">
              {detailState.franchise.strategyNarrative}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-cyan-100 sm:grid-cols-3">
              <p>{detailState.franchise.strategyExpectationLabel}</p>
              <p>{detailState.franchise.strategyImpactLabel}</p>
              <p>{detailState.franchise.strategyRiskLabel}</p>
            </div>
            {strategyFeedback ? (
              <p className="mt-3 text-sm font-semibold text-emerald-100">
                {strategyFeedback}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            {[
              {
                title: "Fan-Stimmung",
                assessment: detailState.franchise.fanMoodAssessment,
              },
              {
                title: "Fan-Druck",
                assessment: detailState.franchise.fanPressureAssessment,
              },
              {
                title: "Preise",
                assessment: detailState.franchise.pricingAssessment,
              },
              {
                title: "Finanzen",
                assessment: detailState.franchise.financeAssessment,
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-lg border p-4 ${getToneClass(item.assessment.tone)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                  {item.title}
                </p>
                <p className="mt-2 text-lg font-semibold">{item.assessment.label}</p>
                <p className="mt-2 text-sm leading-6">{item.assessment.reason}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-85">
                  Handlung
                </p>
                <p className="mt-1 text-sm leading-6">{item.assessment.action}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Ticketpreise
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.ticketPriceLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Hohe Ticketpreise können Stimmung und Auslastung senken.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Merch-Preise
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.merchPriceLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Merch-Preise beeinflussen Erlöse und Fan-Reaktion.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Letzte Auslastung
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.lastAttendanceLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Auslastung zeigt, ob Fans trotz Preisniveau ins Stadion kommen.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Saison-Auslastung
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.averageAttendanceLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Saisontrend statt einzelner Ausreißer.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="fanMood">Fan-Stimmung</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.fanMoodLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="fanPressure">Fan-Druck</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.fanPressureLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="chemistry">Team-Chemistry</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.teamChemistryLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Spiel-Effekt
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.gameplayModifierLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Merch-Trend
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.merchTrendLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Ticket-Erlöse
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.ticketRevenueLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Erlöse aus Tickets; abhängig von Preis und Auslastung.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Merch-Erlöse
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.merchandiseRevenueLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Erlöse aus Fanartikeln; stark von Stimmung und Preisniveau abhängig.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Saisonbilanz
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.franchise.seasonProfitLossLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Grobe Saisonbilanz aus Einnahmen und laufenden Kosten.
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-lg border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50">
            {detailState.franchise.ownerFinanceInfluenceLabel}
          </p>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-200">
                Ticketpreise: {ticketPriceLevel}
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={ticketPriceLevel}
                  onChange={(event) => setTicketPriceLevel(Number(event.target.value))}
                />
                <span className={`rounded-lg border px-3 py-2 text-xs leading-5 ${getToneClass(ticketPriceHint.tone)}`}>
                  {ticketPriceHint.label}: {ticketPriceHint.text}
                </span>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">
                Merch-Preise: {merchPriceLevel}
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={merchPriceLevel}
                  onChange={(event) => setMerchPriceLevel(Number(event.target.value))}
                />
                <span className={`rounded-lg border px-3 py-2 text-xs leading-5 ${getToneClass(merchPriceHint.tone)}`}>
                  {merchPriceHint.label}: {merchPriceHint.text}
                </span>
              </label>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSavePricing}
                className="w-fit rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/16"
              >
                Preise speichern
              </button>
              {pricingFeedback ? (
                <p className="text-sm font-semibold text-emerald-100">
                  {pricingFeedback}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {detailState.training ? (
        <section className="mt-8 rounded-lg border border-violet-200/20 bg-[#07111d]/80 p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                Training
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Wochen-Training
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-300">
              Trainerstab: {detailState.training.staffStrengthLabel}
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            {!isFirebaseMvpMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 text-sm font-semibold text-slate-200">
                  <div>
                    <GlossaryTerm term="intensity">Intensität</GlossaryTerm>
                  </div>
                  <select
                    aria-label="Intensität"
                    value={trainingIntensity}
                    onChange={(event) =>
                      setTrainingIntensity(event.target.value as TrainingIntensity)
                    }
                    className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white"
                  >
                    {TRAINING_INTENSITIES.map((intensity) => (
                      <option key={intensity} value={intensity}>
                        {getTrainingIntensityLabel(intensity)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 text-sm font-semibold text-slate-200">
                  <div>
                    <GlossaryTerm term="trainingFocus">Trainingsfokus</GlossaryTerm>
                  </div>
                  <select
                    aria-label="Trainingsfokus"
                    value={trainingPrimaryFocus}
                    onChange={(event) =>
                      setTrainingPrimaryFocus(event.target.value as TrainingPrimaryFocus)
                    }
                    className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white"
                  >
                    {TRAINING_PRIMARY_FOCI.map((focus) => (
                      <option key={focus} value={focus}>
                        {getTrainingFocusLabel(focus)}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Nebenfokus
                  <select
                    value={trainingSecondaryFocus}
                    onChange={(event) =>
                      setTrainingSecondaryFocus(
                        event.target.value as TrainingSecondaryFocus | "none",
                      )
                    }
                    className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white"
                  >
                    {TRAINING_SECONDARY_FOCI.map((focus) => (
                      <option key={focus} value={focus}>
                        {focus === "none" ? "Kein Nebenfokus" : focus}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Risiko-Level
                  <select
                    value={trainingRiskTolerance}
                    onChange={(event) =>
                      setTrainingRiskTolerance(event.target.value as TrainingRiskTolerance)
                    }
                    className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white"
                  >
                    {TRAINING_RISK_LEVELS.map((riskLevel) => (
                      <option key={riskLevel} value={riskLevel}>
                        {getTrainingRiskLabel(riskLevel)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Junge Spieler priorisieren: {youngPlayerPriority}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={youngPlayerPriority}
                    onChange={(event) => setYoungPlayerPriority(Number(event.target.value))}
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Veteranen schonen: {veteranMaintenance}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={veteranMaintenance}
                    onChange={(event) => setVeteranMaintenance(Number(event.target.value))}
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200 sm:col-span-2">
                  Notizen
                  <textarea
                    value={trainingNotes}
                    onChange={(event) => setTrainingNotes(event.target.value)}
                    className="min-h-20 rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white"
                  />
                </label>

                <button
                  type="button"
                  disabled={!detailState.ownTeamName}
                  onClick={handleSubmitTrainingPlan}
                  className="rounded-lg border border-violet-200/25 bg-violet-300/10 px-4 py-3 text-sm font-semibold text-violet-50 transition hover:bg-violet-300/16 disabled:cursor-not-allowed disabled:opacity-55 sm:col-span-2"
                >
                  Trainingsplan speichern
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-violet-200/20 bg-violet-300/10 p-4 text-sm font-semibold leading-6 text-violet-50">
                Trainingspläne sind im Firebase-MVP nur lesbar. Die Week-Simulation nutzt
                synchronisierte Standardwerte, damit keine ungespeicherten lokalen Pläne entstehen.
              </div>
            )}

            <div className="grid gap-3">
              <div className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Einsteiger-Empfehlung
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-50">
                  {detailState.currentWeekLabel === "Week 1"
                    ? "Empfohlen für Woche 1: Ausgewogen / Normal"
                    : "Sichere Grundeinstellung: Ausgewogen / Normal"}
                </p>
                <p className="mt-2 text-xs leading-5 text-emerald-50/80">
                  Das entspricht dem konservativen Auto-Default und hält Vorbereitung, Müdigkeit und Risiko im Gleichgewicht.
                </p>
              </div>
              <div className="rounded-lg border border-violet-200/25 bg-violet-300/10 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                      Live-Vorschau
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {trainingPreview.title}
                    </h3>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                      trainingPreview.riskLevel === "Kritisch"
                        ? "border-rose-200/35 bg-rose-300/10 text-rose-100"
                        : trainingPreview.riskLevel === "Erhöht"
                          ? "border-amber-200/35 bg-amber-300/10 text-amber-100"
                          : "border-emerald-200/35 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    Risiko: {trainingPreview.riskLevel}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-200">
                  <p>
                    <span className="font-semibold text-white">Vorteil:</span>{" "}
                    {trainingPreview.benefit}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Müdigkeit:</span>{" "}
                    {trainingPreview.fatigue}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Verletzungsrisiko:</span>{" "}
                    {trainingPreview.injuryRisk}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Spielvorbereitung:</span>{" "}
                    {trainingPreview.preparation}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Chemistry:</span>{" "}
                    {trainingPreview.chemistry}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Entwicklung:</span>{" "}
                    {trainingPreview.development}
                  </p>
                </div>
                {trainingPreview.warnings.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {trainingPreview.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100"
                      >
                        {warning}
                      </p>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-violet-100/75">
                  Vorschau als qualitative Tendenz aus den vorhandenen Trainingsregeln; die genauen Werte entstehen erst beim Wochenabschluss.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Aktueller Plan
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {detailState.training.currentPlanLabel}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {detailState.training.currentPlanSourceLabel}
                </p>
              </div>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                {detailState.training.expectedEffectLabel}
              </p>
              <p className="rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
                {detailState.training.riskHint}
              </p>
              <p className="rounded-lg border border-violet-200/20 bg-violet-300/10 px-3 py-2 text-sm font-semibold text-violet-50">
                {detailState.training.coachComment}
              </p>
              {trainingFeedback ? (
                <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                  {trainingFeedback}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Letzte Woche
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.training.lastOutcomeLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Entwicklung
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.training.lastDevelopmentLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="fatigue">Müdigkeit</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.training.lastFatigueLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="chemistry">Chemistry</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.training.lastChemistryLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="injuryRisk">Verletzungsrisiko</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.training.lastInjuryRiskLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="prep">Vorbereitung</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.training.lastPreparationLabel}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {showAdvancedLocalActions && detailState.coaching ? (
        <section className="mt-8 rounded-lg border border-teal-200/20 bg-[#07111d]/80 p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                Coaching Staff
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Coaches einstellen und entlassen
              </h2>
            </div>
            {coachFeedback ? (
              <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                {coachFeedback}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section>
              <h3 className="text-lg font-semibold text-white">Aktueller Staff</h3>
              <div className="mt-3 grid gap-3">
                {detailState.coaching.staff.map((coach) => (
                  <div
                    key={coach.role}
                    className="rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{coach.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {coach.label}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          OFF {coach.offenseLabel} · DEF {coach.defenseLabel} · DEV {coach.developmentLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFireCoach(coach.role)}
                        className="rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-300/16"
                      >
                        Feuern
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white">Coach-Markt</h3>
              <div className="mt-3 grid gap-3">
                {detailState.coaching.available.map((coach) => (
                  <div
                    key={coach.coachId}
                    className="rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{coach.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {coach.roleLabel}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          OFF {coach.offenseLabel} · DEF {coach.defenseLabel} · DEV {coach.developmentLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleHireCoach(coach.coachId)}
                        className="rounded-lg border border-teal-200/25 bg-teal-300/10 px-3 py-2 text-xs font-semibold text-teal-50 transition hover:bg-teal-300/16"
                      >
                        Einstellen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {showAdvancedLocalActions && detailState.contracts ? (
        <section className="mt-8 rounded-lg border border-amber-200/20 bg-[#07111d]/80 p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                Verträge & <GlossaryTerm term="salaryCap">Salary Cap</GlossaryTerm>
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Gehaltsobergrenze
              </h2>
            </div>
            {contractFeedback ? (
              <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                {contractFeedback}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="salaryCap">Salary Cap</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.contracts.capLimitLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Aktive Gehälter
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.contracts.activeSalaryLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="deadCap">Dead Cap</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.contracts.deadCapLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Verfügbarer Cap Space
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.contracts.availableCapLabel}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Cap-Auslastung
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.contracts.capUsageLabel}
              </p>
            </div>
            <p className="rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-sm font-semibold text-amber-50">
              {detailState.contracts.capRiskLabel}
            </p>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200/20 bg-amber-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
              Vertragsrisiko verstehen
            </p>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-amber-50/90 md:grid-cols-2">
              <p>
                <GlossaryTerm term="salaryCap">Salary Cap</GlossaryTerm>: Obergrenze für deinen Kader. Wenn du sie überschreitest, können Moves blockiert werden.
              </p>
              <p>
                <GlossaryTerm term="capHit">Cap Hit</GlossaryTerm>: Betrag, der pro Jahr gegen den Cap zählt.
              </p>
              <p>
                <GlossaryTerm term="deadCap">Dead Cap</GlossaryTerm>: Cap-Altlast nach Entlassungen oder garantierten Vertragsanteilen.
              </p>
              <p>
                <GlossaryTerm term="signingBonus">Signing Bonus</GlossaryTerm>: Bonusgeld, das Verträge attraktiver macht, aber Dead-Cap-Risiko erhöhen kann.
              </p>
              <p>
                Entlassen: entfernt den Spieler aus dem aktiven Kader, kann aber Dead Cap erzeugen.
              </p>
              <p>
                Verlängern: bindet den Spieler länger und kann Cap Hit, Bonusbindung und Flexibilität verändern.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section>
              <h3 className="text-lg font-semibold text-white">Vertragsliste</h3>
              <div className="mt-3 grid gap-3">
                {detailState.contracts.players.map((player) => (
                  <div
                    key={player.playerId}
                    className="rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{player.playerName}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {player.position} · {player.status} · {player.developmentPathLabel}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">
                          {player.overallLabel} · {player.potentialLabel} · {player.developmentProgressLabel}
                        </p>
                        <p className="mt-2 text-xs text-amber-100/80">
                          X-Factor: {player.xFactorLabel}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          {player.salaryLabel} / Jahr · {player.yearsLabel} · garantiert {player.guaranteedLabel}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {player.contractTypeLabel} · <GlossaryTerm term="capHit">Cap Hit</GlossaryTerm> {player.capHitLabel} · <GlossaryTerm term="signingBonus">Signing Bonus</GlossaryTerm> {player.signingBonusLabel} · <GlossaryTerm term="deadCap">Dead Cap</GlossaryTerm>/Jahr {player.deadCapPerYearLabel}
                        </p>
                      </div>
                      {player.status === "active" ? (
                        <div className="grid gap-2 sm:min-w-36">
                          <button
                            type="button"
                            onClick={() => handleExtendContract(player.playerId)}
                            className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-300/16"
                          >
                            +1 Jahr verlängern
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReleasePlayer(player.playerId)}
                            className="rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-300/16"
                          >
                            Entlassen
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white">
                <GlossaryTerm term="freeAgent">Free Agents</GlossaryTerm>
              </h3>
              <div className="mt-3 grid gap-3">
                {detailState.contracts.freeAgents.length > 0 ? (
                  detailState.contracts.freeAgents.map((player) => (
                    <div
                      key={player.playerId}
                      className="rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <p className="font-semibold text-white">{player.playerName}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {player.position}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {player.salaryLabel} · {player.yearsLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSignFreeAgent(player.playerId)}
                        className="mt-3 rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                      >
                        Verpflichten
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-4 text-sm text-slate-300">
                    Keine <GlossaryTerm term="freeAgent">Free Agents</GlossaryTerm> verfügbar.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {showAdvancedLocalActions && detailState.trades ? (
        <section className="mt-8 rounded-lg border border-sky-200/20 bg-[#07111d]/80 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                <GlossaryTerm term="tradeBoard">Trade Board</GlossaryTerm>
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Eingehende und ausgehende Trades
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Vorschlagspartner: {detailState.trades.suggestedPartnerLabel}
              </p>
            </div>
            <button
              type="button"
              disabled={!detailState.trades.hasTradePartner}
              onClick={handleCreateSuggestedTrade}
              className="w-fit rounded-lg border border-sky-200/25 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Beispiel-Trade erstellen
            </button>
          </div>

          {tradeFeedback ? (
            <p className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
              {tradeFeedback}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {detailState.trades.items.length > 0 ? (
              detailState.trades.items.map((trade) => (
                <div
                  key={trade.tradeId}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {trade.direction === "incoming" ? "Eingehend" : "Ausgehend"} · {trade.partnerTeamName}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {trade.status} · {trade.fairnessLabel} · Fairness {trade.fairnessScoreLabel}
                      </p>
                      <p className="mt-3 text-sm text-slate-300">
                        Angebot: {trade.offeredLabel}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Forderung: {trade.requestedLabel}
                      </p>
                    </div>
                    {trade.canRespond ? (
                      <div className="grid gap-2 sm:min-w-36">
                        <button
                          type="button"
                          onClick={() => handleAcceptTrade(trade.tradeId)}
                          className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                        >
                          Annehmen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineTrade(trade.tradeId)}
                          className="rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-300/16"
                        >
                          Ablehnen
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-4 text-sm text-slate-300">
                Noch keine Trades vorhanden.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {showAdvancedLocalActions && detailState.draft ? (
        <section className="mt-8 rounded-lg border border-fuchsia-200/20 bg-[#07111d]/80 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-200">
                Scouting & <GlossaryTerm term="draft">Draft</GlossaryTerm>
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Talentübersicht
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Scouting verbessert die Genauigkeit, zeigt aber nie sofort die ganze Wahrheit.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
              {detailState.draft.currentPickLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
              {detailState.draft.historyLabel}
            </p>
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
              {detailState.draft.canDraftCurrentPick
                ? "Du bist am Zug."
                : "Warte auf den nächsten Pick."}
            </p>
          </div>

          {draftFeedback ? (
            <p className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
              {draftFeedback}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {detailState.draft.prospects.map((prospect) => (
              <div
                key={prospect.prospectId}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{prospect.playerName}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {prospect.position} · {prospect.statusLabel}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-200">
                    <span className="rounded-lg border border-white/10 bg-[#07111d] px-2 py-2">
                      OVR {prospect.scoutedRatingLabel}
                    </span>
                    <span className="rounded-lg border border-white/10 bg-[#07111d] px-2 py-2">
                      POT {prospect.potentialLabel}
                    </span>
                    <span className="rounded-lg border border-white/10 bg-[#07111d] px-2 py-2">
                      {prospect.accuracyLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!prospect.canScout}
                    onClick={() => handleScoutProspect(prospect.prospectId)}
                    className="rounded-lg border border-fuchsia-200/25 bg-fuchsia-300/10 px-3 py-2 text-xs font-semibold text-fuchsia-50 transition hover:bg-fuchsia-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Scouten
                  </button>
                  <button
                    type="button"
                    disabled={!prospect.canDraft}
                    onClick={() => handleDraftProspect(prospect.prospectId)}
                    className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Draften
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showAdvancedLocalActions ? (
      <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Status
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{detailState.statusLabel}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Woche
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {detailState.currentWeekLabel}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Spieler
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {detailState.playerCountLabel}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Ready
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {detailState.readyProgressLabel}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Spielerliste</h2>
          {detailState.players.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {detailState.players.map((user) => (
                <div
                  key={user.userId}
                  className={`rounded-lg border px-4 py-3 ${
                    user.isCurrentUser
                      ? "border-emerald-300/40 bg-emerald-300/10"
                      : "border-white/10 bg-[#07111d]/70"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-white">{user.username}</p>
                    {user.isCurrentUser ? (
                      <span className="w-fit rounded-full border border-emerald-200/30 px-3 py-1 text-xs font-semibold text-emerald-100">
                        Du
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-emerald-100">
                    {user.teamName}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {user.teamStatus === "vacant" ? "Vakant" : "Besetzt"}
                  </p>
                  <span
                    className={`mt-3 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                      user.readyForWeek
                        ? "border-emerald-200/30 text-emerald-100"
                        : "border-white/10 text-slate-300"
                    }`}
                  >
                    {user.readyLabel}
                  </span>
                  <p className="mt-1 font-mono text-xs text-slate-400">{user.userId}</p>
                  <p className="mt-2 text-xs text-slate-500">Beigetreten: {user.joinedAt}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/4 p-5 text-slate-200">
              Noch keine Spieler in dieser Liga.
            </div>
          )}
        </section>
      </div>
      ) : null}
    </section>
  );
}
