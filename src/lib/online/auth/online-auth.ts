import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type Unsubscribe,
  type User,
} from "firebase/auth";

import { getFirebaseClientApp, getFirebaseClientConfig } from "@/lib/firebase/client";

import { getOptionalBrowserStorage } from "../browser-storage";
import {
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_LEAGUES_STORAGE_KEY,
} from "../online-league-constants";
import {
  createDefaultOnlineUsername,
  ensureCurrentOnlineUser,
  normalizeOnlineUsername,
  ONLINE_USER_ID_STORAGE_KEY,
  ONLINE_USERNAME_STORAGE_KEY,
  setCurrentOnlineUsername,
} from "../online-user-service";
import type { OnlineAuthenticatedUser, OnlineBackendMode } from "../types";

export type OnlineAuthMethod = "login" | "register" | "logout" | "state" | "profile";

export type OnlineAuthDebugSnapshot = {
  method: OnlineAuthMethod;
  firebaseConfig: {
    projectId: string | null;
    authDomain: string | null;
    apiKeyPresent: boolean;
    appId: string | null;
    storageBucket: string | null;
    messagingSenderId: string | null;
  };
  currentUser: {
    uid: string | null;
    isAnonymous: boolean | null;
    email: string | null;
    providerData: Array<{
      providerId: string;
      uid: string | null;
      email: string | null;
      displayName: string | null;
    }>;
  };
};

export type OnlineAuthErrorDetails = {
  code: string;
  message: string;
  name: string;
};

export class OnlineAuthRequiredError extends Error {
  constructor(message = "Bitte melde dich an, um Online-Multiplayer zu nutzen.") {
    super(message);
    this.name = "OnlineAuthRequiredError";
  }
}

let onlineAuthPersistencePromise: Promise<void> | null = null;

function getStoredDisplayName() {
  return getOptionalBrowserStorage()?.getItem(ONLINE_USERNAME_STORAGE_KEY) ?? null;
}

function setStoredDisplayName(displayName: string) {
  getOptionalBrowserStorage()?.setItem(ONLINE_USERNAME_STORAGE_KEY, displayName);
}

export function clearOnlineAuthBrowserContext(storage = getOptionalBrowserStorage()) {
  if (!storage) {
    return;
  }

  [
    ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
    ONLINE_LEAGUES_STORAGE_KEY,
    ONLINE_USER_ID_STORAGE_KEY,
    ONLINE_USERNAME_STORAGE_KEY,
  ].forEach((key) => storage.removeItem(key));
}

function mapFirebaseUser(user: User): OnlineAuthenticatedUser {
  const displayName =
    user.displayName ||
    getStoredDisplayName() ||
    user.email ||
    `Coach_${user.uid.slice(0, 4)}`;

  setStoredDisplayName(displayName);

  return {
    userId: user.uid,
    username: displayName,
    displayName,
    email: user.email,
    createdAt: user.metadata.creationTime,
    lastSeenAt: user.metadata.lastSignInTime,
  };
}

async function waitForFirebaseAuthUser(auth: Auth) {
  const user =
    auth.currentUser ??
    (await new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        unsubscribe();
        resolve(nextUser);
      });
    }));

  return user;
}

function assertEmailPasswordFirebaseUser(user: User | null): User {
  if (!user) {
    throw new OnlineAuthRequiredError();
  }

  if (user.isAnonymous) {
    void signOut(getAuth(getFirebaseClientApp()));
    throw new OnlineAuthRequiredError(
      "Diese alte Online-Sitzung wird nicht mehr unterstützt. Bitte melde dich mit Email und Passwort an.",
    );
  }

  return user;
}

export function getOnlineFirebaseAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}

export function ensureOnlineFirebaseAuthPersistence(auth = getOnlineFirebaseAuth()) {
  onlineAuthPersistencePromise ??= setPersistence(auth, browserLocalPersistence);

  return onlineAuthPersistencePromise;
}

export function getOnlineAuthErrorDetails(error: unknown): OnlineAuthErrorDetails {
  return {
    code:
      typeof error === "object" &&
      error !== null &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "unknown",
    message:
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : String(error),
    name: error instanceof Error ? error.name : "UnknownError",
  };
}

export function logOnlineAuthError(method: OnlineAuthMethod, error: unknown) {
  const details = getOnlineAuthErrorDetails(error);

  console.error("AUTH_ERROR", details.code, details.message, {
    method,
    error,
    debug: getOnlineAuthDebugSnapshot(method),
  });

  return details;
}

export function getOnlineAuthDebugSnapshot(method: OnlineAuthMethod): OnlineAuthDebugSnapshot {
  const config = getFirebaseClientConfig();
  const currentUser = getOnlineFirebaseAuth().currentUser;

  return {
    method,
    firebaseConfig: {
      projectId: config.projectId || null,
      authDomain: config.authDomain || null,
      apiKeyPresent: config.apiKey.trim().length > 0,
      appId: config.appId || null,
      storageBucket: config.storageBucket || null,
      messagingSenderId: config.messagingSenderId || null,
    },
    currentUser: {
      uid: currentUser?.uid ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      email: currentUser?.email ?? null,
      providerData:
        currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          uid: provider.uid ?? null,
          email: provider.email ?? null,
          displayName: provider.displayName ?? null,
        })) ?? [],
    },
  };
}

export function subscribeToOnlineAuthState(
  onChange: (user: OnlineAuthenticatedUser | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const auth = getOnlineFirebaseAuth();

  void ensureOnlineFirebaseAuthPersistence(auth).catch(onError);

  return onAuthStateChanged(
    auth,
    (user) => {
      if (!user || user.isAnonymous) {
        if (user?.isAnonymous) {
          void signOut(auth);
        }
        onChange(null);
        return;
      }

      onChange(mapFirebaseUser(user));
    },
    onError,
  );
}

export async function getCurrentAuthenticatedOnlineUser(
  mode: OnlineBackendMode = "firebase",
): Promise<OnlineAuthenticatedUser> {
  if (mode === "local") {
    const user = ensureCurrentOnlineUser();

    return {
      ...user,
      displayName: user.username,
    };
  }

  const auth = getOnlineFirebaseAuth();

  await ensureOnlineFirebaseAuthPersistence(auth);

  const authenticatedUser = assertEmailPasswordFirebaseUser(
    await waitForFirebaseAuthUser(auth),
  );
  const storedDisplayName = getStoredDisplayName();

  if (!authenticatedUser.displayName && storedDisplayName) {
    await updateProfile(authenticatedUser, {
      displayName: storedDisplayName,
    });
  }

  if (!authenticatedUser.displayName && !storedDisplayName) {
    const defaultDisplayName = createDefaultOnlineUsername();

    await updateProfile(authenticatedUser, {
      displayName: defaultDisplayName,
    });
    setStoredDisplayName(defaultDisplayName);
  }

  return mapFirebaseUser(authenticatedUser);
}

export function getOnlineAuthErrorMessage(error: unknown) {
  const { code } = getOnlineAuthErrorDetails(error);

  if (code === "auth/email-already-in-use") {
    return "Diese Email wird bereits verwendet. Bitte melde dich an.";
  }

  if (code === "auth/invalid-credential") {
    return "Email oder Passwort ist falsch.";
  }

  if (code === "auth/wrong-password") {
    return "Das Passwort ist falsch.";
  }

  if (code === "auth/user-not-found") {
    return "Zu dieser Email existiert kein Account.";
  }

  if (code === "auth/weak-password") {
    return "Das Passwort ist zu schwach. Bitte nutze mindestens 6 Zeichen.";
  }

  if (code === "auth/invalid-email") {
    return "Bitte gib eine gültige Email-Adresse ein.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Email/Passwort-Login ist im Firebase-Projekt noch nicht aktiviert.";
  }

  if (code === "auth/network-request-failed") {
    return "Netzwerkfehler bei Firebase Auth. Bitte versuche es erneut.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Firebase Auth konnte die Aktion nicht ausführen.";
}

export async function registerOnlineUserWithEmailPassword(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<OnlineAuthenticatedUser> {
  const auth = getOnlineFirebaseAuth();

  await ensureOnlineFirebaseAuthPersistence(auth);

  const credential = await createUserWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );
  const displayName =
    input.displayName?.trim() ||
    credential.user.displayName ||
    credential.user.email ||
    `Coach_${credential.user.uid.slice(0, 4)}`;

  await updateProfile(credential.user, { displayName });
  setStoredDisplayName(displayName);

  return mapFirebaseUser(credential.user);
}

export async function signInOnlineUserWithEmailPassword(input: {
  email: string;
  password: string;
}): Promise<OnlineAuthenticatedUser> {
  const auth = getOnlineFirebaseAuth();

  await ensureOnlineFirebaseAuthPersistence(auth);

  const credential = await signInWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );

  return mapFirebaseUser(assertEmailPasswordFirebaseUser(credential.user));
}

export async function signOutOnlineUser() {
  await signOut(getOnlineFirebaseAuth());
  clearOnlineAuthBrowserContext();
}

export async function updateCurrentAuthenticatedOnlineUsername(
  username: string,
  mode: OnlineBackendMode = "firebase",
): Promise<OnlineAuthenticatedUser> {
  const normalizedUsername = normalizeOnlineUsername(username);

  if (!normalizedUsername) {
    throw new Error("Username darf nicht leer sein.");
  }

  if (mode === "local") {
    const user = setCurrentOnlineUsername(normalizedUsername);

    return {
      ...user,
      displayName: user.username,
    };
  }

  const auth = getOnlineFirebaseAuth();
  const authenticatedUser = assertEmailPasswordFirebaseUser(
    await waitForFirebaseAuthUser(auth),
  );

  await updateProfile(authenticatedUser, {
    displayName: normalizedUsername,
  });
  setStoredDisplayName(normalizedUsername);

  return mapFirebaseUser(authenticatedUser);
}
