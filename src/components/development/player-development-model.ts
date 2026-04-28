import { buildPlayerRole } from "@/components/player/player-role-model";
import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export type DevelopmentBarTone = "default" | "positive" | "warning" | "danger" | "active";
export type DevelopmentTrendDirection = "rising" | "stagnating" | "falling";

export type PlayerDevelopmentFactor = {
  description: string;
  label: string;
  score: number;
  tone: DevelopmentBarTone;
  value: string;
};

export type DevelopmentHistoryEvent = {
  description: string | null;
  id?: string;
  occurredAt: Date;
  title: string;
  type: string;
  week: number | null;
};

export type PlayerDevelopmentWeekComparison = {
  cause: string;
  change: string;
  current: string;
  hasStoredHistory: boolean;
  lastWeek: string;
  sourceLabel: string;
  tone: DevelopmentBarTone;
};

export type PlayerDevelopmentCandidate = {
  age: number;
  captainFlag: boolean;
  depthChartSlot: number | null;
  decisionConnection: string;
  developmentFocus: boolean;
  factors: PlayerDevelopmentFactor[];
  feedback: string;
  fitPercent: number | null;
  focusReason: string;
  formLabel: string;
  freshnessPercent: number;
  fullName: string;
  id: string;
  injuryStatus: string;
  moralePercent: number;
  positionCode: string;
  positionName: string;
  positionOverall: number;
  potentialRating: number;
  progressPercent: number;
  roleLabel: string;
  roleSummary: string;
  rosterStatus: string;
  specialRole: string | null;
  status: string;
  trendDirection: DevelopmentTrendDirection;
  trendLabel: string;
  upside: number;
  weekComparison: PlayerDevelopmentWeekComparison;
};

export type PlayerDevelopmentState = {
  averageProgress: number;
  averageUpside: number;
  candidates: PlayerDevelopmentCandidate[];
  emptyMessage: string;
  focusedCount: number;
  highUpsideCount: number;
  managerControlled: boolean;
  riskCount: number;
  summary: string;
  trendPlayers: PlayerDevelopmentCandidate[];
};

const HIGH_UPSIDE_THRESHOLD = 8;
const FATIGUE_RISK_THRESHOLD = 75;
const DEVELOPMENT_WINDOW_AGE = 24;
const OVR_CHANGE_PATTERN = /OVR\s+(\d+)\s*->\s*(\d+)/i;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getDevelopmentProgressPercent(
  player: Pick<TeamPlayerSummary, "positionOverall" | "potentialRating">,
) {
  if (player.potentialRating <= 0) {
    return 0;
  }

  return clampPercent((player.positionOverall / player.potentialRating) * 100);
}

export function getFreshnessPercent(player: Pick<TeamPlayerSummary, "fatigue">) {
  return clampPercent(100 - player.fatigue);
}

export function getPlayerDevelopmentFormLabel(
  player: Pick<TeamPlayerSummary, "fatigue" | "injuryStatus" | "morale">,
) {
  if (player.injuryStatus !== "HEALTHY") {
    return "Injury Watch";
  }

  if (player.fatigue >= FATIGUE_RISK_THRESHOLD) {
    return "Heavy Load";
  }

  if (player.morale < 45) {
    return "Low Morale";
  }

  if (player.morale >= 70 && player.fatigue <= 45) {
    return "Ready";
  }

  return "Stable";
}

function getTrendLabel(input: {
  developmentFocus: boolean;
  progressPercent: number;
  trendDirection: DevelopmentTrendDirection;
  upside: number;
}) {
  if (input.trendDirection === "rising") {
    return "Steigend";
  }

  if (input.trendDirection === "falling") {
    return "Fallend";
  }

  if (input.developmentFocus) {
    return "Focus aktiv";
  }

  if (input.upside >= HIGH_UPSIDE_THRESHOLD) {
    return "High upside";
  }

  if (input.progressPercent >= 90) {
    return "Nahe Ceiling";
  }

  return "Stabil";
}

function getPlaytimeScore(player: TeamPlayerSummary) {
  if (player.rosterStatus === "STARTER" || player.depthChartSlot === 1) {
    return 90;
  }

  if (player.rosterStatus === "ROTATION" || player.depthChartSlot === 2) {
    return 62;
  }

  if (player.seasonLine.gamesPlayed >= 3) {
    return 48;
  }

  return 25;
}

function getAgeScore(player: TeamPlayerSummary) {
  if (player.age <= 22) {
    return 92;
  }

  if (player.age <= DEVELOPMENT_WINDOW_AGE) {
    return 78;
  }

  if (player.age <= 28) {
    return 48;
  }

  return 22;
}

function getPotentialScore(upside: number) {
  if (upside >= 10) {
    return 95;
  }

  if (upside >= HIGH_UPSIDE_THRESHOLD) {
    return 82;
  }

  if (upside >= 4) {
    return 58;
  }

  if (upside > 0) {
    return 34;
  }

  return 15;
}

function getLoadScore(player: TeamPlayerSummary) {
  return getFreshnessPercent(player);
}

function latestDevelopmentHistoryEvent(events: DevelopmentHistoryEvent[]) {
  return [...events]
    .filter((event) => event.type === "DEVELOPMENT")
    .sort((left, right) => {
      const leftWeek = left.week ?? -1;
      const rightWeek = right.week ?? -1;

      if (leftWeek !== rightWeek) {
        return rightWeek - leftWeek;
      }

      return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    })[0] ?? null;
}

function parseOverallChange(description: string | null) {
  const match = description?.match(OVR_CHANGE_PATTERN);

  if (!match) {
    return null;
  }

  const previous = Number(match[1]);
  const next = Number(match[2]);

  if (!Number.isFinite(previous) || !Number.isFinite(next)) {
    return null;
  }

  return {
    next,
    previous,
  };
}

function formatOverallDelta(delta: number) {
  if (delta > 0) {
    return `+${delta} OVR`;
  }

  if (delta < 0) {
    return `${delta} OVR`;
  }

  return "0 OVR";
}

function getFallbackCause(input: {
  developmentFocus: boolean;
  fatigue: number;
  injuryStatus: string;
  rosterStatus: string | null;
  depthChartSlot: number | null;
  seasonGamesPlayed: number;
}) {
  if (input.injuryStatus !== "HEALTHY" || input.fatigue >= FATIGUE_RISK_THRESHOLD) {
    return "Aktuelle Belastung bremst den Fortschritt; kein gespeicherter Wochenwert vorhanden.";
  }

  if (input.developmentFocus) {
    return "Development Focus ist aktiv; die letzte Wochenveraenderung ist noch nicht gespeichert.";
  }

  if (input.rosterStatus === "STARTER" || input.depthChartSlot === 1) {
    return "Starter-Rolle spricht fuer Spielzeit; konkrete Wochenveraenderung fehlt noch.";
  }

  if (input.seasonGamesPlayed > 0) {
    return "Saison-Snaps sind vorhanden; Vorwochen-OVR wurde nicht separat gespeichert.";
  }

  return "Nur der aktuelle Stand ist verfuegbar; keine falsche Vorwochenpraezision.";
}

function causeFromHistory(event: DevelopmentHistoryEvent, delta: number) {
  const description = event.description ?? "";

  if (description.includes("Development Focus")) {
    return "Development Focus und Wochen-XP aus gespeicherter History.";
  }

  const xpMatch = description.match(/XP\s+(\d+)/i);

  if (xpMatch) {
    return `Wochen-XP ${xpMatch[1]} aus gespeicherter History.`;
  }

  if (delta > 0) {
    return "Gespeicherte Wochenentwicklung hat OVR sichtbar erhoeht.";
  }

  return "Gespeicherte Wochenentwicklung ohne OVR-Sprung.";
}

export function buildDevelopmentWeekComparison(input: {
  currentOverall: number | null;
  depthChartSlot?: number | null;
  developmentFocus?: boolean | null;
  fatigue?: number | null;
  history?: DevelopmentHistoryEvent[];
  injuryStatus?: string | null;
  rosterStatus?: string | null;
  seasonGamesPlayed?: number | null;
}): PlayerDevelopmentWeekComparison {
  const currentOverall = input.currentOverall ?? null;
  const current = typeof currentOverall === "number" ? `OVR ${currentOverall}` : "OVR n/a";
  const latestEvent = latestDevelopmentHistoryEvent(input.history ?? []);
  const parsedChange = parseOverallChange(latestEvent?.description ?? null);

  if (latestEvent && parsedChange) {
    const delta = currentOverall === null
      ? parsedChange.next - parsedChange.previous
      : currentOverall - parsedChange.previous;

    return {
      cause: causeFromHistory(latestEvent, delta),
      change: formatOverallDelta(delta),
      current,
      hasStoredHistory: true,
      lastWeek: `Woche ${latestEvent.week ?? "?"}: OVR ${parsedChange.previous}`,
      sourceLabel: latestEvent.week ? `Woche ${latestEvent.week} gespeichert` : "Gespeicherter Verlauf",
      tone: delta > 0 ? "positive" : delta < 0 ? "danger" : "active",
    };
  }

  return {
    cause: getFallbackCause({
      depthChartSlot: input.depthChartSlot ?? null,
      developmentFocus: Boolean(input.developmentFocus),
      fatigue: input.fatigue ?? 0,
      injuryStatus: input.injuryStatus ?? "HEALTHY",
      rosterStatus: input.rosterStatus ?? null,
      seasonGamesPlayed: input.seasonGamesPlayed ?? 0,
    }),
    change: "nicht gespeichert",
    current,
    hasStoredHistory: false,
    lastWeek: "kein gespeicherter Vorwochenwert",
    sourceLabel: "Aktueller Stand",
    tone: "warning",
  };
}

function factorTone(score: number, inverted = false): DevelopmentBarTone {
  const value = inverted ? 100 - score : score;

  if (value >= 75) {
    return "positive";
  }

  if (value >= 45) {
    return "active";
  }

  if (value >= 25) {
    return "warning";
  }

  return "danger";
}

function getTrendDirection(player: TeamPlayerSummary, upside: number): DevelopmentTrendDirection {
  const playtimeScore = getPlaytimeScore(player);
  const loadScore = getLoadScore(player);
  const ageScore = getAgeScore(player);

  if (player.injuryStatus !== "HEALTHY" || player.fatigue >= FATIGUE_RISK_THRESHOLD) {
    return "falling";
  }

  if (upside <= 1 || ageScore <= 25) {
    return "stagnating";
  }

  if ((player.developmentFocus || playtimeScore >= 62) && loadScore >= 35) {
    return "rising";
  }

  if (playtimeScore <= 30) {
    return "stagnating";
  }

  return "stagnating";
}

function getDevelopmentFeedback(
  player: TeamPlayerSummary,
  trendDirection: DevelopmentTrendDirection,
  upside: number,
) {
  if (player.fatigue >= FATIGUE_RISK_THRESHOLD || player.injuryStatus !== "HEALTHY") {
    return "Ueberlastung bremst Entwicklung";
  }

  if (
    trendDirection === "rising" &&
    (player.rosterStatus === "STARTER" || player.depthChartSlot === 1)
  ) {
    return "Entwickelt sich gut durch Spielzeit";
  }

  if (trendDirection === "rising" && player.developmentFocus) {
    return "Fokus und kontrollierte Snaps treiben Entwicklung";
  }

  if (getPlaytimeScore(player) <= 30 && upside > 1) {
    return "Stagnation durch geringe Nutzung";
  }

  if (upside <= 1) {
    return "Nahe am Entwicklungslimit";
  }

  return "Entwicklung stabil, aber ohne klaren Schub";
}

function getDecisionConnection(player: TeamPlayerSummary) {
  if (player.fatigue >= FATIGUE_RISK_THRESHOLD) {
    return "Hohe Fatigue macht Starter-Snaps kurzfristig riskant.";
  }

  if (player.rosterStatus === "STARTER" || player.depthChartSlot === 1) {
    return "Starter-Rolle beschleunigt Entwicklung, erhoeht aber Belastung.";
  }

  if (player.rosterStatus === "BACKUP" || player.rosterStatus === "ROTATION") {
    return "Backup-Rolle schuetzt Belastung, verlangsamt aber Fortschritt.";
  }

  return "Depth-Chart-Entscheidung bestimmt, ob Entwicklung ueber Spielzeit oder Training kommt.";
}

function getDevelopmentFactors(
  player: TeamPlayerSummary,
  upside: number,
): PlayerDevelopmentFactor[] {
  const playtimeScore = getPlaytimeScore(player);
  const ageScore = getAgeScore(player);
  const potentialScore = getPotentialScore(upside);
  const loadScore = getLoadScore(player);

  return [
    {
      description:
        player.rosterStatus === "STARTER" || player.depthChartSlot === 1
          ? "Starter-Snaps geben den staerksten kurzfristigen Entwicklungsschub."
          : "Weniger Spielzeit verlangsamt die sichtbare Entwicklung.",
      label: "Spielzeit",
      score: playtimeScore,
      tone: factorTone(playtimeScore),
      value:
        player.rosterStatus === "STARTER" || player.depthChartSlot === 1
          ? "Starter"
          : player.rosterStatus === "ROTATION" || player.depthChartSlot === 2
            ? "Rotation"
            : "Backup",
    },
    {
      description:
        player.age <= DEVELOPMENT_WINDOW_AGE
          ? "Noch im starken Entwicklungsfenster."
          : "Entwicklung ist altersbedingt begrenzter.",
      label: "Alter",
      score: ageScore,
      tone: factorTone(ageScore),
      value: `${player.age} Jahre`,
    },
    {
      description:
        upside >= HIGH_UPSIDE_THRESHOLD
          ? "Grosse OVR/POT-Spanne macht langfristige Investition attraktiv."
          : "Potential bietet nur begrenzten zusaetzlichen Raum.",
      label: "Potential",
      score: potentialScore,
      tone: factorTone(potentialScore),
      value: `+${upside}`,
    },
    {
      description:
        player.fatigue >= FATIGUE_RISK_THRESHOLD
          ? "Belastung bremst Entwicklung und erhoeht Risiko."
          : "Belastung ist kontrollierbar.",
      label: "Belastung",
      score: loadScore,
      tone: factorTone(loadScore),
      value: `${player.fatigue} Fatigue`,
    },
  ];
}

function getFocusReason(player: TeamPlayerSummary, upside: number) {
  if (upside >= HIGH_UPSIDE_THRESHOLD) {
    return `+${upside} POT Gap`;
  }

  if (player.age <= 24 && upside > 0) {
    return "Young profile";
  }

  if (typeof player.schemeFitScore === "number" && player.schemeFitScore >= 70) {
    return `Fit ${player.schemeFitScore}`;
  }

  if (player.depthChartSlot) {
    return `${player.positionCode} Slot #${player.depthChartSlot}`;
  }

  return player.rosterStatus.replaceAll("_", " ");
}

function toCandidate(player: TeamPlayerSummary): PlayerDevelopmentCandidate {
  const progressPercent = getDevelopmentProgressPercent(player);
  const upside = Math.max(0, player.potentialRating - player.positionOverall);
  const trendDirection = getTrendDirection(player, upside);
  const role = buildPlayerRole({
    age: player.age,
    archetypeName: player.archetypeName,
    depthChartSlot: player.depthChartSlot,
    developmentFocus: player.developmentFocus,
    positionCode: player.positionCode,
    positionOverall: player.positionOverall,
    potentialRating: player.potentialRating,
    rosterStatus: player.rosterStatus,
    schemeFitName: player.schemeFitName,
    schemeFitScore: player.schemeFitScore,
    secondaryPositionCode: player.secondaryPositionCode,
  });

  return {
    age: player.age,
    captainFlag: player.captainFlag,
    depthChartSlot: player.depthChartSlot,
    decisionConnection: getDecisionConnection(player),
    developmentFocus: player.developmentFocus,
    factors: getDevelopmentFactors(player, upside),
    feedback: getDevelopmentFeedback(player, trendDirection, upside),
    fitPercent:
      typeof player.schemeFitScore === "number" ? clampPercent(player.schemeFitScore) : null,
    focusReason: getFocusReason(player, upside),
    formLabel: getPlayerDevelopmentFormLabel(player),
    freshnessPercent: getFreshnessPercent(player),
    fullName: player.fullName,
    id: player.id,
    injuryStatus: player.injuryStatus,
    moralePercent: clampPercent(player.morale),
    positionCode: player.positionCode,
    positionName: player.positionName,
    positionOverall: player.positionOverall,
    potentialRating: player.potentialRating,
    progressPercent,
    roleLabel: role.label,
    roleSummary: role.summary,
    rosterStatus: player.rosterStatus,
    specialRole: player.secondaryPositionCode === "KR" || player.secondaryPositionCode === "PR"
      ? player.secondaryPositionCode
      : null,
    status: player.status,
    trendDirection,
    trendLabel: getTrendLabel({
      developmentFocus: player.developmentFocus,
      progressPercent,
      trendDirection,
      upside,
    }),
    upside,
    weekComparison: buildDevelopmentWeekComparison({
      currentOverall: player.positionOverall,
      depthChartSlot: player.depthChartSlot,
      developmentFocus: player.developmentFocus,
      fatigue: player.fatigue,
      history: player.developmentHistory,
      injuryStatus: player.injuryStatus,
      rosterStatus: player.rosterStatus,
      seasonGamesPlayed: player.seasonLine.gamesPlayed,
    }),
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sortCandidates(left: PlayerDevelopmentCandidate, right: PlayerDevelopmentCandidate) {
  if (Number(right.developmentFocus) !== Number(left.developmentFocus)) {
    return Number(right.developmentFocus) - Number(left.developmentFocus);
  }

  if (right.upside !== left.upside) {
    return right.upside - left.upside;
  }

  if (left.age !== right.age) {
    return left.age - right.age;
  }

  return right.positionOverall - left.positionOverall;
}

export function buildPlayerDevelopmentState(team: TeamDetail | null): PlayerDevelopmentState {
  const emptyMessage =
    "Development erscheint, sobald aktive Spieler im Team vorhanden sind.";

  if (!team) {
    return {
      averageProgress: 0,
      averageUpside: 0,
      candidates: [],
      emptyMessage,
      focusedCount: 0,
      highUpsideCount: 0,
      managerControlled: false,
      riskCount: 0,
      summary: "Kein Teamkontext vorhanden.",
      trendPlayers: [],
    };
  }

  const activePlayers = team.players.filter((player) => player.status === "ACTIVE");
  const candidates = activePlayers.map(toCandidate).sort(sortCandidates);
  const focusedCount = candidates.filter((player) => player.developmentFocus).length;
  const highUpsideCount = candidates.filter(
    (player) => player.upside >= HIGH_UPSIDE_THRESHOLD,
  ).length;
  const riskCount = candidates.filter(
    (player) =>
      player.injuryStatus !== "HEALTHY" ||
      player.freshnessPercent <= 100 - FATIGUE_RISK_THRESHOLD,
  ).length;
  const averageProgress = average(candidates.map((player) => player.progressPercent));
  const averageUpside = average(candidates.map((player) => player.upside));
  const trendPlayers = candidates
    .filter((player) => player.developmentFocus || player.upside > 0)
    .slice(0, 8);

  return {
    averageProgress,
    averageUpside,
    candidates: candidates.slice(0, 12),
    emptyMessage,
    focusedCount,
    highUpsideCount,
    managerControlled: team.managerControlled,
    riskCount,
    summary:
      candidates.length > 0
        ? `${focusedCount} Fokus-Spieler, ${highUpsideCount} High-Upside Profile, ${riskCount} Risiko-Signale.`
        : "Keine aktiven Spieler fuer Development vorhanden.",
    trendPlayers,
  };
}
