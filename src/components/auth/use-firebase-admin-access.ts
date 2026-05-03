"use client";

import { useEffect, useState } from "react";

import { getAdminAuthDecision } from "@/lib/admin/admin-auth-model";
import { getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";
import { useFirebaseAuthState } from "./firebase-auth-provider";

type FirebaseAdminAccessState =
  | { status: "loading"; isAdmin: false; roleLabel: "Pruefe Rolle" }
  | { status: "allowed"; isAdmin: true; roleLabel: "Admin + Manager"; uid: string }
  | { status: "bootstrap"; isAdmin: false; roleLabel: "Manager"; reason: string; uid: string }
  | { status: "denied"; isAdmin: false; roleLabel: "Manager"; reason: string }
  | { status: "error"; isAdmin: false; roleLabel: "Manager"; reason: string };

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
          roleLabel: "Manager",
          reason: authState.errorMessage ?? "Bitte melde dich zuerst an.",
        });
        return;
      }

      const firebaseUser = getOnlineFirebaseAuth().currentUser;

      if (!firebaseUser || firebaseUser.uid !== authState.user.uid) {
        setState({ status: "loading", isAdmin: false, roleLabel: "Pruefe Rolle" });
        return;
      }

      try {
        const token = await firebaseUser.getIdTokenResult(true);
        const adminDecision = getAdminAuthDecision({
          claims: token.claims,
          uid: firebaseUser.uid,
        });

        if (cancelled) {
          return;
        }

        if (adminDecision.allowed) {
          setState({
            status: "allowed",
            isAdmin: true,
            roleLabel: "Admin + Manager",
            uid: firebaseUser.uid,
          });
          return;
        }

        if (adminDecision.bootstrapEligible) {
          setState({
            status: "bootstrap",
            isAdmin: false,
            roleLabel: "Manager",
            reason:
              "UID ist als Admin-Bootstrap vorgemerkt. Echte Adminrechte brauchen den Firebase Custom Claim admin=true.",
            uid: firebaseUser.uid,
          });
          return;
        }

        setState({
          status: "denied",
          isAdmin: false,
          roleLabel: "Manager",
          reason: "Dein Account ist als Manager angemeldet, aber nicht als Admin markiert.",
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            isAdmin: false,
            roleLabel: "Manager",
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
