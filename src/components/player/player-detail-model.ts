import type {
  PlayerAttributeGroup,
  PlayerDetail,
} from "@/modules/players/domain/player.types";
import type { PlayerCompositeRatings } from "@/modules/players/domain/player-rating";

export type CompositeRatingEntry = {
  key: keyof PlayerCompositeRatings;
  label: string;
};

export type PlayerProfileMetric = {
  description: string;
  label: string;
  value: string;
};

export type PlayerDecisionEvaluationTone = "positive" | "accent" | "neutral";

export type PlayerDecisionEvaluation = {
  description: string;
  label: string;
  reasons: string[];
  tone: PlayerDecisionEvaluationTone;
};

export type PlayerDecisionRiskTone = "warning" | "danger" | "neutral";

export type PlayerDecisionRisk = {
  description: string;
  label: string;
  tone: PlayerDecisionRiskTone;
};

export type PlayerDecisionComparison = {
  description: string;
  label: string;
  tone: "positive" | "accent" | "warning" | "neutral";
};

export type PlayerDecisionTradeoff = {
  description: string;
  label: string;
  tone: "positive" | "accent" | "warning" | "neutral";
};

export type PlayerDecisionLayer = {
  action: "start" | "bench" | "develop";
  comparison: PlayerDecisionComparison;
  description: string;
  label: "Sollte Starter sein" | "Grenzfall Starter/Backup" | "Nur Tiefe" | "Entwickeln";
  primarySignal: string;
  risks: PlayerDecisionRisk[];
  tradeoffs: PlayerDecisionTradeoff[];
  tone: "positive" | "accent" | "warning" | "neutral";
};

export type PlayerDecisionPeer = {
  age?: number;
  depthChartSlot: number | null;
  fullName: string;
  id: string;
  positionCode: string;
  positionOverall: number;
  potentialRating?: number;
  rosterStatus: string;
};

export const COMPOSITE_RATING_LABELS: CompositeRatingEntry[] = [
  { key: "passing", label: "Passing" },
  { key: "pocket", label: "Pocket" },
  { key: "mobility", label: "Mobility" },
  { key: "command", label: "Command" },
  { key: "ballCarrier", label: "Ball Carrier" },
  { key: "protection", label: "Protection" },
  { key: "hands", label: "Hands" },
  { key: "receiving", label: "Receiving" },
  { key: "passBlocking", label: "Pass Blocking" },
  { key: "runBlocking", label: "Run Blocking" },
  { key: "passRush", label: "Pass Rush" },
  { key: "runDefense", label: "Run Defense" },
  { key: "linebackerCoverage", label: "LB Coverage" },
  { key: "coverage", label: "Coverage" },
  { key: "ballHawk", label: "Ball Hawk" },
  { key: "offensiveLineChemistry", label: "OL Chemistry" },
  { key: "qbReceiverChemistry", label: "QB-WR Chemistry" },
  { key: "defensiveBackChemistry", label: "DB Chemistry" },
  { key: "protectionUnit", label: "Protection Unit" },
  { key: "passRushUnit", label: "Pass Rush Unit" },
  { key: "pressCoverageUnit", label: "Press Coverage" },
  { key: "runLaneCreation", label: "Run Lane Creation" },
  { key: "boxDefense", label: "Box Defense" },
  { key: "returnGame", label: "Return" },
  { key: "kicking", label: "Kicking" },
  { key: "punting", label: "Punting" },
  { key: "snapping", label: "Snapping" },
  { key: "specialistConsistency", label: "Consistency" },
];

export function getPlayerPositionLabel(player: Pick<PlayerDetail, "roster">) {
  if (!player.roster) {
    return "Keine Position";
  }

  return `${player.roster.primaryPositionCode}${
    player.roster.secondaryPositionCode ? ` / ${player.roster.secondaryPositionCode}` : ""
  }`;
}

export function getPlayerTeamLabel(player: Pick<PlayerDetail, "team">) {
  return player.team?.abbreviation ?? "Free Agent";
}

export function getPlayerStatusLabel(
  player: Pick<PlayerDetail, "status" | "injuryStatus" | "injuryName">,
) {
  if (player.injuryStatus !== "HEALTHY") {
    return `${player.status} · ${player.injuryStatus}`;
  }

  return player.status;
}

export function getPlayerDecisionEvaluation(
  player: Pick<PlayerDetail, "age" | "evaluation" | "roster" | "schemeFitScore">,
): PlayerDecisionEvaluation {
  const overall = player.evaluation?.positionOverall ?? null;
  const potential = player.evaluation?.potentialRating ?? overall;
  const upside =
    typeof overall === "number" && typeof potential === "number" ? potential - overall : 0;
  const rosterStatus = player.roster?.rosterStatus ?? "NO_TEAM";
  const depthChartSlot = player.roster?.depthChartSlot ?? null;
  const isStarter = rosterStatus === "STARTER" || depthChartSlot === 1;
  const isBackup =
    rosterStatus === "BACKUP" ||
    rosterStatus === "ROTATION" ||
    (typeof depthChartSlot === "number" && depthChartSlot > 1);
  const hasStrongStarterRating =
    (typeof overall === "number" && overall >= 76) ||
    (typeof player.schemeFitScore === "number" && player.schemeFitScore >= 72);
  const isDevelopmentPlayer = player.age <= 24 && upside >= 6;
  const slotReason = depthChartSlot ? `Depth #${depthChartSlot}` : "ohne aktiven Slot";
  const ratingReason =
    typeof overall === "number" && typeof potential === "number"
      ? `OVR ${overall} / POT ${potential}`
      : "Ratings offen";

  if (isStarter && hasStrongStarterRating) {
    return {
      description: "Traegt eine Starter-Rolle und hat genug Rating/Fit fuer klare Spielanteile.",
      label: "Starker Starter",
      reasons: [slotReason, ratingReason, rosterStatus],
      tone: "positive",
    };
  }

  if (isDevelopmentPlayer) {
    return {
      description: "Noch nicht am Limit, aber mit sichtbarer Entwicklungsspanne.",
      label: "Entwicklungsspieler",
      reasons: [ratingReason, `+${upside} Potential`, `${player.age} Jahre`],
      tone: "accent",
    };
  }

  if (isBackup) {
    return {
      description: "Sinnvoll als Rotation, Backup oder Absicherung hinter dem Starter.",
      label: "Solider Backup",
      reasons: [slotReason, ratingReason, rosterStatus],
      tone: "neutral",
    };
  }

  return {
    description: "Noch kein klarer Entscheidungsanker; Rolle und Fit sollten im Roster geprueft werden.",
    label: "Roster-Tiefe",
    reasons: [slotReason, ratingReason, rosterStatus],
    tone: "neutral",
  };
}

function currentOverall(player: Pick<PlayerDetail, "evaluation">) {
  return player.evaluation?.positionOverall ?? null;
}

function currentPotential(player: Pick<PlayerDetail, "evaluation">) {
  return player.evaluation?.potentialRating ?? currentOverall(player);
}

function getSlotLabel(depthChartSlot: number | null | undefined) {
  return depthChartSlot ? `Slot #${depthChartSlot}` : "ohne aktiven Slot";
}

function getStarterComparison(
  player: Pick<PlayerDetail, "id" | "evaluation" | "roster">,
  positionPeers: PlayerDecisionPeer[],
): PlayerDecisionComparison {
  const positionCode = player.roster?.primaryPositionCode ?? null;
  const depthChartSlot = player.roster?.depthChartSlot ?? null;
  const overall = currentOverall(player);

  if (!positionCode || typeof overall !== "number") {
    return {
      description: "Position oder OVR fehlt fuer einen belastbaren Slot-Vergleich.",
      label: "Kein Vergleich",
      tone: "neutral",
    };
  }

  if (depthChartSlot === 1) {
    return {
      description: "Dieser Spieler ist aktuell der Slot-#1-Spieler auf seiner Position.",
      label: "Aktueller Slot #1",
      tone: "positive",
    };
  }

  const starter = positionPeers.find(
    (peer) =>
      peer.id !== player.id &&
      peer.positionCode === positionCode &&
      peer.depthChartSlot === 1,
  );

  if (!starter) {
    return {
      description: "Kein anderer Slot-#1-Spieler fuer diese Position im aktuellen Teamkontext.",
      label: "Slot #1 offen",
      tone: "accent",
    };
  }

  const diff = overall - starter.positionOverall;

  if (diff >= 2) {
    return {
      description: `${diff} OVR ueber ${starter.fullName}. Depth Chart pruefen.`,
      label: "Besser als aktueller Starter",
      tone: "positive",
    };
  }

  if (diff <= -4) {
    return {
      description: `${Math.abs(diff)} OVR hinter ${starter.fullName}. Als Starter riskant.`,
      label: "Schlechter als Slot #1",
      tone: "warning",
    };
  }

  return {
    description: `${Math.abs(diff)} OVR Unterschied zu ${starter.fullName}. Entscheidung haengt an Fit und Risiko.`,
    label: "Nah am Slot #1",
    tone: "accent",
  };
}

function getDecisionRisks(
  player: Pick<
    PlayerDetail,
    "age" | "evaluation" | "fatigue" | "injuryStatus" | "roster" | "schemeFitScore"
  >,
): PlayerDecisionRisk[] {
  const risks: PlayerDecisionRisk[] = [];
  const overall = currentOverall(player);
  const potential = currentPotential(player);

  if (typeof player.schemeFitScore === "number" && player.schemeFitScore < 45) {
    risks.push({
      description: `Fit ${player.schemeFitScore}/100 passt nur schwach zum aktuellen Teamkontext.`,
      label: "Schwacher Scheme Fit",
      tone: "warning",
    });
  }

  if (player.fatigue >= 70) {
    risks.push({
      description: `Fatigue ${player.fatigue} kann Leistung und Verfuegbarkeit druecken.`,
      label: "Hohe Fatigue",
      tone: "danger",
    });
  } else if (player.fatigue >= 58) {
    risks.push({
      description: `Fatigue ${player.fatigue} ist noch spielbar, aber beobachtbar.`,
      label: "Fatigue beobachten",
      tone: "warning",
    });
  }

  if (player.injuryStatus !== "HEALTHY") {
    risks.push({
      description: `Aktueller Injury Status: ${player.injuryStatus}.`,
      label: "Verletzungsrisiko",
      tone: "danger",
    });
  }

  if (typeof overall === "number" && typeof potential === "number" && potential - overall <= 1) {
    risks.push({
      description: `POT ${potential} liegt kaum ueber OVR ${overall}.`,
      label: "Niedriges Potential",
      tone: "neutral",
    });
  }

  if (!player.roster?.depthChartSlot && player.roster?.rosterStatus !== "PRACTICE_SQUAD") {
    risks.push({
      description: "Kein aktiver Depth-Chart-Slot gesetzt.",
      label: "Ohne Slot",
      tone: "warning",
    });
  }

  return risks;
}

function findDevelopmentBlockedPeer(
  player: Pick<PlayerDetail, "age" | "evaluation" | "id" | "roster">,
  positionPeers: PlayerDecisionPeer[],
) {
  const positionCode = player.roster?.primaryPositionCode ?? null;
  const playerPotential = currentPotential(player) ?? 0;

  if (!positionCode) {
    return null;
  }

  return (
    positionPeers
      .filter((peer) => peer.id !== player.id && peer.positionCode === positionCode)
      .filter((peer) => (peer.age ?? 99) <= 24)
      .filter((peer) => (peer.potentialRating ?? peer.positionOverall) >= playerPotential)
      .sort((left, right) => {
        const potentialDiff =
          (right.potentialRating ?? right.positionOverall) -
          (left.potentialRating ?? left.positionOverall);

        if (potentialDiff !== 0) {
          return potentialDiff;
        }

        return right.positionOverall - left.positionOverall;
      })[0] ?? null
  );
}

function buildDecisionTradeoffs(
  player: Pick<
    PlayerDetail,
    | "age"
    | "evaluation"
    | "fatigue"
    | "id"
    | "injuryStatus"
    | "roster"
    | "schemeFitScore"
  >,
  positionPeers: PlayerDecisionPeer[],
  comparison: PlayerDecisionComparison,
  risks: PlayerDecisionRisk[],
): PlayerDecisionTradeoff[] {
  const tradeoffs: PlayerDecisionTradeoff[] = [];
  const overall = currentOverall(player);
  const potential = currentPotential(player);
  const upside =
    typeof overall === "number" && typeof potential === "number" ? potential - overall : 0;
  const blockedPeer = findDevelopmentBlockedPeer(player, positionPeers);
  const hasDangerRisk = risks.some((risk) => risk.tone === "danger");
  const hasFitRisk = risks.some((risk) => risk.label === "Schwacher Scheme Fit");
  const isStarter = player.roster?.depthChartSlot === 1 || player.roster?.rosterStatus === "STARTER";

  if (isStarter && typeof overall === "number" && overall >= 76 && player.fatigue >= 58) {
    tradeoffs.push({
      description: `OVR ${overall} hilft jetzt, aber Fatigue ${player.fatigue} erhoeht das Game-Day-Risiko.`,
      label: "Starker Starter, aber hohe Fatigue",
      tone: hasDangerRisk ? "warning" : "accent",
    });
  }

  if (upside >= 6 && typeof overall === "number" && comparison.label === "Schlechter als Slot #1") {
    tradeoffs.push({
      description: `+${upside} Potential, aber aktuell ${comparison.description}`,
      label: "Mehr Potential, weniger aktuelle Leistung",
      tone: "accent",
    });
  }

  if (typeof overall === "number" && overall >= 76 && upside <= 1) {
    tradeoffs.push({
      description: "Kurzfristig verlaesslich, langfristig kaum Rating-Wachstum zu erwarten.",
      label: "Jetzt stark, spaeter begrenzt",
      tone: "neutral",
    });
  }

  if (blockedPeer && isStarter) {
    tradeoffs.push({
      description: `${blockedPeer.fullName} hat POT ${blockedPeer.potentialRating ?? blockedPeer.positionOverall} und verliert Starter-Snaps.`,
      label: `Blockiert Entwicklung von ${blockedPeer.fullName}`,
      tone: "warning",
    });
  } else if (comparison.label === "Nah am Slot #1" || comparison.label === "Schlechter als Slot #1") {
    tradeoffs.push({
      description: comparison.description,
      label: "Alternative Option vorhanden",
      tone: comparison.tone === "warning" ? "warning" : "accent",
    });
  }

  if (hasFitRisk && typeof overall === "number" && overall >= 70) {
    tradeoffs.push({
      description: "Rating spricht fuer Spielzeit, der Scheme Fit spricht gegen automatische Starter-Snaps.",
      label: "Gutes Rating, schwacher Fit",
      tone: "warning",
    });
  }

  if (upside >= 8 && risks.length > 0) {
    tradeoffs.push({
      description: `Hohe Upside trifft auf ${risks[0]?.label.toLowerCase() ?? "Risiko"}. Entwicklungsplan statt Autostart pruefen.`,
      label: "Riskant, aber hohe Upside",
      tone: "accent",
    });
  }

  if (tradeoffs.length === 0) {
    tradeoffs.push({
      description: "Keine harte Zielkonflikt-Spannung sichtbar; Entscheidung kann primaer ueber Rolle und Slot fallen.",
      label: "Wenig Trade-off",
      tone: "neutral",
    });
  }

  return tradeoffs.slice(0, 4);
}

export function getPlayerDecisionLayer(
  player: Pick<
    PlayerDetail,
    | "age"
    | "evaluation"
    | "fatigue"
    | "id"
    | "injuryStatus"
    | "roster"
    | "schemeFitScore"
  >,
  positionPeers: PlayerDecisionPeer[] = [],
): PlayerDecisionLayer {
  const overall = currentOverall(player);
  const potential = currentPotential(player);
  const upside =
    typeof overall === "number" && typeof potential === "number" ? potential - overall : 0;
  const depthChartSlot = player.roster?.depthChartSlot ?? null;
  const rosterStatus = player.roster?.rosterStatus ?? "NO_TEAM";
  const comparison = getStarterComparison(player, positionPeers);
  const risks = getDecisionRisks(player);
  const tradeoffs = buildDecisionTradeoffs(player, positionPeers, comparison, risks);
  const blockingRiskCount = risks.filter((risk) => risk.tone === "danger").length;
  const schemeFitOk =
    typeof player.schemeFitScore !== "number" || player.schemeFitScore >= 55;
  const starterReady =
    (depthChartSlot === 1 || comparison.tone === "positive") &&
    typeof overall === "number" &&
    overall >= 74 &&
    schemeFitOk &&
    blockingRiskCount === 0;
  const developmentReady = player.age <= 24 && upside >= 6 && !starterReady;

  if (starterReady) {
    return {
      action: "start",
      comparison,
      description: "Starten ist die klare Entscheidung, solange Fatigue und Fit stabil bleiben.",
      label: "Sollte Starter sein",
      primarySignal: `${getSlotLabel(depthChartSlot)} · OVR ${overall}`,
      risks,
      tradeoffs,
      tone: risks.length > 0 ? "accent" : "positive",
    };
  }

  if (developmentReady) {
    return {
      action: "develop",
      comparison,
      description: "Nicht zwingend starten, aber Training und kontrollierte Snaps priorisieren.",
      label: "Entwickeln",
      primarySignal: `+${upside} POT Gap · ${player.age} Jahre`,
      risks,
      tradeoffs,
      tone: "accent",
    };
  }

  if (
    rosterStatus === "STARTER" ||
    depthChartSlot === 1 ||
    comparison.label === "Nah am Slot #1" ||
    (typeof overall === "number" && overall >= 70)
  ) {
    return {
      action: "bench",
      comparison,
      description: "Kann starten, ist aber kein automatischer Slot-#1. Vergleich und Risiko pruefen.",
      label: "Grenzfall Starter/Backup",
      primarySignal: `${getSlotLabel(depthChartSlot)} · OVR ${overall ?? "n/a"}`,
      risks,
      tradeoffs,
      tone: risks.some((risk) => risk.tone === "danger") ? "warning" : "accent",
    };
  }

  return {
    action: "bench",
    comparison,
    description: "Aktuell eher Absicherung als Kernentscheidung. Nicht priorisiert starten.",
    label: "Nur Tiefe",
    primarySignal: `${getSlotLabel(depthChartSlot)} · OVR ${overall ?? "n/a"}`,
    risks,
    tradeoffs,
    tone: "neutral",
  };
}

export function getContractSummaryState(contract: PlayerDetail["currentContract"]) {
  if (!contract) {
    return {
      hasContract: false,
      title: "Kein aktiver Vertrag",
      primary: "Free Agent oder nicht unter Vertrag",
      secondary: "Keine Cap-Bindung aus einem aktiven Vertrag.",
    };
  }

  return {
    hasContract: true,
    title: `${contract.years} Jahre`,
    primary: `${contract.capHit} Cap Hit`,
    secondary: `${contract.yearlySalary} Gehalt · ${contract.signingBonus} Signing Bonus`,
  };
}

export function getAttributeGroupState(groups: PlayerAttributeGroup[]) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      attributes: [...group.attributes].sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .filter((group) => group.attributes.length > 0);

  return {
    isEmpty: visibleGroups.length === 0,
    message:
      visibleGroups.length === 0
        ? "Keine Attribute fuer diesen Spieler vorhanden."
        : `${visibleGroups.length} Attributgruppen vorhanden.`,
    visibleGroups,
  };
}

export function getTimelineState(history: PlayerDetail["history"]) {
  const events = [...history].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );

  return {
    events,
    isEmpty: events.length === 0,
    message:
      events.length === 0
        ? "Noch keine Ereignisse in der Spielerhistorie."
        : `${events.length} Ereignisse vorhanden.`,
  };
}

export function getCompositeRatingItems(compositeRatings: PlayerCompositeRatings) {
  return COMPOSITE_RATING_LABELS.map((entry) => ({
    label: entry.label,
    value: compositeRatings[entry.key],
  }));
}

export function getCoreRatingItems(evaluation: PlayerDetail["evaluation"]) {
  if (!evaluation) {
    return [];
  }

  return [
    { label: "OVR", value: evaluation.positionOverall },
    { label: "POT", value: evaluation.potentialRating },
    { label: "PHY", value: evaluation.physicalOverall ?? "n/a" },
    { label: "MENT", value: evaluation.mentalOverall ?? "n/a" },
    { label: "OFF", value: evaluation.offensiveOverall ?? "n/a" },
    { label: "DEF", value: evaluation.defensiveOverall ?? "n/a" },
    { label: "ST", value: evaluation.specialTeamsOverall ?? "n/a" },
  ];
}

function totalTouchdowns(
  stats: NonNullable<PlayerDetail["latestSeason"]> | NonNullable<PlayerDetail["career"]>,
) {
  return (
    stats.passing.touchdowns +
    stats.rushing.touchdowns +
    stats.receiving.touchdowns +
    stats.returns.kickReturnTouchdowns +
    stats.returns.puntReturnTouchdowns
  );
}

function formatCompletionLine(
  stats: NonNullable<PlayerDetail["latestSeason"]> | NonNullable<PlayerDetail["career"]>,
) {
  return `${stats.passing.completions}/${stats.passing.attempts}`;
}

export function getPerformanceSnapshotItems(player: Pick<
  PlayerDetail,
  "career" | "latestSeason" | "roster"
>): PlayerProfileMetric[] {
  const stats = player.latestSeason ?? player.career;
  const source = player.latestSeason ? player.latestSeason.label : "Karriere";

  if (!stats) {
    return [
      {
        description: "Noch keine Performance-Daten gespeichert.",
        label: "Games",
        value: "0",
      },
    ];
  }

  const positionCode = player.roster?.primaryPositionCode ?? "";
  const common = [
    {
      description: `${source} · Starts`,
      label: "GP / GS",
      value: `${stats.gamesPlayed} / ${stats.gamesStarted}`,
    },
    {
      description: "Offense / Defense / Special Teams",
      label: "Snaps",
      value: `${stats.snapsOffense}/${stats.snapsDefense}/${stats.snapsSpecialTeams}`,
    },
  ];

  if (positionCode === "QB") {
    return [
      ...common,
      {
        description: "Completions / Attempts",
        label: "Comp",
        value: formatCompletionLine(stats),
      },
      {
        description: "Passing Yards",
        label: "Pass YDS",
        value: String(stats.passing.yards),
      },
      {
        description: "Touchdowns / Interceptions",
        label: "TD / INT",
        value: `${stats.passing.touchdowns} / ${stats.passing.interceptions}`,
      },
    ];
  }

  if (["LT", "LG", "C", "RG", "RT"].includes(positionCode)) {
    return [
      ...common,
      {
        description: "Pass Block / Run Block Snaps",
        label: "Block Snaps",
        value: `${stats.blocking.passBlockSnaps} / ${stats.blocking.runBlockSnaps}`,
      },
      {
        description: "Sacks / Pressures Allowed",
        label: "Allowed",
        value: `${stats.blocking.sacksAllowed} / ${stats.blocking.pressuresAllowed}`,
      },
      {
        description: "Impact Blocks",
        label: "Pancakes",
        value: String(stats.blocking.pancakes),
      },
    ];
  }

  if (
    ["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"].includes(positionCode)
  ) {
    return [
      ...common,
      {
        description: "Total Tackles",
        label: "Tackles",
        value: String(stats.defensive.tackles),
      },
      {
        description: "Sacks / Interceptions",
        label: "Sack / INT",
        value: `${stats.defensive.sacks} / ${stats.defensive.interceptions}`,
      },
      {
        description: "Passes Defended",
        label: "PD",
        value: String(stats.defensive.passesDefended),
      },
    ];
  }

  if (["K", "P", "LS"].includes(positionCode)) {
    return [
      ...common,
      {
        description: "Field Goals",
        label: "FG",
        value: `${stats.kicking.fieldGoalsMade}/${stats.kicking.fieldGoalsAttempted}`,
      },
      {
        description: "Punts / Inside 20",
        label: "Punts",
        value: `${stats.punting.punts}/${stats.punting.puntsInside20}`,
      },
      {
        description: "Return Touchdowns",
        label: "Ret TD",
        value: String(stats.returns.kickReturnTouchdowns + stats.returns.puntReturnTouchdowns),
      },
    ];
  }

  return [
    ...common,
    {
      description: "Rushing / Receiving Yards",
      label: "Yards",
      value: `${stats.rushing.yards} / ${stats.receiving.yards}`,
    },
    {
      description: "Receptions / Targets",
      label: "Rec",
      value: `${stats.receiving.receptions} / ${stats.receiving.targets}`,
    },
    {
      description: "All-purpose Touchdowns",
      label: "TD",
      value: String(totalTouchdowns(stats)),
    },
  ];
}
