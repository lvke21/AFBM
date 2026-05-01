"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";

import { getOnlineAuthErrorMessage, getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";
import { getOnlineBackendMode } from "@/lib/online/online-league-repository-provider";
import {
  INITIAL_FIREBASE_AUTH_STATE,
  createFirebaseAuthErrorState,
  createFirebaseAuthStateFromUser,
  type FirebaseAuthState,
} from "@/lib/auth/firebase-auth-state";

type FirebaseAuthContextValue = FirebaseAuthState & {
  isLoading: boolean;
  isAuthenticated: boolean;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FirebaseAuthState>(INITIAL_FIREBASE_AUTH_STATE);
  const onlineMode = getOnlineBackendMode();

  useEffect(() => {
    if (onlineMode !== "firebase") {
      setState(createFirebaseAuthStateFromUser(null));
      return undefined;
    }

    setState(INITIAL_FIREBASE_AUTH_STATE);

    try {
      return onAuthStateChanged(
        getOnlineFirebaseAuth(),
        (user) => setState(createFirebaseAuthStateFromUser(user)),
        (error) => setState(createFirebaseAuthErrorState(getOnlineAuthErrorMessage(error))),
      );
    } catch (error) {
      setState(createFirebaseAuthErrorState(getOnlineAuthErrorMessage(error)));
      return undefined;
    }
  }, [onlineMode]);

  const value = useMemo<FirebaseAuthContextValue>(
    () => ({
      ...state,
      isLoading: state.status === "loading",
      isAuthenticated: state.status === "authenticated",
    }),
    [state],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuthState() {
  const value = useContext(FirebaseAuthContext);

  if (!value) {
    throw new Error("useFirebaseAuthState must be used inside FirebaseAuthProvider.");
  }

  return value;
}
