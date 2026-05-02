"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  subscribeToOnlineAuthState,
  getOnlineAuthErrorMessage,
} from "@/lib/online/auth/online-auth";
import { getOnlineBackendMode } from "@/lib/online/online-league-repository-provider";
import { ensureCurrentOnlineUser } from "@/lib/online/online-user-service";
import type { OnlineAuthenticatedUser } from "@/lib/online/types";

import { FirebaseEmailAuthPanel } from "./firebase-email-auth-panel";

export function OnlineAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onlineMode = getOnlineBackendMode();
  const [state, setState] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<OnlineAuthenticatedUser | null>(null);

  useEffect(() => {
    if (onlineMode === "local") {
      const localUser = ensureCurrentOnlineUser();

      setUser({
        ...localUser,
        displayName: localUser.username,
      });
      setState("signed-in");
      setError(null);
      return undefined;
    }

    try {
      return subscribeToOnlineAuthState(
        (nextUser) => {
          setUser(nextUser);
          setState(nextUser ? "signed-in" : "signed-out");
          setError(null);
        },
        (authError) => {
          setUser(null);
          setState("signed-out");
          setError(getOnlineAuthErrorMessage(authError));
        },
      );
    } catch (authError) {
      setUser(null);
      setState("signed-out");
      setError(getOnlineAuthErrorMessage(authError));
      return undefined;
    }
  }, [onlineMode]);

  if (state === "loading") {
    return (
      <div className="w-full rounded-lg border border-white/10 bg-white/5 p-5 text-sm font-semibold text-slate-200">
        Firebase Login wird geprüft...
      </div>
    );
  }

  if (state === "signed-out" || !user) {
    return (
      <div className="w-full max-w-xl">
        <FirebaseEmailAuthPanel redirectAfterAuth={pathname} />
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-sm font-semibold text-rose-100">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
