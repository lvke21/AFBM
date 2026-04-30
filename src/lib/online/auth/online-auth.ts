import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";

import { getFirebaseClientApp } from "@/lib/firebase/client";

import {
  createDefaultOnlineUsername,
  ensureCurrentOnlineUser,
  normalizeOnlineUsername,
  ONLINE_USERNAME_STORAGE_KEY,
  setCurrentOnlineUsername,
} from "../online-user-service";
import type { OnlineAuthenticatedUser, OnlineBackendMode } from "../types";

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

function mapFirebaseUser(user: User): OnlineAuthenticatedUser {
  const displayName =
    user.displayName || getStoredDisplayName() || `Coach_${user.uid.slice(0, 4)}`;

  setStoredDisplayName(displayName);

  return {
    userId: user.uid,
    username: displayName,
    displayName,
    isAnonymous: user.isAnonymous,
    createdAt: user.metadata.creationTime,
    lastSeenAt: user.metadata.lastSignInTime,
  };
}

async function getOrCreateAnonymousFirebaseUser(auth: Auth) {
  const user =
    auth.currentUser ??
    (await new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        unsubscribe();
        resolve(nextUser);
      });
    }));

  return user ?? (await signInAnonymously(auth)).user;
}

export async function getCurrentAuthenticatedOnlineUser(
  mode: OnlineBackendMode = "firebase",
): Promise<OnlineAuthenticatedUser> {
  if (mode === "local") {
    const user = ensureCurrentOnlineUser();

    return {
      ...user,
      displayName: user.username,
      isAnonymous: true,
    };
  }

  const auth = getAuth(getFirebaseClientApp());
  const authenticatedUser = await getOrCreateAnonymousFirebaseUser(auth);
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
      isAnonymous: true,
    };
  }

  const auth = getAuth(getFirebaseClientApp());
  const authenticatedUser = await getOrCreateAnonymousFirebaseUser(auth);

  await updateProfile(authenticatedUser, {
    displayName: normalizedUsername,
  });
  setStoredDisplayName(normalizedUsername);

  return mapFirebaseUser(authenticatedUser);
}
