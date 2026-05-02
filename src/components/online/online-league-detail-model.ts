import {
  getAvailableOnlineCoaches,
  getOnlineLeagueDraftOrderForDisplay,
  getOnlineLeagueProspectsForDisplay,
} from "@/lib/online/online-league-service";
import {
  getFanMoodTier,
  getTeamChemistryTier,
} from "@/lib/online/online-league-metrics";
import { getOnlineLeagueWeekReadyState } from "@/lib/online/online-league-week-service";
import type {
  CoachRole,
  OnlineLeague,
} from "@/lib/online/online-league-types";
import type { OnlineUser } from "@/lib/online/online-user-service";

export type OnlineLeagueDetailPlayer = {
  userId: string;
  username: string;
  joinedAt: string;
  teamId: string;
  teamName: string;
  teamStatus: string;
  readyForWeek: boolean;
  readyLabel: string;
  isCurrentUser: boolean;
};

export type OnlineLeagueVacantTeam = {
  teamId: string;
  teamName: string;
};

export type OnlineLeagueWeekFlowState = {
  title: string;
  weekLabel: string;
  phaseLabel: string;
  statusLabel: string;
  simulationStatusLabel: string;
  playerReadyStatusLabel: string;
  waitingStatusLabel: string;
  adminProgressLabel: string;
  nextMatchLabel: string;
  nextActionCtaLabel: string;
  completedResultsLabel: string | null;
  showStartWeekButton: boolean;
  startWeekButtonLabel: string;
  startWeekHint: string;
  lastCompletedWeekLabel: string | null;
};

export type OnlineLeagueRulesState = {
  sourceLabel: string;
  compactSummary: string;
  items: string[];
  activityRuleLabel: string;
};

export type OnlineLeagueFranchiseState = {
  strategyLabel: string;
  strategyNarrative: string;
  strategyRiskLabel: string;
  strategyImpactLabel: string;
  strategyExpectationLabel: string;
  stadiumName: string;
  capacityLabel: string;
  lastAttendanceLabel: string;
  averageAttendanceLabel: string;
  ticketPriceLabel: string;
  merchPriceLabel: string;
  fanMoodLabel: string;
  fanPressureLabel: string;
  teamChemistryLabel: string;
  gameplayModifierLabel: string;
  merchTrendLabel: string;
  ticketRevenueLabel: string;
  merchandiseRevenueLabel: string;
  seasonProfitLossLabel: string;
  ownerFinanceInfluenceLabel: string;
  dataContextLabel: string;
  fanMoodAssessment: OnlineLeagueMetricAssessment;
  fanPressureAssessment: OnlineLeagueMetricAssessment;
  financeAssessment: OnlineLeagueMetricAssessment;
  pricingAssessment: OnlineLeagueMetricAssessment;
};

export type OnlineLeagueMetricTone = "good" | "neutral" | "critical";

export type OnlineLeagueMetricAssessment = {
  tone: OnlineLeagueMetricTone;
  label: string;
  reason: string;
  action: string;
};

export type OnlineLeaguePriceHint = {
  tone: OnlineLeagueMetricTone;
  label: string;
  text: string;
};

export type OnlineLeagueTrainingState = {
  staffStrengthLabel: string;
  currentPlanLabel: string;
  currentPlanSourceLabel: string;
  expectedEffectLabel: string;
  riskHint: string;
  coachComment: string;
  lastOutcomeLabel: string;
  lastDevelopmentLabel: string;
  lastFatigueLabel: string;
  lastChemistryLabel: string;
  lastInjuryRiskLabel: string;
  lastPreparationLabel: string;
};

export type OnlineContractListPlayer = {
  playerId: string;
  playerName: string;
  position: string;
  salaryPerYear: number;
  capHitPerYear: number;
  signingBonus: number;
  deadCapPerYear: number;
  guaranteedMoney: number;
  yearsRemaining: number;
  overallLabel: string;
  potentialLabel: string;
  developmentPathLabel: string;
  developmentProgressLabel: string;
  xFactorLabel: string;
  salaryLabel: string;
  capHitLabel: string;
  signingBonusLabel: string;
  deadCapPerYearLabel: string;
  contractTypeLabel: string;
  yearsLabel: string;
  guaranteedLabel: string;
  status: string;
};

export type OnlineFreeAgentListPlayer = {
  playerId: string;
  playerName: string;
  position: string;
  salaryPerYear: number;
  capHitPerYear: number;
  signingBonus: number;
  yearsRemaining: number;
  salaryLabel: string;
  yearsLabel: string;
};

export type OnlineLeagueContractState = {
  capLimit: number;
  activeSalary: number;
  capUsage: number;
  availableCap: number;
  deadCap: number;
  capLimitLabel: string;
  activeSalaryLabel: string;
  capUsageLabel: string;
  availableCapLabel: string;
  deadCapLabel: string;
  capRiskLabel: string;
  players: OnlineContractListPlayer[];
  freeAgents: OnlineFreeAgentListPlayer[];
};

export type OnlineTradeBoardItem = {
  tradeId: string;
  direction: "incoming" | "outgoing";
  partnerTeamName: string;
  status: string;
  fairnessLabel: string;
  fairnessScoreLabel: string;
  offeredLabel: string;
  requestedLabel: string;
  canRespond: boolean;
};

export type OnlineLeagueTradeState = {
  items: OnlineTradeBoardItem[];
  hasTradePartner: boolean;
  suggestedPartnerLabel: string;
};

export type OnlineLeagueProspectItem = {
  prospectId: string;
  playerName: string;
  position: string;
  scoutedRatingLabel: string;
  potentialLabel: string;
  accuracyLabel: string;
  statusLabel: string;
  canScout: boolean;
  canDraft: boolean;
};

export type OnlineLeagueDraftState = {
  currentPickLabel: string;
  canDraftCurrentPick: boolean;
  prospects: OnlineLeagueProspectItem[];
  historyLabel: string;
};

export type OnlineLeagueCoachRoleItem = {
  role: CoachRole;
  label: string;
  name: string;
  offenseLabel: string;
  defenseLabel: string;
  developmentLabel: string;
};

export type OnlineLeagueAvailableCoachItem = {
  coachId: string;
  name: string;
  roleLabel: string;
  offenseLabel: string;
  defenseLabel: string;
  developmentLabel: string;
};

export type OnlineLeagueCoachingState = {
  staff: OnlineLeagueCoachRoleItem[];
  available: OnlineLeagueAvailableCoachItem[];
};

export type OnlineLeagueRosterState = {
  totalPlayersLabel: string;
  starterAverageLabel: string;
  depthChart: {
    position: string;
    starterName: string;
    backupLabel: string;
  }[];
};

export type OnlineLeagueFirstStepsItem = {
  id: "team" | "training" | "ready";
  label: string;
  description: string;
  completed: boolean;
  statusLabel: string;
};

export type OnlineLeagueFirstStepsState = {
  progressLabel: string;
  completedCount: number;
  totalCount: number;
  items: OnlineLeagueFirstStepsItem[];
};

export type OnlineLeagueStandingItem = {
  teamName: string;
  recordLabel: string;
};

export type OnlineLeagueResultItem = {
  matchId: string;
  label: string;
};

export type OnlineLeagueDetailState =
  | {
      status: "found";
      name: string;
      statusLabel: string;
      currentWeekLabel: string;
      playerCountLabel: string;
      readyProgressLabel: string;
      allPlayersReady: boolean;
      allPlayersReadyLabel: string | null;
      ownTeamName: string | null;
      ownCoachName: string | null;
      ownerConfidenceLabel: string;
      ownerExpectationLabel: string;
      mediaExpectationLabel: string;
      mediaExpectationNarrative: string;
      jobSecurityLabel: string;
      jobSecurityExplanation: string;
      inactivityWarningLabel: string | null;
      currentUserReady: boolean;
      nextMatchLabel: string;
      waitingLabel: string;
      weekFlow: OnlineLeagueWeekFlowState;
      nextActionLabel: string;
      firstSteps: OnlineLeagueFirstStepsState;
      leagueRules: OnlineLeagueRulesState;
      roster: OnlineLeagueRosterState | null;
      standings: OnlineLeagueStandingItem[];
      recentResults: OnlineLeagueResultItem[];
      franchise: OnlineLeagueFranchiseState | null;
      training: OnlineLeagueTrainingState | null;
      contracts: OnlineLeagueContractState | null;
      trades: OnlineLeagueTradeState | null;
      draft: OnlineLeagueDraftState | null;
      coaching: OnlineLeagueCoachingState | null;
      players: OnlineLeagueDetailPlayer[];
      vacantTeams: OnlineLeagueVacantTeam[];
    }
  | {
      status: "missing";
      message: string;
    };

function getStatusLabel(status: OnlineLeague["status"]) {
  return status === "waiting" ? "Wartet auf Spieler" : "Saison läuft";
}

function getWeekFlowStatusLabel(allPlayersReady: boolean) {
  return allPlayersReady ? "Alle Spieler bereit" : "Wartet auf Ready-States";
}

function getWeekFlowPhaseLabel(league: OnlineLeague, allPlayersReady: boolean) {
  if (league.weekStatus === "simulating") {
    return "Simulation läuft";
  }

  if (league.weekStatus === "completed" || league.weekStatus === "post_game") {
    return "Woche abgeschlossen";
  }

  if (league.completedWeeks?.[0]?.nextWeek === league.currentWeek) {
    return allPlayersReady ? "Nächste Woche simulierbar" : "Nächste Woche offen";
  }

  return allPlayersReady ? "Simulation möglich" : "Woche offen";
}

function getWeekFlowSimulationStatusLabel(league: OnlineLeague, allPlayersReady: boolean) {
  if (league.weekStatus === "simulating") {
    return "Die Woche wird gerade simuliert. Bitte warte auf den Abschluss.";
  }

  if (league.completedWeeks?.[0]?.nextWeek === league.currentWeek) {
    return "Die letzte Woche ist abgeschlossen. Die neue Woche wartet auf Ready-States.";
  }

  return allPlayersReady
    ? "Alle aktiven Teams sind ready. Der Admin kann simulieren."
    : "Simulation bleibt gesperrt, bis alle aktiven Teams ready sind.";
}

function getWeekFlowNextMatchLabel(league: OnlineLeague) {
  const currentWeekMatch = league.schedule?.find(
    (match) => match.week === league.currentWeek,
  );

  if (!currentWeekMatch) {
    return "Spielplan wird im nächsten Schritt erstellt";
  }

  return `${currentWeekMatch.homeTeamName} vs. ${currentWeekMatch.awayTeamName}`;
}

function getLastCompletedWeekLabel(league: OnlineLeague) {
  const completedWeek = league.completedWeeks?.[0];

  if (!completedWeek) {
    return null;
  }

  return `Zuletzt abgeschlossen: Season ${completedWeek.season}, Week ${completedWeek.week}.`;
}

function getCompletedResultsLabel(league: OnlineLeague) {
  const completedWeek = league.completedWeeks?.[0];

  if (!completedWeek) {
    return null;
  }

  const resultCount = (league.matchResults ?? []).filter(
    (result) => result.season === completedWeek.season && result.week === completedWeek.week,
  ).length;

  return `${resultCount} Ergebnis${resultCount === 1 ? "" : "se"} gespeichert`;
}

function getTeamDisplayName(user: OnlineLeague["users"][number]) {
  return user.teamDisplayName ?? user.teamName;
}

function getJobSecurityLabel(user: OnlineLeague["users"][number] | undefined) {
  if (!user) {
    return "Noch keine GM-Rolle in dieser Liga";
  }

  return `${user.jobSecurity?.score ?? 72}/100 · ${user.jobSecurity?.status ?? "stable"}`;
}

function getOwnerExpectationLabel(user: OnlineLeague["users"][number] | undefined) {
  if (!user) {
    return "Tritt einer Liga bei, um das Owner-Profil deines Teams zu sehen.";
  }

  if (user.mediaExpectationProfile) {
    const goalLabel =
      user.mediaExpectationProfile.goal === "rebuild"
        ? "Rebuild"
        : user.mediaExpectationProfile.goal === "playoffs"
          ? "Playoffs"
          : "Championship";

    return `GM-Ziel: ${goalLabel}`;
  }

  const ownershipProfile = user.ownershipProfile;

  if (!ownershipProfile) {
    return "Owner-Profil wird vorbereitet";
  }

  if (ownershipProfile.ambition >= 80) {
    return "Owner erwartet Playoff-Teilnahme";
  }

  if (ownershipProfile.rebuildTolerance >= 70) {
    return "Owner toleriert Rebuild und junge Kader";
  }

  if (ownershipProfile.financialPressure >= 75) {
    return "Owner achtet stark auf Cap- und Finanzlage";
  }

  return "Owner erwartet stabile Entwicklung";
}

function getMediaExpectationLabel(user: OnlineLeague["users"][number] | undefined) {
  if (!user?.mediaExpectationProfile) {
    return "Noch kein Teamziel gesetzt";
  }

  const { goal, fanPressureModifier, ownerPressureModifier } = user.mediaExpectationProfile;
  const goalLabel =
    goal === "rebuild" ? "Rebuild" : goal === "playoffs" ? "Playoffs" : "Championship";

  return `${goalLabel} · Fan ${fanPressureModifier >= 0 ? "+" : ""}${fanPressureModifier} · Owner ${ownerPressureModifier >= 0 ? "+" : ""}${ownerPressureModifier}`;
}

function getJobSecurityExplanation(user: OnlineLeague["users"][number] | undefined) {
  if (!user) {
    return "Noch keine Bewertung vorhanden.";
  }

  const lastHistoryEntry = user.jobSecurity?.gmPerformanceHistory.at(-1);

  if (user.activity?.inactiveStatus && user.activity.inactiveStatus !== "active") {
    return "Inaktivitätswarnung: Week Action fehlt";
  }

  if (lastHistoryEntry?.expectationResult === "failed") {
    return "Geduld sinkt nach deutlicher Untererfüllung";
  }

  if (lastHistoryEntry?.expectationResult === "below") {
    return "Owner beobachtet die sportliche Entwicklung genauer";
  }

  return "Mehrwöchige und mehrsaisonale Bewertung aktiv";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-CH").format(Math.round(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function getAttendanceLabel(user: OnlineLeague["users"][number] | undefined) {
  const history = user?.attendanceHistory ?? [];
  const lastAttendance = history[0];
  const averageRate =
    history.reduce((sum, attendance) => sum + attendance.attendanceRate, 0) /
    Math.max(1, history.length);

  return {
    last: lastAttendance
      ? `${formatNumber(lastAttendance.attendance)} (${Math.round(lastAttendance.attendanceRate * 100)}%)`
      : "Noch kein Heimspiel",
    average: history.length > 0 ? `${Math.round(averageRate * 100)}% Saison` : "Noch keine Daten",
  };
}

function getMerchTrendLabel(user: OnlineLeague["users"][number] | undefined) {
  const history = user?.merchandiseFinancials ?? [];
  const current = history[0]?.totalMerchRevenue ?? 0;
  const previous = history[1]?.totalMerchRevenue ?? current;

  if (current === 0) {
    return "Noch kein Merch-Verlauf";
  }

  if (previous === 0 || current === previous) {
    return "Stabil";
  }

  const trend = Math.round(((current - previous) / previous) * 100);

  return trend > 0 ? `+${trend}%` : `${trend}%`;
}

function getMetricToneLabel(tone: OnlineLeagueMetricTone) {
  if (tone === "good") {
    return "Gut";
  }

  if (tone === "critical") {
    return "Kritisch";
  }

  return "Neutral";
}

function getFanMoodAssessment(fanMood: number): OnlineLeagueMetricAssessment {
  const tone: OnlineLeagueMetricTone =
    fanMood >= 70 ? "good" : fanMood >= 45 ? "neutral" : "critical";

  return {
    tone,
    label: getMetricToneLabel(tone),
    reason:
      tone === "good"
        ? "Fans tragen die aktuelle Teamrichtung positiv mit."
        : tone === "neutral"
          ? "Fans reagieren neutral auf die aktuelle Saison."
          : "Fans sind unzufrieden; Ergebnisse, Preise oder Erwartungen drücken die Stimmung.",
    action:
      tone === "critical"
        ? "Preise prüfen, Erwartungen realistisch setzen und sportliche Stabilität aufbauen."
        : "Halte Preise und Teamrichtung stabil, damit die Stimmung nicht kippt.",
  };
}

function getFanPressureAssessment(fanPressureScore: number): OnlineLeagueMetricAssessment {
  const tone: OnlineLeagueMetricTone =
    fanPressureScore <= 35 ? "good" : fanPressureScore <= 65 ? "neutral" : "critical";

  return {
    tone,
    label: getMetricToneLabel(tone),
    reason:
      tone === "good"
        ? "Der öffentliche Druck ist niedrig; du hast Handlungsspielraum."
        : tone === "neutral"
          ? "Fans beobachten die Richtung, ohne starken Druck aufzubauen."
          : "Hoher Fan-Druck kann Owner Confidence und Job-Sicherheit belasten.",
    action:
      tone === "critical"
        ? "Kurzfristig klare Fortschritte zeigen oder die Erwartungen aktiv senken."
        : "Kommuniziere eine klare Teamrichtung und vermeide unnötige Preissprünge.",
  };
}

function getFinanceAssessment(seasonProfitLoss: number): OnlineLeagueMetricAssessment {
  const tone: OnlineLeagueMetricTone =
    seasonProfitLoss >= 0 ? "good" : seasonProfitLoss >= -2_500_000 ? "neutral" : "critical";

  return {
    tone,
    label: getMetricToneLabel(tone),
    reason:
      tone === "good"
        ? "Die Saisonbilanz ist aktuell positiv oder ausgeglichen."
        : tone === "neutral"
          ? "Die Saisonbilanz ist leicht negativ, aber noch kontrollierbar."
          : "Die Saisonbilanz ist deutlich negativ und kann finanziellen Druck erhöhen.",
    action:
      tone === "critical"
        ? "Gehälter, Preise und Fan-Stimmung gemeinsam prüfen, bevor du teure Moves machst."
        : "Behalte Erlöse und Cap-Entscheidungen im Blick, bevor du die Preise stark änderst.",
  };
}

function getPricingAssessment(ticketPriceLevel: number, merchPriceLevel: number) {
  const highestPrice = Math.max(ticketPriceLevel, merchPriceLevel);
  const lowestPrice = Math.min(ticketPriceLevel, merchPriceLevel);
  const tone: OnlineLeagueMetricTone =
    highestPrice >= 80 ? "critical" : lowestPrice <= 25 ? "neutral" : "good";

  return {
    tone,
    label: getMetricToneLabel(tone),
    reason:
      tone === "critical"
        ? "Sehr hohe Preise können Stimmung und Auslastung senken."
        : tone === "neutral"
          ? "Sehr niedrige Preise helfen Fans, senken aber Erlöse pro Verkauf."
          : "Die Preise liegen in einem moderaten Bereich.",
    action:
      tone === "critical"
        ? "Preise schrittweise senken und prüfen, ob Fan-Stimmung oder Auslastung reagieren."
        : "Preise nur schrittweise verändern, damit Fan-Reaktion und Erlöse lesbar bleiben.",
  };
}

export function getOnlineLeaguePriceChangeHint(
  kind: "ticket" | "merch",
  value: number,
): OnlineLeaguePriceHint {
  const label = kind === "ticket" ? "Ticketpreise" : "Merch-Preise";

  if (value >= 80) {
    return {
      tone: "critical",
      label: "Kritisch",
      text: `${label} sind sehr hoch. Das kann Fan-Stimmung und Nachfrage belasten.`,
    };
  }

  if (value <= 25) {
    return {
      tone: "neutral",
      label: "Neutral",
      text: `${label} sind sehr niedrig. Das kann Fans helfen, senkt aber Erlöse pro Verkauf.`,
    };
  }

  if (value >= 65) {
    return {
      tone: "neutral",
      label: "Neutral",
      text: `${label} sind ambitioniert. Beobachte Stimmung und Auslastung nach der nächsten Auswertung.`,
    };
  }

  return {
    tone: "good",
    label: "Gut",
    text: `${label} liegen in einem moderaten Bereich.`,
  };
}

function getFranchiseState(
  user: OnlineLeague["users"][number] | undefined,
): OnlineLeagueFranchiseState | null {
  if (!user?.stadiumProfile || !user.fanbaseProfile || !user.financeProfile) {
    return null;
  }

  const attendance = getAttendanceLabel(user);
  const fanPressureScore = user.fanPressure?.fanPressureScore ?? 0;
  const chemistry = user.teamChemistryProfile;
  const lastHistoryEntry = user.jobSecurity?.gmPerformanceHistory.at(-1);
  const fanDelta = lastHistoryEntry?.jobSecurityDeltaFromFans ?? 0;
  const strategyType = user.franchiseStrategy?.strategyType ?? user.franchiseStrategy?.strategy;

  return {
    strategyLabel:
      strategyType === "rebuild"
        ? "Rebuild"
        : strategyType === "win_now"
          ? "Win Now"
          : strategyType === "youth_focus"
            ? "Youth Focus"
          : "Balanced",
    strategyNarrative:
      user.franchiseStrategy?.narrative ??
      "Ausgewogen: Die Franchise bleibt flexibel zwischen Entwicklung, Ergebnisdruck und finanzieller Stabilität.",
    strategyRiskLabel:
      user.franchiseStrategy?.riskExplanation ??
      "Extreme Kaderentscheidungen ohne klare Richtung werden weniger stark belohnt.",
    strategyImpactLabel:
      user.franchiseStrategy?.impactSummary ??
      "Ausgewogene Erwartungen, Standard-Finanzen, keine harten Systemboni.",
    strategyExpectationLabel: user.franchiseStrategy
      ? `${Math.round(user.franchiseStrategy.expectedWinRate * 100)}% Win Rate · ${
          user.franchiseStrategy.expectedPlayoff ? "Playoff-Erwartung" : "kein Playoff-Zwang"
        }`
      : "50% Win Rate · kein Playoff-Zwang",
    stadiumName: user.stadiumProfile.name,
    capacityLabel: `${formatNumber(user.stadiumProfile.capacity)} Plätze`,
    lastAttendanceLabel: attendance.last,
    averageAttendanceLabel: attendance.average,
    ticketPriceLabel: `${user.stadiumProfile.ticketPriceLevel}/100`,
    merchPriceLabel: `${user.stadiumProfile.merchPriceLevel}/100`,
    fanMoodLabel: `${user.fanbaseProfile.fanMood}/100 · ${getFanMoodTier(user.fanbaseProfile.fanMood)}`,
    fanPressureLabel: `${fanPressureScore}/100`,
    teamChemistryLabel: chemistry
      ? `${chemistry.score}/100 · ${getTeamChemistryTier(chemistry.score)}`
      : "Wird aufgebaut",
    gameplayModifierLabel: chemistry
      ? `${chemistry.gameplayModifier >= 0 ? "+" : ""}${Math.round(chemistry.gameplayModifier * 100)}%`
      : "0%",
    merchTrendLabel: getMerchTrendLabel(user),
    ticketRevenueLabel: formatCurrency(user.financeProfile.ticketRevenue),
    merchandiseRevenueLabel: formatCurrency(user.financeProfile.merchandiseRevenue),
    seasonProfitLossLabel: formatCurrency(user.financeProfile.seasonProfitLoss),
    ownerFinanceInfluenceLabel:
      fanDelta < 0
        ? `Owner Confidence ${fanDelta} durch Fan-Druck`
        : "Kein negativer Fan-Einfluss auf Owner Confidence",
    dataContextLabel:
      (user.attendanceHistory ?? []).length === 0
        ? "Noch keine Heimspiel-Historie: Auslastung und Erlöse sind frühe Liga-Startwerte."
        : "Basiert auf gespeicherten Saison- und Heimspielwerten.",
    fanMoodAssessment: getFanMoodAssessment(user.fanbaseProfile.fanMood),
    fanPressureAssessment: getFanPressureAssessment(fanPressureScore),
    financeAssessment: getFinanceAssessment(user.financeProfile.seasonProfitLoss),
    pricingAssessment: getPricingAssessment(
      user.stadiumProfile.ticketPriceLevel,
      user.stadiumProfile.merchPriceLevel,
    ),
  };
}

function getTrainingPlanLabel(user: OnlineLeague["users"][number], league: OnlineLeague) {
  const currentSeason = user.jobSecurity?.lastUpdatedSeason ?? 1;
  const currentPlan = user.weeklyTrainingPlans?.find(
    (plan) => plan.season === currentSeason && plan.week === league.currentWeek,
  );

  if (!currentPlan) {
    return {
      label: "Default: Normal / Ausgewogen",
      source: "Sicherer Auto-Default, falls kein Plan gespeichert wird",
    };
  }

  return {
    label: `${getTrainingIntensityDisplayLabel(currentPlan.intensity)} / ${getTrainingFocusDisplayLabel(currentPlan.primaryFocus)}`,
    source:
      currentPlan.source === "gm_submitted"
        ? `Gesetzt: ${currentPlan.submittedAt}`
        : "Auto-Default",
  };
}

function getTrainingIntensityDisplayLabel(
  intensity: NonNullable<
    OnlineLeague["users"][number]["weeklyTrainingPlans"]
  >[number]["intensity"],
) {
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

function getTrainingFocusDisplayLabel(
  focus: NonNullable<
    OnlineLeague["users"][number]["weeklyTrainingPlans"]
  >[number]["primaryFocus"],
) {
  const labels: Record<
    NonNullable<OnlineLeague["users"][number]["weeklyTrainingPlans"]>[number]["primaryFocus"],
    string
  > = {
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

function getTrainingExpectedEffectLabel(user: OnlineLeague["users"][number]) {
  const currentPlan = user.weeklyTrainingPlans?.[0];

  if (!currentPlan) {
    return "Normal/Balanced gibt stabile Vorbereitung ohne Spezialbonus.";
  }

  if (currentPlan.intensity === "hard") {
    return "Hartes Training erhöht kurzfristig die Vorbereitung, steigert aber Müdigkeit und Verletzungsrisiko.";
  }

  if (currentPlan.intensity === "extreme") {
    return "Extremes Training bringt den stärksten kurzfristigen Schub, kann Team-Chemistry und Gesundheit klar belasten.";
  }

  if (currentPlan.primaryFocus === "recovery") {
    return "Erholung senkt Müdigkeit, bringt aber kaum Entwicklungsfortschritt.";
  }

  if (currentPlan.primaryFocus === "player_development") {
    return "Player Development priorisiert langfristigen Fortschritt, besonders bei jungen Spielern.";
  }

  if (currentPlan.primaryFocus === "team_chemistry") {
    return "Team-Chemistry stärkt den Zusammenhalt, ohne die Spielvorbereitung hart zu pushen.";
  }

  return "Ausgewogener Plan mit kleinen, temporären Vorbereitungseffekten.";
}

function getTrainingState(
  user: OnlineLeague["users"][number] | undefined,
  league: OnlineLeague,
): OnlineLeagueTrainingState | null {
  if (!user?.coachingStaffProfile) {
    return null;
  }

  const staff = user.coachingStaffProfile;
  const staffAverage = Math.round(
    (staff.offenseTraining +
      staff.defenseTraining +
      staff.playerDevelopment +
      staff.injuryPrevention +
      staff.gamePreparation +
      staff.motivation) /
      6,
  );
  const plan = getTrainingPlanLabel(user, league);
  const lastOutcome = user.trainingOutcomes?.[0];

  return {
    staffStrengthLabel: `${staffAverage}/100 · ${staff.headCoachName}`,
    currentPlanLabel: plan.label,
    currentPlanSourceLabel: plan.source,
    expectedEffectLabel: getTrainingExpectedEffectLabel(user),
    riskHint:
      user.weeklyTrainingPlans?.[0]?.intensity === "extreme"
        ? "Risiko hoch: Chemistry-Malus und erhöhtes Verletzungsrisiko möglich."
        : "Trainingseffekte bleiben klein und temporär.",
    coachComment:
      staff.playerDevelopment >= 75
        ? "Dein Coaching Staff ist stark in Player Development."
        : staff.injuryPrevention >= 75
          ? "Dein Strength Staff kann Belastung gut abfedern."
          : "Coaches setzen den Plan solide um, aber Ratings begrenzen den Effekt.",
    lastOutcomeLabel: lastOutcome
      ? `Week ${lastOutcome.week} · Execution ${lastOutcome.coachExecutionRating}/100`
      : "Noch keine Trainingsauswertung. Sie entsteht nach der Wochen-Simulation.",
    lastDevelopmentLabel: lastOutcome
      ? `${lastOutcome.developmentDeltaSummary}`
      : "Noch offen",
    lastFatigueLabel: lastOutcome ? `${lastOutcome.fatigueDelta}` : "Noch offen",
    lastChemistryLabel: lastOutcome ? `${lastOutcome.chemistryDelta}` : "Noch offen",
    lastInjuryRiskLabel: lastOutcome ? `${lastOutcome.injuryRiskDelta}` : "Noch offen",
    lastPreparationLabel: lastOutcome ? `${lastOutcome.preparationBonus}` : "Noch offen",
  };
}

function getContractState(
  user: OnlineLeague["users"][number] | undefined,
  league: OnlineLeague,
): OnlineLeagueContractState | null {
  if (!user?.salaryCap || !user.contractRoster) {
    return null;
  }

  return {
    capLimit: user.salaryCap.capLimit,
    activeSalary: user.salaryCap.activeSalary,
    capUsage: user.salaryCap.currentCapUsage,
    availableCap: user.salaryCap.availableCap,
    deadCap: user.salaryCap.deadCap,
    capLimitLabel: formatCurrency(user.salaryCap.capLimit),
    activeSalaryLabel: formatCurrency(user.salaryCap.activeSalary),
    capUsageLabel: formatCurrency(user.salaryCap.currentCapUsage),
    availableCapLabel: formatCurrency(user.salaryCap.availableCap),
    deadCapLabel: formatCurrency(user.salaryCap.deadCap),
    capRiskLabel:
      user.salaryCap.capRiskLevel === "over"
        ? "Cap überschritten"
        : user.salaryCap.capRiskLevel === "tight"
          ? "Cap-Risiko: wenig Flexibilität"
          : "Cap gesund",
    players: user.contractRoster.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      salaryPerYear: player.contract.salaryPerYear,
      capHitPerYear: player.contract.capHitPerYear,
      signingBonus: player.contract.signingBonus,
      deadCapPerYear: player.contract.deadCapPerYear,
      guaranteedMoney: player.contract.guaranteedMoney,
      yearsRemaining: player.contract.yearsRemaining,
      overallLabel: `OVR ${player.overall}`,
      potentialLabel: `POT ${player.potential}`,
      developmentPathLabel:
        player.developmentPath === "star"
          ? "Star"
          : player.developmentPath === "solid"
            ? "Solid"
            : "Bust",
      developmentProgressLabel: `${Math.round(player.developmentProgress * 100) / 100} Dev`,
      xFactorLabel:
        player.xFactors.length > 0
          ? player.xFactors.map((xFactor) => xFactor.abilityName).join(", ")
          : "Kein X-Factor",
      salaryLabel: formatCurrency(player.contract.salaryPerYear),
      capHitLabel: formatCurrency(player.contract.capHitPerYear),
      signingBonusLabel: formatCurrency(player.contract.signingBonus),
      deadCapPerYearLabel: formatCurrency(player.contract.deadCapPerYear),
      contractTypeLabel:
        player.contract.contractType === "rookie"
          ? "Rookie"
          : player.contract.contractType === "star"
            ? "Star"
            : "Regular",
      yearsLabel: `${player.contract.yearsRemaining} Jahre`,
      guaranteedLabel: formatCurrency(player.contract.guaranteedMoney),
      status: player.status,
    })),
    freeAgents: (league.freeAgents ?? []).map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      salaryPerYear: player.contract.salaryPerYear,
      capHitPerYear: player.contract.capHitPerYear,
      signingBonus: player.contract.signingBonus,
      yearsRemaining: player.contract.yearsRemaining,
      salaryLabel: formatCurrency(player.contract.salaryPerYear),
      yearsLabel: `${player.contract.yearsRemaining} Jahre`,
    })),
  };
}

function getTradeAssetLabel(
  leagueUser: OnlineLeague["users"][number] | undefined,
  playerIds: string[],
  pickIds: string[],
) {
  const roster = leagueUser?.contractRoster ?? [];
  const picks = leagueUser?.draftPicks ?? [];
  const playerNames = playerIds.map(
    (playerId) =>
      roster.find((player) => player.playerId === playerId)?.playerName ?? playerId,
  );
  const pickNames = pickIds.map((pickId) => {
    const pick = picks.find((candidate) => candidate.pickId === pickId);
    return pick ? `R${pick.round} ${pick.season}` : pickId;
  });
  const allAssets = [...playerNames, ...pickNames];

  return allAssets.length > 0 ? allAssets.join(", ") : "Keine Assets";
}

function getTradeState(
  league: OnlineLeague,
  currentUser: OnlineUser | null,
): OnlineLeagueTradeState | null {
  if (!currentUser) {
    return null;
  }

  const currentLeagueUser = league.users.find((user) => user.userId === currentUser.userId);

  if (!currentLeagueUser) {
    return null;
  }

  const tradePartners = league.users.filter((user) => user.userId !== currentUser.userId);
  const items = (league.tradeProposals ?? [])
    .filter(
      (trade) =>
        trade.fromUserId === currentUser.userId || trade.toUserId === currentUser.userId,
    )
    .map((trade) => {
      const isOutgoing = trade.fromUserId === currentUser.userId;
      const partner = league.users.find((user) =>
        isOutgoing ? user.userId === trade.toUserId : user.userId === trade.fromUserId,
      );
      const fromUser = league.users.find((user) => user.userId === trade.fromUserId);
      const toUser = league.users.find((user) => user.userId === trade.toUserId);

      return {
        tradeId: trade.tradeId,
        direction: isOutgoing ? ("outgoing" as const) : ("incoming" as const),
        partnerTeamName: partner ? getTeamDisplayName(partner) : "Unbekanntes Team",
        status: trade.status,
        fairnessLabel: trade.fairnessLabel,
        fairnessScoreLabel: `${trade.fairnessScore}/100`,
        offeredLabel: getTradeAssetLabel(
          fromUser,
          trade.playersOffered,
          trade.picksOffered,
        ),
        requestedLabel: getTradeAssetLabel(
          toUser,
          trade.playersRequested,
          trade.picksRequested,
        ),
        canRespond: !isOutgoing && trade.status === "pending",
      };
    });

  return {
    items,
    hasTradePartner: tradePartners.length > 0,
    suggestedPartnerLabel: tradePartners[0] ? getTeamDisplayName(tradePartners[0]) : "Kein Team",
  };
}

function getDraftState(
  league: OnlineLeague,
  currentUser: OnlineUser | null,
): OnlineLeagueDraftState | null {
  if (!currentUser) {
    return null;
  }

  const leagueUser = league.users.find((user) => user.userId === currentUser.userId);

  if (!leagueUser) {
    return null;
  }

  const prospects = getOnlineLeagueProspectsForDisplay(league);
  const draftOrder = getOnlineLeagueDraftOrderForDisplay(league);
  const currentPick = draftOrder.picks.find((pick) => pick.status === "available");
  const currentPickUser = currentPick
    ? league.users.find((user) => user.userId === currentPick.userId)
    : null;
  const canDraftCurrentPick = currentPick?.userId === currentUser.userId;

  return {
    currentPickLabel: currentPick
      ? `Pick ${currentPick.pickNumber}: ${currentPickUser ? getTeamDisplayName(currentPickUser) : currentPick.teamId}`
      : "Draft abgeschlossen",
    canDraftCurrentPick,
    prospects: prospects.map((prospect) => ({
      prospectId: prospect.prospectId,
      playerName: prospect.playerName,
      position: prospect.position,
      scoutedRatingLabel: `${prospect.scoutedRating}`,
      potentialLabel: `${prospect.potential}`,
      accuracyLabel: `${prospect.scoutingAccuracy}%`,
      statusLabel: prospect.status === "available" ? "Verfügbar" : "Gedraftet",
      canScout: prospect.status === "available",
      canDraft: canDraftCurrentPick && prospect.status === "available",
    })),
    historyLabel:
      (league.draftHistory ?? []).length > 0
        ? `${league.draftHistory?.length ?? 0} Picks abgeschlossen`
        : "Noch kein Pick gemacht",
  };
}

function getCoachRoleLabel(role: CoachRole) {
  if (role === "head_coach") {
    return "Head Coach";
  }

  if (role === "offensive_coordinator") {
    return "Offensive Coordinator";
  }

  if (role === "defensive_coordinator") {
    return "Defensive Coordinator";
  }

  return "Development Coach";
}

function getCoachingState(
  league: OnlineLeague,
  currentUser: OnlineUser | null,
): OnlineLeagueCoachingState | null {
  const leagueUser = league.users.find((user) => user.userId === currentUser?.userId);
  const staff = leagueUser?.coachingStaffProfile;

  if (!leagueUser || !staff) {
    return null;
  }

  return {
    staff: [
      {
        role: "head_coach",
        label: getCoachRoleLabel("head_coach"),
        name: staff.headCoachName,
        offenseLabel: `${staff.offenseTraining}`,
        defenseLabel: `${staff.defenseTraining}`,
        developmentLabel: `${staff.playerDevelopment}`,
      },
      {
        role: "offensive_coordinator",
        label: getCoachRoleLabel("offensive_coordinator"),
        name: staff.offensiveCoordinatorName,
        offenseLabel: `${staff.offenseTraining}`,
        defenseLabel: `${Math.round(staff.defenseTraining * 0.55)}`,
        developmentLabel: `${Math.round((staff.playerDevelopment + staff.gamePreparation) / 2)}`,
      },
      {
        role: "defensive_coordinator",
        label: getCoachRoleLabel("defensive_coordinator"),
        name: staff.defensiveCoordinatorName,
        offenseLabel: `${Math.round(staff.offenseTraining * 0.55)}`,
        defenseLabel: `${staff.defenseTraining}`,
        developmentLabel: `${Math.round((staff.playerDevelopment + staff.discipline) / 2)}`,
      },
      {
        role: "development_coach",
        label: getCoachRoleLabel("development_coach"),
        name: staff.developmentCoachName,
        offenseLabel: `${Math.round(staff.offenseTraining * 0.7)}`,
        defenseLabel: `${Math.round(staff.defenseTraining * 0.7)}`,
        developmentLabel: `${staff.playerDevelopment}`,
      },
    ],
    available: getAvailableOnlineCoaches(league).map((coach) => ({
      coachId: coach.coachId,
      name: coach.name,
      roleLabel: getCoachRoleLabel(coach.role),
      offenseLabel: `${coach.ratings.offense}`,
      defenseLabel: `${coach.ratings.defense}`,
      developmentLabel: `${coach.ratings.development}`,
    })),
  };
}

function getRosterState(
  user: OnlineLeague["users"][number] | undefined,
): OnlineLeagueRosterState | null {
  if (!user?.contractRoster) {
    return null;
  }

  const playersById = new Map(user.contractRoster.map((player) => [player.playerId, player]));
  const depthChart = user.depthChart ?? [];
  const starterPlayers = depthChart
    .map((entry) => playersById.get(entry.starterPlayerId))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const starterAverage =
    starterPlayers.reduce((sum, player) => sum + player.overall, 0) /
    Math.max(1, starterPlayers.length);

  return {
    totalPlayersLabel: `${user.contractRoster.filter((player) => player.status === "active").length} aktive Spieler`,
    starterAverageLabel: `${Math.round(starterAverage)}/100 Starter-Schnitt`,
    depthChart: depthChart.slice(0, 8).map((entry) => {
      const starter = playersById.get(entry.starterPlayerId);
      const backups = entry.backupPlayerIds
        .map((playerId) => playersById.get(playerId)?.playerName)
        .filter((playerName): playerName is string => Boolean(playerName));

      return {
        position: entry.position,
        starterName: starter?.playerName ?? "Offen",
        backupLabel: backups.length > 0 ? backups.join(", ") : "Keine Backups",
      };
    }),
  };
}

function getStandings(league: OnlineLeague): OnlineLeagueStandingItem[] {
  const records = new Map<string, { teamName: string; wins: number; losses: number }>();

  league.users.forEach((user) => {
    records.set(user.teamId, {
      teamName: getTeamDisplayName(user),
      wins: 0,
      losses: 0,
    });
  });

  (league.matchResults ?? []).forEach((result) => {
    const home = records.get(result.homeTeamId);
    const away = records.get(result.awayTeamId);
    const homeWon = result.homeScore > result.awayScore;

    if (home) {
      records.set(result.homeTeamId, {
        ...home,
        wins: home.wins + (homeWon ? 1 : 0),
        losses: home.losses + (homeWon ? 0 : 1),
      });
    }

    if (away) {
      records.set(result.awayTeamId, {
        ...away,
        wins: away.wins + (homeWon ? 0 : 1),
        losses: away.losses + (homeWon ? 1 : 0),
      });
    }
  });

  return Array.from(records.values())
    .sort((left, right) => right.wins - left.wins || left.losses - right.losses)
    .map((record) => ({
      teamName: record.teamName,
      recordLabel: `${record.wins}-${record.losses}`,
    }));
}

function getRecentResults(league: OnlineLeague): OnlineLeagueResultItem[] {
  return (league.matchResults ?? []).slice(0, 5).map((result) => ({
    matchId: result.matchId,
    label: `${result.homeTeamName} ${result.homeScore} - ${result.awayScore} ${result.awayTeamName}`,
  }));
}

function getNextActionLabel(
  league: OnlineLeague,
  currentLeagueUser: OnlineLeague["users"][number] | undefined,
  allPlayersReady: boolean,
) {
  if (!currentLeagueUser) {
    return "Liga beitreten oder vom Admin ein Team zuweisen lassen.";
  }

  if (!currentLeagueUser.depthChart || currentLeagueUser.depthChart.length === 0) {
    return "Depth Chart prüfen, bevor du die Woche freigibst.";
  }

  if (!currentLeagueUser.readyForWeek) {
    return "Bereit für die aktuelle Woche setzen.";
  }

  if (allPlayersReady) {
    return "Alle Spieler sind bereit. Der Liga-Admin kann die Woche simulieren.";
  }

  return "Du bist bereit. Warte auf fehlende Spieler oder den Liga-Admin.";
}

function getPlayerReadyStatusLabel(
  currentLeagueUser: OnlineLeague["users"][number] | undefined,
  weekLabel: string,
) {
  if (!currentLeagueUser) {
    return "Du hast in dieser Liga noch kein Team.";
  }

  return currentLeagueUser.readyForWeek
    ? `Du bist bereit für ${weekLabel}.`
    : `Du bist noch nicht bereit für ${weekLabel}.`;
}

function getWaitingStatusLabel(
  currentLeagueUser: OnlineLeague["users"][number] | undefined,
  allPlayersReady: boolean,
) {
  if (allPlayersReady) {
    return "Alle Spieler sind bereit. Es wartet nur noch der Liga-Admin.";
  }

  if (currentLeagueUser?.readyForWeek) {
    return "Dein Ready-State ist gesetzt. Die Liga wartet noch auf fehlende Spieler oder den Admin.";
  }

  return "Prüfe Team und Training. Setze dich bereit, wenn deine Woche passt.";
}

function hasCurrentWeekTrainingPlan(
  user: OnlineLeague["users"][number] | undefined,
  league: OnlineLeague,
) {
  if (!user) {
    return false;
  }

  const currentSeason = user.jobSecurity?.lastUpdatedSeason ?? 1;

  return Boolean(
    user.weeklyTrainingPlans?.some(
      (plan) =>
        plan.season === currentSeason &&
        plan.week === league.currentWeek &&
        plan.source === "gm_submitted",
    ),
  );
}

function getFirstStepsState(
  league: OnlineLeague,
  currentLeagueUser: OnlineLeague["users"][number] | undefined,
): OnlineLeagueFirstStepsState {
  const teamReviewed =
    Boolean(currentLeagueUser?.teamId) && Boolean(currentLeagueUser?.contractRoster?.length);
  const trainingSet = hasCurrentWeekTrainingPlan(currentLeagueUser, league);
  const readyForWeek = currentLeagueUser?.readyForWeek ?? false;

  const items: OnlineLeagueFirstStepsItem[] = [
    {
      id: "team",
      label: "Team ansehen",
      description: "Prüfe Kader und Depth Chart, bevor du weitere Systeme anfasst.",
      completed: teamReviewed,
      statusLabel: teamReviewed ? "Erledigt" : "Offen",
    },
    {
      id: "training",
      label: "Training prüfen oder setzen",
      description: "Speichere einen Plan oder bestätige bewusst den Wochenfokus.",
      completed: trainingSet,
      statusLabel: trainingSet ? "Plan gespeichert" : "Noch kein GM-Plan",
    },
    {
      id: "ready",
      label: "Bereit für die Woche klicken",
      description: "Erst danach wartet die Liga auf Simulation oder andere GMs.",
      completed: readyForWeek,
      statusLabel: readyForWeek ? "Bereit" : "Noch nicht bereit",
    },
  ];
  const completedCount = items.filter((item) => item.completed).length;

  return {
    progressLabel: `${completedCount} von ${items.length} erledigt`,
    completedCount,
    totalCount: items.length,
    items,
  };
}

function getLeagueRulesState(league: OnlineLeague): OnlineLeagueRulesState {
  const activityRules = league.leagueSettings?.gmActivityRules;
  const baseItems = [
    "Der Admin schaltet Wochen weiter.",
    "Spieler setzen sich pro Woche auf bereit.",
    "Bei längerer Inaktivität kann der Admin ein Team vakant setzen.",
    "Regeln können je Liga variieren.",
  ];

  if (!activityRules) {
    return {
      sourceLabel: "Standardregeln",
      compactSummary: "Admin schaltet Wochen weiter, Spieler setzen sich pro Woche bereit.",
      items: baseItems,
      activityRuleLabel:
        "Keine konkreten Inaktivitätsfristen gespeichert. Es gelten die sicheren Standardhinweise dieser Liga.",
    };
  }

  const autoVacateLabel =
    activityRules.autoVacateAfterMissedWeeks === false
      ? "Automatisches Vakantsetzen ist nicht aktiv; Admin-Entscheidungen bleiben manuell."
      : `Automatisches Vakantsetzen ist ab ${activityRules.autoVacateAfterMissedWeeks} verpassten Week Actions konfiguriert.`;

  return {
    sourceLabel: "Gespeicherte Ligaregeln",
    compactSummary: `Warnung ab ${activityRules.warningAfterMissedWeeks}, inaktiv ab ${activityRules.inactiveAfterMissedWeeks}, Admin-Prüfung ab ${activityRules.removalEligibleAfterMissedWeeks} verpassten Week Actions.`,
    items: [
      ...baseItems,
      `Warnung ab ${activityRules.warningAfterMissedWeeks} verpasster Week Action.`,
      `Inaktivitätsstatus ab ${activityRules.inactiveAfterMissedWeeks} verpassten Week Actions.`,
      `Admin-Prüfung für Teamfreigabe ab ${activityRules.removalEligibleAfterMissedWeeks} verpassten Week Actions.`,
    ],
    activityRuleLabel: autoVacateLabel,
  };
}

export function toOnlineLeagueDetailState(
  league: OnlineLeague | null,
  currentUser: OnlineUser | null,
): OnlineLeagueDetailState {
  if (!league) {
    return {
      status: "missing",
      message: "Liga konnte nicht gefunden werden.",
    };
  }

  const readyState = getOnlineLeagueWeekReadyState(league);
  const readyCount = readyState.readyCount;
  const allPlayersReady = readyState.allReady;
  const currentLeagueUser = league.users.find(
    (user) => currentUser?.userId === user.userId,
  );

  return {
    status: "found",
    name: league.name,
    statusLabel: getStatusLabel(league.status),
    currentWeekLabel: `Week ${league.currentWeek}`,
    playerCountLabel: `${league.users.length}/${league.maxUsers}`,
    readyProgressLabel: `${readyCount}/${readyState.requiredCount} aktive Teams bereit`,
    allPlayersReady,
    allPlayersReadyLabel: allPlayersReady
      ? "Alle Spieler sind bereit. Der Admin kann die Woche simulieren."
      : null,
    ownTeamName: currentLeagueUser ? getTeamDisplayName(currentLeagueUser) : null,
    ownCoachName: currentLeagueUser?.username ?? null,
    ownerConfidenceLabel: currentLeagueUser?.ownershipProfile
      ? `${currentLeagueUser.ownershipProfile.ownerName} · Geduld ${currentLeagueUser.ownershipProfile.patience}/100`
      : "Kein Owner-Profil",
    ownerExpectationLabel: getOwnerExpectationLabel(currentLeagueUser),
    mediaExpectationLabel: getMediaExpectationLabel(currentLeagueUser),
    mediaExpectationNarrative:
      currentLeagueUser?.mediaExpectationProfile?.mediaNarrative ??
      "Setze ein Teamziel, bevor die Medien es für dich erledigen.",
    jobSecurityLabel: getJobSecurityLabel(currentLeagueUser),
    jobSecurityExplanation: getJobSecurityExplanation(currentLeagueUser),
    inactivityWarningLabel:
      currentLeagueUser?.activity && currentLeagueUser.activity.inactiveStatus !== "active"
        ? `Inaktivität: ${currentLeagueUser.activity.inactiveStatus}`
        : null,
    currentUserReady: currentLeagueUser?.readyForWeek ?? false,
    nextMatchLabel: "Nächste Partie wird nach Ligastart erstellt",
    waitingLabel: "Warte auf andere Spieler",
    nextActionLabel: getNextActionLabel(league, currentLeagueUser, allPlayersReady),
    firstSteps: getFirstStepsState(league, currentLeagueUser),
    leagueRules: getLeagueRulesState(league),
    weekFlow: {
      title: "Ligawoche",
      weekLabel: `Week ${league.currentWeek}`,
      phaseLabel: getWeekFlowPhaseLabel(league, allPlayersReady),
      statusLabel: getWeekFlowStatusLabel(allPlayersReady),
      simulationStatusLabel: getWeekFlowSimulationStatusLabel(league, allPlayersReady),
      playerReadyStatusLabel: getPlayerReadyStatusLabel(
        currentLeagueUser,
        `Week ${league.currentWeek}`,
      ),
      waitingStatusLabel: getWaitingStatusLabel(currentLeagueUser, allPlayersReady),
      adminProgressLabel:
        "Sobald alle Spieler bereit sind, kann der Admin die Woche simulieren.",
      nextMatchLabel: getWeekFlowNextMatchLabel(league),
      nextActionCtaLabel: getNextActionLabel(league, currentLeagueUser, allPlayersReady),
      completedResultsLabel: getCompletedResultsLabel(league),
      showStartWeekButton: allPlayersReady,
      startWeekButtonLabel: "Admin simuliert die Woche",
      startWeekHint:
        "Der Admin schaltet die Liga weiter. Danach beginnt die nächste Week mit zurückgesetztem Ready-State.",
      lastCompletedWeekLabel: getLastCompletedWeekLabel(league),
    },
    roster: getRosterState(currentLeagueUser),
    standings: getStandings(league),
    recentResults: getRecentResults(league),
    franchise: getFranchiseState(currentLeagueUser),
    training: getTrainingState(currentLeagueUser, league),
    contracts: getContractState(currentLeagueUser, league),
    trades: getTradeState(league, currentUser),
    draft: getDraftState(league, currentUser),
    coaching: getCoachingState(league, currentUser),
    players: league.users.map((user) => ({
      ...user,
      teamName: getTeamDisplayName(user),
      teamStatus: user.teamStatus ?? "occupied",
      readyLabel: user.readyForWeek ? "Ready" : "Nicht bereit",
      isCurrentUser: currentUser?.userId === user.userId,
    })),
    vacantTeams: league.users
      .filter((user) => user.teamStatus === "vacant" && user.allowNewUserJoin)
      .map((user) => ({
        teamId: user.teamId,
        teamName: getTeamDisplayName(user),
      })),
  };
}
