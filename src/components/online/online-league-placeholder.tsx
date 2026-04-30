"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  setOnlineLeagueUserReady,
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
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { ensureCurrentOnlineUser, type OnlineUser } from "@/lib/online/online-user-service";
import { GlossaryTerm } from "./online-glossary";
import { OnlineModeStatus } from "./online-mode-status";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";
import {
  getOnlineLeaguePriceChangeHint,
  toOnlineLeagueDetailState,
} from "./online-league-detail-model";

const TRAINING_INTENSITIES: TrainingIntensity[] = ["light", "normal", "hard", "extreme"];
const TRAINING_PRIMARY_FOCI: TrainingPrimaryFocus[] = [
  "offense",
  "defense",
  "balanced",
  "conditioning",
  "recovery",
  "player_development",
  "team_chemistry",
];
const TRAINING_SECONDARY_FOCI: Array<TrainingSecondaryFocus | "none"> = [
  "none",
  "passing_game",
  "running_game",
  "pass_protection",
  "pass_rush",
  "run_defense",
  "coverage",
  "turnovers",
  "red_zone",
  "two_minute_drill",
  "special_teams",
];
const TRAINING_RISK_LEVELS: TrainingRiskTolerance[] = ["low", "medium", "high"];
const MEDIA_EXPECTATION_GOALS: OnlineMediaExpectationGoal[] = [
  "rebuild",
  "playoffs",
  "championship",
];
const FRANCHISE_STRATEGIES: FranchiseStrategyType[] = [
  "rebuild",
  "win_now",
  "balanced",
  "youth_focus",
];
const EXPERT_MODE_STORAGE_KEY = "afbm-online-league-expert-mode";

function getTrainingIntensityLabel(intensity: TrainingIntensity) {
  if (intensity === "light") {
    return "Leicht";
  }

  if (intensity === "normal") {
    return "Normal";
  }

  if (intensity === "hard") {
    return "Hart";
  }

  return "Extrem";
}

function getTrainingFocusLabel(focus: TrainingPrimaryFocus) {
  const labels: Record<TrainingPrimaryFocus, string> = {
    offense: "Offense",
    defense: "Defense",
    balanced: "Ausgewogen",
    conditioning: "Kondition",
    recovery: "Erholung",
    player_development: "Spielerentwicklung",
    team_chemistry: "Team-Chemistry",
  };

  return labels[focus];
}

function getTrainingRiskLabel(riskTolerance: TrainingRiskTolerance) {
  if (riskTolerance === "low") {
    return "Vorsichtig";
  }

  if (riskTolerance === "medium") {
    return "Normal";
  }

  return "Risikofreudig";
}

function getTrainingPreview(
  intensity: TrainingIntensity,
  focus: TrainingPrimaryFocus,
  riskTolerance: TrainingRiskTolerance,
  youngPlayerPriority: number,
  veteranMaintenance: number,
) {
  const focusBenefit: Record<TrainingPrimaryFocus, string> = {
    offense: "Mehr Fokus auf offensive Spielvorbereitung.",
    defense: "Mehr Fokus auf defensive Spielvorbereitung.",
    balanced: "Stabile Allround-Vorbereitung ohne klare Schwachstelle.",
    conditioning: "Mehr Kondition, aber etwas mehr Belastung.",
    recovery: "Entlastet den Kader und senkt Belastungsrisiken.",
    player_development: "Mehr langfristiger Fortschritt, besonders für junge Spieler.",
    team_chemistry: "Stärkt den Zusammenhalt im Team.",
  };
  const fatigueByIntensity: Record<TrainingIntensity, string> = {
    light: "Müdigkeit sinkt eher oder bleibt sehr niedrig.",
    normal: "Müdigkeit bleibt kontrollierbar.",
    hard: "Müdigkeit steigt spürbar.",
    extreme: "Müdigkeit steigt stark.",
  };
  const injuryByIntensity: Record<TrainingIntensity, string> = {
    light: "Verletzungsrisiko bleibt niedrig.",
    normal: "Verletzungsrisiko bleibt moderat.",
    hard: "Verletzungsrisiko steigt.",
    extreme: "Verletzungsrisiko steigt deutlich.",
  };
  const preparation =
    focus === "offense" || focus === "defense"
      ? "Spielvorbereitung: deutlicher Wochenfokus."
      : focus === "balanced"
        ? "Spielvorbereitung: solider Grundbonus."
        : focus === "recovery"
          ? "Spielvorbereitung: bewusst niedriger, dafür Erholung."
          : "Spielvorbereitung: kleiner bis mittlerer Effekt.";
  const chemistry =
    focus === "team_chemistry"
      ? "Chemistry: klar positiv."
      : focus === "balanced"
        ? "Chemistry: leicht positiv."
        : intensity === "extreme"
          ? "Chemistry: kann durch extreme Belastung leiden."
          : intensity === "hard"
            ? "Chemistry: kann leicht unter Belastung leiden."
            : "Chemistry: voraussichtlich stabil.";
  const riskLevel =
    intensity === "extreme" || (intensity === "hard" && riskTolerance === "high")
      ? "Kritisch"
      : intensity === "hard" || riskTolerance === "high"
        ? "Erhöht"
        : "Kontrolliert";
  const warnings = [
    ...(intensity === "hard"
      ? ["Hartes Training ist ein kurzfristiger Push, erhöht aber Müdigkeit und Verletzungsrisiko."]
      : []),
    ...(intensity === "extreme"
      ? ["Extremes Training ist riskant: hohe Müdigkeit, höheres Verletzungsrisiko und mögliche Chemistry-Verluste."]
      : []),
    ...(riskTolerance === "high"
      ? ["Risikofreudige Ausführung kann den kurzfristigen Effekt erhöhen, ist aber anfälliger für Belastungsprobleme."]
      : []),
  ];

  return {
    title: `${getTrainingFocusLabel(focus)} / ${getTrainingIntensityLabel(intensity)}`,
    benefit: focusBenefit[focus],
    fatigue:
      veteranMaintenance >= 70
        ? `${fatigueByIntensity[intensity]} Veteranen werden zusätzlich geschont.`
        : fatigueByIntensity[intensity],
    injuryRisk:
      focus === "recovery"
        ? "Verletzungsrisiko sinkt eher, weil Erholung priorisiert wird."
        : injuryByIntensity[intensity],
    preparation,
    chemistry,
    development:
      focus === "player_development" || youngPlayerPriority >= 70
        ? "Entwicklung: junge Spieler werden stärker priorisiert."
        : "Entwicklung: normaler Wochenfortschritt.",
    riskLevel,
    warnings,
  };
}

function getToneClass(tone: "good" | "neutral" | "critical") {
  if (tone === "good") {
    return "border-emerald-200/30 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "critical") {
    return "border-rose-200/30 bg-rose-300/10 text-rose-100";
  }

  return "border-amber-200/30 bg-amber-300/10 text-amber-100";
}

function formatContractCurrency(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

type ContractRiskPlayer = {
  playerName: string;
  salaryPerYear: number;
  capHitPerYear: number;
  signingBonus: number;
  deadCapPerYear?: number;
  guaranteedMoney?: number;
  yearsRemaining: number;
};

type ContractRiskCap = {
  availableCap: number;
};

function getReleaseWarningText(player: ContractRiskPlayer, cap: ContractRiskCap) {
  const deadCap = player.deadCapPerYear ?? 0;
  const nextCapSpace = cap.availableCap + player.capHitPerYear - deadCap;

  return [
    `${player.playerName} entlassen?`,
    "Entlassen entfernt den Spieler sofort aus deinem aktiven Kader.",
    `Dead Cap: ${formatContractCurrency(deadCap)}.`,
    `Neuer geschätzter Cap Space: ${formatContractCurrency(nextCapSpace)}.`,
    "Dead Cap bleibt als Altlast im Cap und kann spätere Moves einschränken.",
  ].join("\n");
}

function getExtensionWarningText(player: ContractRiskPlayer, cap: ContractRiskCap) {
  const nextYears = Math.max(1, player.yearsRemaining + 1);
  const nextCapHit = Math.round(player.salaryPerYear + player.signingBonus / nextYears);
  const nextDeadCap = Math.round(((player.guaranteedMoney ?? 0) + player.signingBonus) / nextYears);
  const nextCapSpace = cap.availableCap + player.capHitPerYear - nextCapHit;
  const warnings = [
    `${player.playerName} um 1 Jahr verlängern?`,
    `Neue Laufzeit: ${nextYears} Jahre.`,
    `Signing Bonus: ${formatContractCurrency(player.signingBonus)}.`,
    `Geschätzter Cap Hit/Jahr: ${formatContractCurrency(nextCapHit)}.`,
    `Geschätzter Dead Cap/Jahr: ${formatContractCurrency(nextDeadCap)}.`,
    `Neuer geschätzter Cap Space: ${formatContractCurrency(nextCapSpace)}.`,
  ];

  if (player.signingBonus >= 5_000_000) {
    warnings.push("Achtung: Hoher Bonus bindet Geld über mehrere Jahre und erhöht Dead-Cap-Risiko.");
  }

  if (nextCapSpace < 0) {
    warnings.push("Warnung: Diese Verlängerung kann den Salary Cap überschreiten und blockiert werden.");
  }

  return warnings.join("\n");
}

function getFreeAgentWarningText(player: ContractRiskPlayer, cap: ContractRiskCap) {
  const nextCapSpace = cap.availableCap - player.capHitPerYear;
  const warnings = [
    `${player.playerName} verpflichten?`,
    `Laufzeit: ${player.yearsRemaining} Jahre.`,
    `Cap Hit/Jahr: ${formatContractCurrency(player.capHitPerYear)}.`,
    `Signing Bonus: ${formatContractCurrency(player.signingBonus)}.`,
    `Neuer geschätzter Cap Space: ${formatContractCurrency(nextCapSpace)}.`,
  ];

  if (nextCapSpace < 0) {
    warnings.push("Warnung: Diese Verpflichtung kann den Salary Cap überschreiten und blockiert werden.");
  }

  return warnings.join("\n");
}

export function OnlineLeaguePlaceholder({ leagueId }: { leagueId: string }) {
  const [league, setLeague] = useState<OnlineLeague | null>(null);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [loaded, setLoaded] = useState(false);
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
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [mediaFeedback, setMediaFeedback] = useState<string | null>(null);
  const [franchiseStrategy, setFranchiseStrategy] =
    useState<FranchiseStrategyType>("balanced");
  const [strategyFeedback, setStrategyFeedback] = useState<string | null>(null);
  const [ticketPriceLevel, setTicketPriceLevel] = useState(55);
  const [merchPriceLevel, setMerchPriceLevel] = useState(55);
  const [pricingFeedback, setPricingFeedback] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const detailState = toOnlineLeagueDetailState(league, currentUser);
  const modeStatus = getOnlineModeStatusCopy(repository.mode);

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
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setCurrentUser(ensureCurrentOnlineUser());
      });

    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let active = true;

    setLoaded(false);

    const unsubscribe = repository.subscribeToLeague(
      leagueId,
      (loadedLeague) => {
        if (!active) {
          return;
        }

        setLeague(loadedLeague);
        const leagueUser = loadedLeague?.users.find(
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
        setLoaded(true);
      },
      () => {
        if (active) {
          setLeague(getOnlineLeagueById(leagueId));
          setLoaded(true);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser, leagueId, repository]);

  async function handleReadyForWeek() {
    if (!currentUser || pendingAction) {
      return;
    }

    setPendingAction("ready");

    try {
      const updatedLeague =
        repository.mode === "firebase"
          ? await repository.setUserReady(leagueId, true)
          : setOnlineLeagueUserReady(leagueId, currentUser.userId);

      if (updatedLeague) {
        setLeague(updatedLeague);
        setActionFeedback({
          tone: "success",
          message: `Du bist bereit für Week ${updatedLeague.currentWeek}.`,
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

    const result = claimVacantOnlineTeam(leagueId, teamId, currentUser);
    setLeague(result.league);
  }

  function handleSaveFranchiseStrategy() {
    if (!currentUser) {
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

    const result = acceptOnlineTradeProposal(leagueId, tradeId, currentUser.userId);

    setLeague(result.league);
    setTradeFeedback(result.message);
  }

  function handleDeclineTrade(tradeId: string) {
    if (!currentUser) {
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

    const result = makeOnlineDraftPick(leagueId, currentUser.userId, prospectId);

    if (result.league) {
      setLeague(result.league);
    }
    setDraftFeedback(result.message);
  }

  function handleHireCoach(coachId: string) {
    if (!currentUser) {
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
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-slate-200">
        Liga wird geladen...
      </div>
    );
  }

  if (detailState.status === "missing") {
    return (
      <section className="w-full rounded-lg border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
        <h1
          className="text-3xl font-semibold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {detailState.message}
        </h1>
        <p className="mt-3 text-sm text-amber-100/85">
          {modeStatus.missingLeagueHelper}
        </p>
        <Link
          href="/online"
          className="mt-6 inline-flex rounded-lg border border-amber-100/25 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/10"
        >
          Zurück zum Online Hub
        </Link>
      </section>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Online Liga
          </p>
          <h1
            className="mt-2 text-4xl font-semibold text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {detailState.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
            <span className="rounded-full border border-white/10 px-3 py-1">
              {detailState.statusLabel}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {detailState.currentWeekLabel}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {detailState.playerCountLabel} Spieler
            </span>
          </div>
          <OnlineModeStatus context="dashboard" compact />
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            href="/online"
            className="w-fit rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
          >
            Zurück zum Online Hub
          </Link>
          <span className="w-fit rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50">
            {detailState.currentUserReady
              ? `Du bist bereit für ${detailState.currentWeekLabel}`
              : "Noch nicht bereit"}
          </span>
        </div>
      </div>

      {actionFeedback ? (
        <div
          aria-live="polite"
          className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
            actionFeedback.tone === "success"
              ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
              : "border-amber-200/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          {actionFeedback.message}
        </div>
      ) : null}

      {detailState.allPlayersReadyLabel ? (
        <div className="mt-6 rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {detailState.allPlayersReadyLabel}
        </div>
      ) : null}

      <section
        aria-labelledby="first-steps-title"
        className="mt-6 rounded-lg border border-emerald-200/45 bg-emerald-300/12 p-5 shadow-xl shadow-emerald-950/30"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
              Erste Schritte
            </p>
            <h2 id="first-steps-title" className="mt-2 text-2xl font-semibold text-white">
              Was jetzt tun?
            </h2>
          </div>
          <p className="w-fit rounded-full border border-emerald-100/25 bg-emerald-50/10 px-3 py-1 text-sm font-semibold text-emerald-50">
            {detailState.firstSteps.progressLabel}
          </p>
        </div>

        <ol className="mt-5 grid gap-3 lg:grid-cols-3">
          {detailState.firstSteps.items.map((step, index) => (
            <li
              key={step.id}
              className={`rounded-lg border p-4 ${
                step.completed
                  ? "border-emerald-200/35 bg-emerald-200/12"
                  : "border-white/10 bg-[#07111d]/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    step.completed
                      ? "border-emerald-100/45 bg-emerald-300/25 text-emerald-50"
                      : "border-white/15 bg-white/5 text-slate-200"
                  }`}
                >
                  {step.completed ? "✓" : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{step.label}</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/85">
                    {step.description}
                  </p>
                  <p
                    className={`mt-3 text-xs font-semibold uppercase tracking-[0.14em] ${
                      step.completed ? "text-emerald-200" : "text-amber-200"
                    }`}
                  >
                    {step.statusLabel}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-lg border border-emerald-100/25 bg-[#07111d]/70 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                <GlossaryTerm term="readyState">Ready-State</GlossaryTerm>
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Bereit heißt: Deine Woche ist freigegeben
              </h3>
              <p className="mt-3 text-sm leading-6 text-emerald-50/85">
                Wenn du bereit bist, wartest du auf die anderen <GlossaryTerm term="gm">GMs</GlossaryTerm> oder den Admin.
                Du kannst auch später noch Änderungen machen, solange die Woche nicht simuliert wurde.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {readyGuidanceItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      item.completed
                        ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-50"
                        : "border-amber-200/25 bg-amber-300/10 text-amber-100"
                    }`}
                  >
                    <span aria-hidden="true">{item.completed ? "✓ " : "• "}</span>
                    {item.label === "Strategie/Depth Chart optional geprüft" ? (
                      <>
                        Strategie/<GlossaryTerm term="depthChart">Depth Chart</GlossaryTerm> optional geprüft
                      </>
                    ) : (
                      item.label
                    )}
                    <span className="mt-1 block text-xs uppercase tracking-[0.14em] opacity-80">
                      {item.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2 lg:min-w-48">
              <button
                type="button"
                disabled={
                  !detailState.ownTeamName ||
                  detailState.currentUserReady ||
                  pendingAction !== null
                }
                onClick={handleReadyForWeek}
                aria-busy={pendingAction === "ready"}
                className="w-fit rounded-lg border border-emerald-100/35 bg-emerald-200/18 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-200/24 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400"
              >
                {pendingAction === "ready"
                  ? "Speichert..."
                  : detailState.currentUserReady
                    ? `Du bist bereit für ${detailState.currentWeekLabel}`
                    : `Bereit für ${detailState.currentWeekLabel}`}
              </button>
              <p className="text-sm font-semibold text-emerald-50/80">
                {detailState.nextActionLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-amber-200/30 bg-amber-300/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
              Liga-Regeln
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Admin, Ready-State und Inaktivität
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-50/85">
              {expertMode
                ? detailState.leagueRules.compactSummary
                : "Diese Hinweise gelten, damit Admin-Eingriffe und Teamfreigaben früh verständlich sind."}
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-100/25 bg-amber-50/10 px-3 py-1 text-xs font-semibold text-amber-50">
            {detailState.leagueRules.sourceLabel}
          </span>
        </div>

        <ul className={`mt-4 grid gap-2 ${expertMode ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
          {detailState.leagueRules.items.map((rule) => (
            <li
              key={rule}
              className="rounded-lg border border-amber-100/20 bg-[#07111d]/65 px-3 py-2 text-sm font-semibold leading-6 text-amber-50"
            >
              {rule}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-6 text-slate-200">
          {detailState.leagueRules.activityRuleLabel}
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-sky-200/20 bg-[#07111d]/80 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
              {detailState.weekFlow.title}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {detailState.weekFlow.weekLabel}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Dein Ready-State
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.weekFlow.playerReadyStatusLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <GlossaryTerm term="weekSimulation">Wochen-Simulation</GlossaryTerm>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.weekFlow.simulationStatusLabel}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Wartestatus
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {detailState.weekFlow.waitingStatusLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <p className="rounded-lg border border-sky-200/20 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-50">
            {detailState.readyProgressLabel}
          </p>
          <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
            {detailState.weekFlow.adminProgressLabel}
          </p>
          <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
            Nächste Partie: {detailState.weekFlow.nextMatchLabel}
          </p>
        </div>

        {detailState.weekFlow.showStartWeekButton ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled
              className="w-fit rounded-lg border border-sky-200/25 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {detailState.weekFlow.startWeekButtonLabel}
            </button>
            <p className="text-sm font-semibold text-slate-300">
              {detailState.weekFlow.startWeekHint}
            </p>
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Dein Team
          </p>
          {detailState.ownTeamName ? (
            <>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                {detailState.ownTeamName}
              </h2>
              <p className="mt-2 text-sm text-emerald-100">
                Coach: {detailState.ownCoachName}
              </p>
              {expertMode ? (
                <div className="mt-4 grid gap-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    <GlossaryTerm term="owner">Owner</GlossaryTerm> / Job-Sicherheit
                  </p>
                  <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 font-semibold text-emerald-50">
                    <GlossaryTerm term="ownerConfidence">Owner Confidence</GlossaryTerm>: {detailState.ownerConfidenceLabel}
                  </p>
                  <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 font-semibold text-emerald-50">
                    Job Security: {detailState.jobSecurityLabel}
                  </p>
                  <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200">
                    {detailState.ownerExpectationLabel}
                  </p>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-slate-200">
                    <p className="font-semibold text-white">
                      Media: {detailState.mediaExpectationLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {detailState.mediaExpectationNarrative}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {MEDIA_EXPECTATION_GOALS.map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => handleSetMediaExpectation(goal)}
                          className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                        >
                          {goal === "rebuild"
                            ? "Rebuild"
                            : goal === "playoffs"
                              ? "Playoffs"
                              : "Championship"}
                        </button>
                      ))}
                    </div>
                    {mediaFeedback ? (
                      <p className="mt-3 text-xs font-semibold text-emerald-100">
                        {mediaFeedback}
                      </p>
                    ) : null}
                  </div>
                  <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200">
                    {detailState.jobSecurityExplanation}
                  </p>
                  {detailState.inactivityWarningLabel ? (
                    <p className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 font-semibold text-amber-100">
                      {detailState.inactivityWarningLabel}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-50">
                  Team ist bereit für die ersten Schritte. <GlossaryTerm term="owner">Owner</GlossaryTerm>- und Job-Sicherheitsdetails liegen im Expertenmodus.
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-emerald-200/25 p-4 text-sm text-emerald-100">
              Tritt der Liga bei, um dein Team zu erhalten.
              {detailState.vacantTeams.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {detailState.vacantTeams.map((team) => (
                    <button
                      key={team.teamId}
                      type="button"
                      onClick={() => handleClaimVacantTeam(team.teamId)}
                      className="rounded-lg border border-emerald-200/30 bg-emerald-300/10 px-3 py-2 text-left text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                    >
                      Vakantes Team übernehmen: {team.teamName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#07111d]/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
            Nächste Partie
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">{detailState.nextMatchLabel}</h2>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
            {detailState.waitingLabel}
          </p>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
            {detailState.readyProgressLabel}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Demnächst
          </p>
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-emerald-200/20 bg-[#07111d]/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Command Center
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Was jetzt wichtig ist</h2>
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100">
          {detailState.nextActionLabel}
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Kader
            </p>
            {detailState.roster ? (
              <>
                <p className="mt-2 text-lg font-semibold text-white">
                  {detailState.roster.totalPlayersLabel}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {detailState.roster.starterAverageLabel} · <GlossaryTerm term="starter">Starter</GlossaryTerm>
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-300">
                Noch kein Team-Kader geladen.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Standings
            </p>
            <div className="mt-3 grid gap-2">
              {detailState.standings.slice(0, 4).map((standing) => (
                <div
                  key={standing.teamName}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-semibold text-white">{standing.teamName}</span>
                  <span className="font-mono text-slate-300">{standing.recordLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Letzte Ergebnisse
            </p>
            {detailState.recentResults.length > 0 ? (
              <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-200">
                {detailState.recentResults.map((result) => (
                  <p key={result.matchId}>{result.label}</p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-300">
                Noch keine Online-Ergebnisse.
              </p>
            )}
          </div>
        </div>

        {detailState.roster && detailState.roster.depthChart.length > 0 ? (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <GlossaryTerm term="depthChart">Depth Chart</GlossaryTerm>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {detailState.roster.depthChart.map((entry, index) => (
                <div
                  key={entry.position}
                  className="rounded-lg border border-white/10 bg-[#07111d]/70 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-white">
                    {entry.position}: {entry.starterName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{entry.backupLabel}</p>
                  {entry.backupLabel === "Keine Backups" && index === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      <GlossaryTerm term="backup">Backup</GlossaryTerm>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-lg border border-white/10 bg-[#07111d]/80 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Ansicht
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Beginner Mode</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Standardmäßig bleiben Wochenablauf, Team, Training und <GlossaryTerm term="readyState">Ready-State</GlossaryTerm> im Fokus.
              Verträge, Trades, <GlossaryTerm term="draft">Draft</GlossaryTerm>, Finanzen, Coaches und <GlossaryTerm term="owner">Owner</GlossaryTerm>-Druck bleiben erreichbar.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={expertMode}
            onClick={handleToggleExpertMode}
            className="w-fit rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            {expertMode ? "Expertenmodus ausblenden" : "Expertenmodus anzeigen"}
          </button>
        </div>
      </section>

      {expertMode && detailState.franchise ? (
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

      {expertMode && detailState.coaching ? (
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

      {expertMode && detailState.contracts ? (
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

      {expertMode && detailState.trades ? (
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

      {expertMode && detailState.draft ? (
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

      {expertMode ? (
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
