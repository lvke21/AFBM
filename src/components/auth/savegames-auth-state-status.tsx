"use client";

import { FIREBASE_AUTH_LOADING_COPY } from "@/lib/auth/firebase-auth-state";

import { useFirebaseAuthState } from "./firebase-auth-provider";

export function SavegamesAuthStateStatus() {
  const authState = useFirebaseAuthState();

  if (!authState.isLoading) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200"
    >
      {FIREBASE_AUTH_LOADING_COPY}
    </div>
  );
}
