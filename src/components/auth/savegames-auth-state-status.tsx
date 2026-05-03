"use client";

import { FIREBASE_AUTH_LOADING_COPY } from "@/lib/auth/firebase-auth-state";

import { useFirebaseAuthState } from "./firebase-auth-provider";
import { useFirebaseAdminAccess } from "./use-firebase-admin-access";

export function SavegamesAuthStateStatus() {
  const authState = useFirebaseAuthState();
  const adminAccess = useFirebaseAdminAccess();
  const user = authState.user;

  const isAuthenticated = authState.isAuthenticated && user !== null;
  const roleLabel = isAuthenticated ? adminAccess.roleLabel : "Nicht eingeloggt";

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Loginstatus
          </p>
          <p className="mt-1 font-semibold text-white">
            {authState.isLoading
              ? FIREBASE_AUTH_LOADING_COPY
              : isAuthenticated
                ? user.displayName || user.email || "Angemeldet"
                : "Nicht eingeloggt"}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            {authState.isLoading
              ? "Accountdaten werden geladen."
              : isAuthenticated
                ? user.email ?? "Angemeldet"
                : "Nicht eingeloggt"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
            {isAuthenticated ? "Angemeldet" : "Login erforderlich"}
          </span>
          <span className="w-fit rounded-full border border-sky-200/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
            Rolle: {roleLabel}
          </span>
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
              adminAccess.isAdmin
                ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            Admin: {adminAccess.isAdmin ? "verfuegbar" : "nicht verfuegbar"}
          </span>
        </div>
      </div>
    </div>
  );
}
