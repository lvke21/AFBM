export type OnlineLeagueComingSoonFeature =
  | "contracts-cap"
  | "development"
  | "training"
  | "trade-board"
  | "inbox"
  | "finance";

export type OnlineLeagueComingSoonCopy = {
  feature: OnlineLeagueComingSoonFeature | "unknown";
  title: string;
  shortLabel: string;
  description: string;
  currentMvpHint: string;
};

const COMING_SOON_COPY: Record<OnlineLeagueComingSoonFeature, OnlineLeagueComingSoonCopy> = {
  "contracts-cap": {
    feature: "contracts-cap",
    title: "Contracts/Cap kommt später",
    shortLabel: "Contracts/Cap",
    description:
      "Verträge, Cap Space, Dead Cap und Free-Agent-Moves werden im Multiplayer noch nicht aktiv verwaltet.",
    currentMvpHint:
      "Nicht Teil des aktuellen Multiplayer MVP. Roster und Depth Chart bleiben aktuell die relevanten Team-Bereiche.",
  },
  development: {
    feature: "development",
    title: "Development kommt später",
    shortLabel: "Development",
    description:
      "Spielerentwicklung, Staff-Progression und langfristige Trainingsauswertung sind für Multiplayer noch nicht freigeschaltet.",
    currentMvpHint:
      "Nicht Teil des aktuellen Multiplayer MVP. Die Simulation nutzt sichere Standardwerte.",
  },
  training: {
    feature: "training",
    title: "Training kommt später",
    shortLabel: "Training",
    description:
      "Training ist im Multiplayer aktuell nicht als eigenständiger steuerbarer Bereich freigeschaltet.",
    currentMvpHint:
      "Nicht Teil des aktuellen Multiplayer MVP. Kader, Depth Chart und Bereit-Status bleiben die relevanten Team-Prüfungen.",
  },
  "trade-board": {
    feature: "trade-board",
    title: "Trade Board kommt später",
    shortLabel: "Trade Board",
    description:
      "Spieler- und Pick-Trades zwischen menschlichen Managern sind im aktuellen Multiplayer-Stand noch deaktiviert.",
    currentMvpHint:
      "Nicht Teil des aktuellen Multiplayer MVP. Damit bleiben Roster und Memberships stabil.",
  },
  inbox: {
    feature: "inbox",
    title: "Inbox kommt später",
    shortLabel: "Inbox",
    description:
      "Liga-Nachrichten, Commissioner-Meldungen und System-Inbox sind noch nicht an Firebase-Multiplayer angeschlossen.",
    currentMvpHint:
      "Nicht Teil des aktuellen Multiplayer MVP. Wichtige Statusinformationen stehen im Dashboard.",
  },
  finance: {
    feature: "finance",
    title: "Finance kommt später",
    shortLabel: "Finance",
    description:
      "Ticketpreise, Merch, Owner-Finanzen und Budgetsteuerung sind im Multiplayer noch nicht aktiv steuerbar.",
    currentMvpHint:
      "Nicht Teil des aktuellen Multiplayer MVP. Sportliche Woche, Roster, Draft und Ergebnisse haben Vorrang.",
  },
};

export function isOnlineLeagueComingSoonFeature(
  feature: string,
): feature is OnlineLeagueComingSoonFeature {
  return feature in COMING_SOON_COPY;
}

export function getOnlineLeagueComingSoonCopy(feature: string): OnlineLeagueComingSoonCopy {
  if (isOnlineLeagueComingSoonFeature(feature)) {
    return COMING_SOON_COPY[feature];
  }

  return {
    feature: "unknown",
    title: "Bereich noch nicht verfügbar",
    shortLabel: "Coming Soon",
    description:
      "Dieser Multiplayer-Bereich ist noch nicht für den aktuellen Liga-Kontext freigeschaltet.",
    currentMvpHint:
      "Nutze Dashboard, Spielablauf, Roster, Depth Chart, League oder Draft für den aktuellen Multiplayer MVP.",
  };
}
