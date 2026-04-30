import {
  EmailAuthProvider,
  getAuth,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";

import { getFirebaseClientApp } from "@/lib/firebase/client";

import {
  createDefaultOnlineUsername,
  normalizeOnlineUsername,
  ONLINE_USERNAME_STORAGE_KEY,
} from "../online-user-service";
import type { OnlineBackendMode } from "../types";

export type OnlineAccountSecurityStatus =
  | "secured"
  | "already-secured"
  | "local-unavailable";

export type SecureOnlineAccountInput = {
  email: string;
  password: string;
  displayName?: string;
  mode?: OnlineBackendMode;
};

export type SecureOnlineAccountResult = {
  status: OnlineAccountSecurityStatus;
  userId: string;
  email: string | null;
  displayName: string;
  isAnonymous: boolean;
  providerIds: string[];
  uidPreserved: boolean;
};

export class OnlineAccountLinkingError extends Error {
  readonly code:
    | "email-already-in-use"
    | "expired-credentials"
    | "firebase-auth-not-configured"
    | "invalid-email"
    | "local-mode"
    | "network"
    | "provider-already-linked"
    | "provider-disabled"
    | "weak-password"
    | "unknown";

  constructor(
    code: OnlineAccountLinkingError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "OnlineAccountLinkingError";
    this.code = code;
  }
}

type FirebaseAuthErrorLike = {
  code?: string;
  message?: string;
};

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function getStoredDisplayName() {
  return getBrowserStorage()?.getItem(ONLINE_USERNAME_STORAGE_KEY) ?? null;
}

function setStoredDisplayName(displayName: string) {
  getBrowserStorage()?.setItem(ONLINE_USERNAME_STORAGE_KEY, displayName);
}

function firebaseErrorCode(error: unknown) {
  const authError = error as FirebaseAuthErrorLike | null;
  const code = authError?.code;

  if (code) {
    return code;
  }

  const message = authError?.message ?? "";
  if (message.includes("CONFIGURATION_NOT_FOUND")) {
    return "auth/configuration-not-found";
  }

  if (message.includes("EMAIL_EXISTS")) {
    return "auth/email-already-in-use";
  }

  if (message.includes("WEAK_PASSWORD")) {
    return "auth/weak-password";
  }

  if (message.includes("INVALID_EMAIL")) {
    return "auth/invalid-email";
  }

  if (message.includes("OPERATION_NOT_ALLOWED")) {
    return "auth/operation-not-allowed";
  }

  return "";
}

export function mapOnlineAccountLinkingError(error: unknown): OnlineAccountLinkingError {
  if (error instanceof OnlineAccountLinkingError) {
    return error;
  }

  const code = firebaseErrorCode(error);

  if (code === "auth/email-already-in-use" || code === "auth/credential-already-in-use") {
    return new OnlineAccountLinkingError(
      "email-already-in-use",
      "Diese Email-Adresse ist bereits mit einem anderen Account verbunden. Dein aktueller Online-Account wurde nicht gewechselt.",
      { cause: error },
    );
  }

  if (code === "auth/provider-already-linked") {
    return new OnlineAccountLinkingError(
      "provider-already-linked",
      "Dieser Firebase-Account ist bereits mit Email/Passwort gesichert. Deine Liga-Daten bleiben unveraendert.",
      { cause: error },
    );
  }

  if (code === "auth/weak-password") {
    return new OnlineAccountLinkingError(
      "weak-password",
      "Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen und waehle ein Passwort, das du nicht an anderer Stelle nutzt.",
      { cause: error },
    );
  }

  if (code === "auth/invalid-email") {
    return new OnlineAccountLinkingError(
      "invalid-email",
      "Bitte gib eine gueltige Email-Adresse ein.",
      { cause: error },
    );
  }

  if (
    code === "auth/requires-recent-login" ||
    code === "auth/user-token-expired" ||
    code === "auth/invalid-user-token"
  ) {
    return new OnlineAccountLinkingError(
      "expired-credentials",
      "Deine Sitzung ist abgelaufen. Lade die Seite neu und versuche es erneut, damit deine aktuelle UID erhalten bleibt.",
      { cause: error },
    );
  }

  if (code === "auth/network-request-failed") {
    return new OnlineAccountLinkingError(
      "network",
      "Die Verbindung zu Firebase ist gerade nicht stabil. Bitte versuche es gleich noch einmal.",
      { cause: error },
    );
  }

  if (code === "auth/configuration-not-found") {
    return new OnlineAccountLinkingError(
      "firebase-auth-not-configured",
      "Firebase Auth ist fuer diese Staging-App noch nicht korrekt konfiguriert. Anonymous Online-Spielen bleibt moeglich; Account-Sicherung per Email/Passwort ist aktuell deaktiviert.",
      { cause: error },
    );
  }

  if (code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation") {
    return new OnlineAccountLinkingError(
      "provider-disabled",
      "Email/Passwort ist in Firebase noch nicht aktiviert. Deine Liga-Daten bleiben unveraendert.",
      { cause: error },
    );
  }

  return new OnlineAccountLinkingError(
    "unknown",
    "Account konnte nicht gesichert werden. Deine Liga-Daten bleiben unveraendert.",
    { cause: error },
  );
}

async function getExistingOrAnonymousFirebaseUser(auth: Auth) {
  const currentUser =
    auth.currentUser ??
    (await new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        unsubscribe();
        resolve(nextUser);
      });
    }));

  return currentUser ?? (await signInAnonymously(auth)).user;
}

function accountResult(
  user: User,
  previousUid: string,
  status: OnlineAccountSecurityStatus,
): SecureOnlineAccountResult {
  const displayName =
    user.displayName || getStoredDisplayName() || `Coach_${user.uid.slice(0, 4)}`;

  setStoredDisplayName(displayName);

  return {
    status,
    userId: user.uid,
    email: user.email,
    displayName,
    isAnonymous: user.isAnonymous,
    providerIds: user.providerData.map((provider) => provider.providerId),
    uidPreserved: user.uid === previousUid,
  };
}

export async function secureCurrentOnlineAccount(
  input: SecureOnlineAccountInput,
): Promise<SecureOnlineAccountResult> {
  if (input.mode === "local") {
    throw new OnlineAccountLinkingError(
      "local-mode",
      "Account-Sicherung ist nur im Live-Multiplayer mit Firebase verfuegbar.",
    );
  }

  const auth = getAuth(getFirebaseClientApp());
  const user = await getExistingOrAnonymousFirebaseUser(auth);
  const previousUid = user.uid;
  const email = input.email.trim().toLowerCase();
  const requestedDisplayName = normalizeOnlineUsername(input.displayName ?? "");

  if (!email) {
    throw new OnlineAccountLinkingError("invalid-email", "Bitte gib eine Email-Adresse ein.");
  }

  if (user.providerData.some((provider) => provider.providerId === "password")) {
    return accountResult(user, previousUid, "already-secured");
  }

  try {
    const credential = EmailAuthProvider.credential(email, input.password);
    const linkedUserCredential = await linkWithCredential(user, credential);
    const linkedUser = linkedUserCredential.user;
    const displayName =
      requestedDisplayName ||
      linkedUser.displayName ||
      getStoredDisplayName() ||
      createDefaultOnlineUsername();

    if (!linkedUser.displayName || linkedUser.displayName !== displayName) {
      await updateProfile(linkedUser, { displayName });
    }
    setStoredDisplayName(displayName);

    if (linkedUser.uid !== previousUid) {
      throw new OnlineAccountLinkingError(
        "unknown",
        "Firebase hat nicht dieselbe UID zurueckgegeben. Der Account wurde nicht als sicher markiert.",
      );
    }

    return accountResult(linkedUser, previousUid, "secured");
  } catch (error) {
    throw mapOnlineAccountLinkingError(error);
  }
}
