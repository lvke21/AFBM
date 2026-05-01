export type OnlineRecoveryKind =
  | "auth"
  | "network"
  | "permission"
  | "not-found"
  | "missing-player"
  | "missing-team"
  | "sync"
  | "unknown";

export type OnlineRecoveryCopy = {
  kind: OnlineRecoveryKind;
  title: string;
  message: string;
  helper: string;
};

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };

    if (typeof candidate.code === "string") {
      return candidate.code;
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  return typeof error === "string" ? error : "";
}

export function classifyOnlineRecoveryError(error: unknown): OnlineRecoveryKind {
  const code = getErrorCode(error).toLowerCase();

  if (
    code.includes("auth") ||
    code.includes("unauthenticated") ||
    code.includes("firebase auth")
  ) {
    return "auth";
  }

  if (
    code.includes("permission") ||
    code.includes("denied") ||
    code.includes("unauthorized") ||
    code.includes("not authorized")
  ) {
    return "permission";
  }

  if (code.includes("not-found") || code.includes("nicht gefunden") || code.includes("missing")) {
    return "not-found";
  }

  if (
    code.includes("network") ||
    code.includes("offline") ||
    code.includes("unavailable") ||
    code.includes("timeout")
  ) {
    return "network";
  }

  return "sync";
}

export function getOnlineRecoveryCopy(
  error: unknown,
  fallback: Pick<OnlineRecoveryCopy, "title" | "message" | "helper">,
): OnlineRecoveryCopy {
  const kind = classifyOnlineRecoveryError(error);

  if (kind === "auth") {
    return {
      kind,
      title: "Online-Identitaet nicht verfuegbar",
      message: "Firebase Login ist erforderlich.",
      helper: "Melde dich mit Email und Passwort an. Deine Liga-Daten werden nicht lokal ueberschrieben.",
    };
  }

  if (kind === "permission") {
    return {
      kind,
      title: "Zugriff nicht erlaubt",
      message: "Du hast fuer diese Online-Liga oder Aktion keine Berechtigung.",
      helper: "Gehe zurueck zum Online Hub und lade die Liga erneut.",
    };
  }

  if (kind === "not-found") {
    return {
      kind,
      title: "Online-Liga nicht gefunden",
      message: "Die Liga existiert nicht mehr oder ist fuer deinen Account nicht erreichbar.",
      helper: "Suche erneut nach einer Liga. Der gespeicherte lokale Verweis wird nicht weiter benutzt.",
    };
  }

  if (kind === "network") {
    return {
      kind,
      title: "Netzwerk nicht verfuegbar",
      message: "Die Verbindung zu Firebase konnte nicht hergestellt werden.",
      helper: "Pruefe die Verbindung und versuche es erneut. Es werden keine lokalen Ersatzdaten geschrieben.",
    };
  }

  return {
    kind,
    ...fallback,
  };
}

export function getMissingPlayerRecoveryCopy(): OnlineRecoveryCopy {
  return {
    kind: "missing-player",
    title: "Spieler in dieser Liga nicht gefunden",
    message: "Dein aktueller Online-Account ist in dieser Liga nicht als GM eingetragen.",
    helper: "Gehe zum Online Hub, lade deine letzte Liga erneut oder tritt einer passenden Liga bei.",
  };
}

export function getMissingTeamRecoveryCopy(): OnlineRecoveryCopy {
  return {
    kind: "missing-team",
    title: "Team-Zuordnung fehlt",
    message: "Dein Spieler ist vorhanden, aber kein aktives Team ist zugeordnet.",
    helper: "Bitte lade die Liga neu. Falls das Team freigegeben wurde, tritt ueber den Online Hub erneut bei.",
  };
}
