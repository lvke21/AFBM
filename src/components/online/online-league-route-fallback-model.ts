export type OnlineLeagueRouteFallbackResolution =
  | {
      type: "anchor";
      anchor: "depth-chart" | "league" | "roster" | "team" | "week-loop";
    }
  | {
      type: "coming-soon";
      feature:
        | "contracts-cap"
        | "development"
        | "finance"
        | "inbox"
        | "training"
        | "trade-board";
    }
  | {
      type: "draft";
    }
  | {
      type: "unknown";
      pathLabel: string;
    };

const ANCHOR_ALIASES: Record<
  string,
  Extract<OnlineLeagueRouteFallbackResolution, { type: "anchor" }>["anchor"]
> = {
  dashboard: "week-loop",
  schedule: "week-loop",
  spielablauf: "week-loop",
  "week-flow": "week-loop",
  "week-loop": "week-loop",
  "team-overview": "team",
  team: "team",
  roster: "roster",
  "depth-chart": "depth-chart",
  depthchart: "depth-chart",
  league: "league",
  results: "league",
  standings: "league",
};

const COMING_SOON_ALIASES: Record<
  string,
  Extract<OnlineLeagueRouteFallbackResolution, { type: "coming-soon" }>["feature"]
> = {
  contracts: "contracts-cap",
  "contracts-cap": "contracts-cap",
  cap: "contracts-cap",
  development: "development",
  training: "training",
  "development/training": "training",
  "trade-board": "trade-board",
  trades: "trade-board",
  inbox: "inbox",
  finance: "finance",
};

function normalizeSectionPath(section: string[]) {
  return section
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join("/");
}

export function resolveOnlineLeagueRouteFallback(
  section: string[],
): OnlineLeagueRouteFallbackResolution {
  const normalizedPath = normalizeSectionPath(section);
  const firstSection = normalizedPath.split("/")[0] ?? "";

  if (normalizedPath === "draft" || firstSection === "draft") {
    return { type: "draft" };
  }

  const anchor = ANCHOR_ALIASES[normalizedPath] ?? ANCHOR_ALIASES[firstSection];

  if (anchor) {
    return { type: "anchor", anchor };
  }

  const comingSoonFeature =
    COMING_SOON_ALIASES[normalizedPath] ?? COMING_SOON_ALIASES[firstSection];

  if (comingSoonFeature) {
    return { type: "coming-soon", feature: comingSoonFeature };
  }

  return {
    type: "unknown",
    pathLabel: normalizedPath || "unbekannter Bereich",
  };
}

export function getOnlineLeagueRouteFallbackHref(
  leagueId: string,
  resolution: OnlineLeagueRouteFallbackResolution,
) {
  const baseHref = `/online/league/${leagueId}`;

  if (resolution.type === "anchor") {
    return `${baseHref}#${resolution.anchor}`;
  }

  if (resolution.type === "draft") {
    return `${baseHref}/draft`;
  }

  if (resolution.type === "coming-soon") {
    return `${baseHref}/coming-soon/${resolution.feature}`;
  }

  return baseHref;
}
