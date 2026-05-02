"use client";

import Link from "next/link";

import { openSavegamesLogin } from "@/components/auth/auth-required-actions";
import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { useFirebaseAdminAccess } from "@/components/auth/use-firebase-admin-access";

const ADMIN_LINK_CLASS =
  "rounded-lg border border-amber-200/20 bg-amber-300/8 p-5 text-left transition hover:border-amber-200/45 hover:bg-amber-300/12";

export function SavegamesAdminLink() {
  const authState = useFirebaseAuthState();
  const adminAccess = useFirebaseAdminAccess();

  const badgeLabel = authState.isLoading
    ? "Pruefe Login"
    : adminAccess.isAdmin
      ? "Admin verfuegbar"
      : authState.isAuthenticated
        ? "Kein Admin"
        : "Login erforderlich";
  const hint = authState.isLoading
    ? "Firebase Auth wird geprüft."
    : adminAccess.isAdmin
      ? "Öffne zentrale Werkzeuge fuer Liga-Verwaltung, Simulation und Debug."
      : authState.isAuthenticated
        ? adminAccess.status === "error"
          ? adminAccess.reason
          : "Dein Account ist als GM angemeldet, aber nicht fuer den Adminmodus freigeschaltet."
        : "Melde dich an. Adminzugriff wird danach über UID-Allowlist oder Custom Claim geprüft.";

  const content = (
    <>
      <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            Admin Hub
          </span>
          <span className="mt-1 block text-xl font-semibold text-white">Adminmodus</span>
        </span>
        <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {badgeLabel}
        </span>
      </span>
      <span id="admin-mode-hint" className="mt-3 block text-sm text-slate-300">
        {hint}
      </span>
    </>
  );

  if (adminAccess.isAdmin) {
    return (
      <Link href="/admin" className={ADMIN_LINK_CLASS} aria-describedby="admin-mode-hint">
        {content}
      </Link>
    );
  }

  if (!authState.isAuthenticated && !authState.isLoading) {
    return (
      <button type="button" className={ADMIN_LINK_CLASS} onClick={openSavegamesLogin}>
        {content}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={`${ADMIN_LINK_CLASS} cursor-not-allowed opacity-65`}
      aria-describedby="admin-mode-hint"
    >
      {content}
    </button>
  );
}
