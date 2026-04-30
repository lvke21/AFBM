import type { OnlineBackendMode } from "@/lib/online/types";

export type OnlineModeStatusCopy = {
  mode: OnlineBackendMode;
  primaryBadge: string;
  syncBadge: string;
  roleBadge: string;
  title: string;
  description: string;
  dashboardDescription: string;
  searchHelper: string;
  missingLeagueHelper: string;
};

export function getOnlineModeStatusCopy(
  mode: OnlineBackendMode,
  role = "GM",
): OnlineModeStatusCopy {
  if (mode === "firebase") {
    return {
      mode,
      primaryBadge: "Live Multiplayer",
      syncBadge: "Firebase verbunden",
      roleBadge: `Rolle: ${role}`,
      title: "Online synchronisiert",
      description:
        "Du spielst im Live-Multiplayer. Ligaänderungen werden über Firebase mit anderen Spielern synchronisiert.",
      dashboardDescription:
        "Diese Liga ist online synchronisiert. Ready-State, Teamaktionen und Admin-Fortschritt werden über Firebase geteilt.",
      searchHelper:
        "Wähle eine verfügbare Live-Liga aus. Beitritt und Ligaaktionen werden online synchronisiert.",
      missingLeagueHelper:
        "Die angeforderte Liga ist online nicht erreichbar oder du hast keinen Zugriff mehr.",
    };
  }

  return {
    mode,
    primaryBadge: "Lokaler Testmodus",
    syncBadge: "Offline/Testdaten",
    roleBadge: `Rolle: ${role}`,
    title: "Lokaler MVP-Testmodus",
    description:
      "Du spielst im lokalen Testmodus. Daten bleiben auf diesem Gerät und werden nicht online synchronisiert.",
    dashboardDescription:
      "Diese Liga läuft lokal auf deinem Gerät. Änderungen sind Testdaten und werden nicht mit anderen Spielern synchronisiert.",
    searchHelper:
      "Wähle eine lokale Testliga aus. Diese Daten dienen dem MVP-Test und werden nicht online synchronisiert.",
    missingLeagueHelper:
      "Die angeforderte lokale Testliga existiert auf diesem Gerät nicht oder wurde zurückgesetzt.",
  };
}
