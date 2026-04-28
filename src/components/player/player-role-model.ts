export type PlayerRoleCategory =
  | "starter-fit"
  | "development-upside"
  | "depth"
  | "specialist";

export type PlayerRoleTone = "positive" | "accent" | "neutral" | "special";

export type PlayerRoleView = {
  category: PlayerRoleCategory;
  description: string;
  label: string;
  summary: string;
  reasons: string[];
  tone: PlayerRoleTone;
};

export type PlayerRoleInput = {
  age?: number | null;
  archetypeName?: string | null;
  depthChartSlot?: number | null;
  developmentFocus?: boolean | null;
  positionCode?: string | null;
  positionOverall?: number | null;
  potentialRating?: number | null;
  rosterStatus?: string | null;
  schemeFitName?: string | null;
  schemeFitScore?: number | null;
  secondaryPositionCode?: string | null;
};

export const PLAYER_ROLE_FILTERS: Array<{ value: PlayerRoleCategory; label: string }> = [
  { value: "starter-fit", label: "Starter Fit" },
  { value: "development-upside", label: "Development Upside" },
  { value: "depth", label: "Depth" },
  { value: "specialist", label: "Specialist" },
];

const SPECIALIST_POSITIONS = new Set(["K", "P", "LS"]);
const SPECIALIST_SECONDARY_POSITIONS = new Set(["KR", "PR"]);
const ROSTER_STATUS_LABELS: Record<string, string> = {
  BACKUP: "Backup",
  INACTIVE: "Inaktiv",
  INJURED_RESERVE: "Injured Reserve",
  PRACTICE_SQUAD: "Practice Squad",
  ROTATION: "Rotation",
  STARTER: "Starter",
};

function formatRosterStatus(status: string) {
  return ROSTER_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function hasStrongFit(schemeFitScore: number | null | undefined) {
  return typeof schemeFitScore === "number" && schemeFitScore >= 70;
}

function hasStarterSignal(player: PlayerRoleInput) {
  return (
    player.rosterStatus === "STARTER" ||
    player.depthChartSlot === 1 ||
    (typeof player.positionOverall === "number" &&
      player.positionOverall >= 76 &&
      hasStrongFit(player.schemeFitScore))
  );
}

function hasDevelopmentSignal(player: PlayerRoleInput) {
  const age = player.age ?? 99;
  const overall = player.positionOverall ?? 0;
  const potential = player.potentialRating ?? overall;

  return (
    (age <= 24 && potential - overall >= 6) ||
    Boolean(player.developmentFocus && potential - overall >= 4)
  );
}

function buildBaseReasons(player: PlayerRoleInput) {
  const reasons: string[] = [];

  if (player.archetypeName) {
    reasons.push(player.archetypeName);
  }

  if (player.schemeFitName) {
    reasons.push(player.schemeFitName);
  } else if (typeof player.schemeFitScore === "number") {
    reasons.push(`Fit ${player.schemeFitScore}`);
  }

  return reasons;
}

export function buildPlayerRole(player: PlayerRoleInput): PlayerRoleView {
  const positionCode = player.positionCode ?? "POS";
  const overall = player.positionOverall ?? null;
  const potential = player.potentialRating ?? overall;
  const upside =
    typeof potential === "number" && typeof overall === "number" ? potential - overall : 0;
  const baseReasons = buildBaseReasons(player);

  if (
    SPECIALIST_POSITIONS.has(positionCode) ||
    SPECIALIST_SECONDARY_POSITIONS.has(player.secondaryPositionCode ?? "")
  ) {
    return {
      category: "specialist",
      description: "Spezialrolle fuer Kicking, Punting oder Returns.",
      label: "Specialist",
      summary: `${positionCode}${player.secondaryPositionCode ? ` / ${player.secondaryPositionCode}` : ""} role`,
      reasons: [
        ...baseReasons,
        player.secondaryPositionCode ? `Special teams ${player.secondaryPositionCode}` : "Special teams",
      ],
      tone: "special",
    };
  }

  if (hasStarterSignal(player)) {
    return {
      category: "starter-fit",
      description: "Kann als Starter sinnvoll eingesetzt werden.",
      label: "Starter Fit",
      summary:
        player.depthChartSlot === 1
          ? `Slot #1 ${positionCode}`
          : `OVR ${overall ?? "-"} with fit ${player.schemeFitScore ?? "-"}`,
      reasons: [
        ...baseReasons,
        player.rosterStatus === "STARTER" ? "Starter status" : "Starter-level profile",
      ],
      tone: "positive",
    };
  }

  if (hasDevelopmentSignal(player)) {
    return {
      category: "development-upside",
      description: "Junger Spieler mit sichtbarem Entwicklungspotenzial.",
      label: "Development Upside",
      summary: `${player.age ?? "-"} yrs · +${Math.max(upside, 0)} POT gap`,
      reasons: [
        ...baseReasons,
        player.developmentFocus ? "Development focus" : "Young upside profile",
      ],
      tone: "accent",
    };
  }

  return {
    category: "depth",
    description: "Kader-Tiefe fuer Rotation, Backup oder Absicherung.",
    label: "Depth",
    summary:
      player.rosterStatus && player.rosterStatus !== "FREE_AGENT"
        ? `${formatRosterStatus(player.rosterStatus)}${player.depthChartSlot ? ` · Slot #${player.depthChartSlot}` : ""}`
        : `OVR ${overall ?? "-"}`,
    reasons: baseReasons.length > 0 ? baseReasons : ["Reliable roster depth"],
    tone: "neutral",
  };
}
