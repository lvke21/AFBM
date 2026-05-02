"use client";

import { useEffect, useState } from "react";

import { isAdminUid } from "@/lib/admin/admin-uid-allowlist";
import { getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";
import { useFirebaseAuthState } from "./firebase-auth-provider";

export type FirebaseAdminAccessState =
  | { status: "loading"; isAdmin: false; roleLabel: "Pruefe Rolle" }
  | { status: "allowed"; isAdmin: true; roleLabel: "Admin + GM"; uid: string }
  | { status: "denied"; isAdmin: false; roleLabel: "GM"; reason: string }
  | { status: "error"; isAdmin: false; roleLabel: "GM"; reason: string };

export function useFirebaseAdminAccess(): FirebaseAdminAccessState {
  const authState = useFirebaseAuthState();
  const [state, setState] = useState<FirebaseAdminAccessState>({
    status: "loading",
    isAdmin: false,
    roleLabel: "Pruefe Rolle",
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAdminAccess() {
      if (authState.status === "loading") {
        setState({ status: "loading", isAdmin: false, roleLabel: "Pruefe Rolle" });
        return;
      }

      if (!authState.user) {
        setState({
          status: "denied",
          isAdmin: false,
          roleLabel: "GM",
          reason: authState.errorMessage ?? "Bitte melde dich zuerst mit Firebase an.",
        });
        return;
      }

      if (isAdminUid(authState.user.uid)) {
        setState({
          status: "allowed",
          isAdmin: true,
          roleLabel: "Admin + GM",
          uid: authState.user.uid,
        });
        return;
      }

      const firebaseUser = getOnlineFirebaseAuth().currentUser;

      if (!firebaseUser || firebaseUser.uid !== authState.user.uid) {
        setState({ status: "loading", isAdmin: false, roleLabel: "Pruefe Rolle" });
        return;
      }

      try {
        const token = await firebaseUser.getIdTokenResult();

        if (cancelled) {
          return;
        }

        if (token.claims.admin === true) {
          setState({
            status: "allowed",
            isAdmin: true,
            roleLabel: "Admin + GM",
            uid: firebaseUser.uid,
          });
          return;
        }

        setState({
          status: "denied",
          isAdmin: false,
          roleLabel: "GM",
          reason: "Dein Firebase-Account ist als GM angemeldet, aber nicht als Admin markiert.",
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            isAdmin: false,
            roleLabel: "GM",
            reason: "Adminrolle konnte nicht geprueft werden.",
          });
        }
      }
    }

    void checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [authState.errorMessage, authState.status, authState.user]);

  return state;
}
