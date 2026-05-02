"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getOnlineAuthErrorMessage,
  logOnlineAuthError,
  registerOnlineUserWithEmailPassword,
  signInOnlineUserWithEmailPassword,
  signOutOnlineUser,
  subscribeToOnlineAuthState,
  type OnlineAuthErrorDetails,
} from "@/lib/online/auth/online-auth";
import { getOnlineBackendMode } from "@/lib/online/online-league-repository-provider";
import type { OnlineAuthenticatedUser } from "@/lib/online/types";
import { SAVEGAMES_LOGIN_EVENT } from "./auth-required-actions";
import { useFirebaseAdminAccess } from "./use-firebase-admin-access";

type FirebaseEmailAuthPanelProps = {
  redirectAfterAuth?: string;
  compact?: boolean;
};

export function FirebaseEmailAuthPanel({
  redirectAfterAuth,
  compact = false,
}: FirebaseEmailAuthPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const onlineMode = getOnlineBackendMode();
  const [authState, setAuthState] = useState<"loading" | "anonymous" | "authenticated">(
    onlineMode === "local" ? "anonymous" : "loading",
  );
  const [user, setUser] = useState<OnlineAuthenticatedUser | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<OnlineAuthErrorDetails | null>(null);
  const [pending, setPending] = useState(false);
  const adminAccess = useFirebaseAdminAccess();

  useEffect(() => {
    if (onlineMode === "local") {
      setAuthState("anonymous");
      setUser(null);
      return undefined;
    }

    return subscribeToOnlineAuthState(
      (nextUser) => {
        setUser(nextUser);
        setAuthState(nextUser ? "authenticated" : "anonymous");
      },
      (error) => {
        const details = logOnlineAuthError("state", error);

        setUser(null);
        setAuthState("anonymous");
        setDebugError(details);
        setFeedback(getOnlineAuthErrorMessage(error));
      },
    );
  }, [onlineMode]);

  useEffect(() => {
    function handleOpenLogin() {
      setMode("login");
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => emailInputRef.current?.focus(), 120);
    }

    window.addEventListener(SAVEGAMES_LOGIN_EVENT, handleOpenLogin);

    return () => window.removeEventListener(SAVEGAMES_LOGIN_EVENT, handleOpenLogin);
  }, []);

  useEffect(() => {
    if (authState === "authenticated" && redirectAfterAuth) {
      router.replace(redirectAfterAuth);
    }
  }, [authState, redirectAfterAuth, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setFeedback(null);
    setDebugError(null);

    const authMethod = mode === "register" ? "register" : "login";

    try {
      const nextUser =
        mode === "register"
          ? await registerOnlineUserWithEmailPassword({
              email,
              password,
              displayName,
            })
          : await signInOnlineUserWithEmailPassword({ email, password });

      setUser(nextUser);
      setAuthState("authenticated");
      setPassword("");
      setDebugError(null);
      setFeedback(mode === "register" ? "Account erstellt." : "Login erfolgreich.");
    } catch (error) {
      const details = logOnlineAuthError(authMethod, error);

      setDebugError(details);
      setFeedback(getOnlineAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    if (pending) {
      return;
    }

    setPending(true);
    setFeedback(null);
    setDebugError(null);

    try {
      await signOutOnlineUser();
      setUser(null);
      setAuthState("anonymous");
      setFeedback("Du wurdest ausgeloggt.");
      router.replace("/app/savegames");
      router.refresh();
    } catch (error) {
      const details = logOnlineAuthError("logout", error);

      setDebugError(details);
      setFeedback(getOnlineAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (authState === "loading") {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
        Firebase Login wird geprüft...
      </div>
    );
  }

  if (onlineMode === "local") {
    return (
      <div
        ref={(node) => {
          panelRef.current = node;
        }}
        className={`rounded-lg border border-amber-200/25 bg-amber-300/10 text-sm text-amber-50 ${
          compact ? "p-4" : "p-5 sm:p-6"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
          Lokaler Testmodus
        </p>
        <p className="mt-2 font-semibold text-white">Firebase Login ist lokal deaktiviert.</p>
        <p className="mt-2 text-xs leading-5 text-amber-50/85">
          Staging und Produktion verwenden Email/Passwort-Login. Der lokale
          Online-Speicher bleibt nur fuer Tests ohne Firebase aktiv.
        </p>
      </div>
    );
  }

  if (authState === "authenticated" && user) {
    return (
      <div className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 p-4 text-sm text-emerald-50">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Eingeloggt
        </p>
        <p className="mt-2 font-semibold text-white">
          {user.displayName || user.username || user.userId}
        </p>
        <p className="mt-1 text-xs text-emerald-100/85">{user.email ?? "Firebase User"}</p>
        <p className="mt-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold">
          Rolle: {adminAccess.isAdmin ? "Admin + GM" : "GM"}
        </p>
        <p className="mt-2 text-xs leading-5 text-emerald-100/85">
          Online: verfügbar. Admin: {adminAccess.isAdmin ? "verfügbar" : "nicht verfügbar"}.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleLogout}
          className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Logout..." : "Logout"}
        </button>
        {feedback ? <p className="mt-2 text-xs font-semibold">{feedback}</p> : null}
        <FirebaseAuthDebugPanel error={debugError} />
      </div>
    );
  }

  return (
    <section
      ref={panelRef}
      className={`rounded-lg border border-white/10 bg-white/[0.045] ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Firebase Login
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {mode === "login" ? "Anmelden" : "Registrieren"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Online-Multiplayer nutzt ab jetzt echte Firebase Email/Passwort-Accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setFeedback(null);
          }}
          className="w-fit rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          {mode === "login" ? "Registrieren" : "Zum Login"}
        </button>
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="grid gap-1 text-sm font-semibold text-slate-200">
            Anzeigename
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white outline-none focus:border-emerald-200/60"
            />
          </label>
        ) : null}
        <label className="grid gap-1 text-sm font-semibold text-slate-200">
          Email
          <input
            ref={emailInputRef}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white outline-none focus:border-emerald-200/60"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-200">
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-3 text-white outline-none focus:border-emerald-200/60"
          />
        </label>
        <button
          type="submit"
          disabled={pending || email.trim().length === 0 || password.length === 0}
          className="w-fit rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending
            ? "Bitte warten..."
            : mode === "register"
              ? "Account erstellen"
              : "Einloggen"}
        </button>
      </form>

      {feedback ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100"
        >
          {feedback}
        </p>
      ) : null}
      <FirebaseAuthDebugPanel error={debugError} />
    </section>
  );
}

function FirebaseAuthDebugPanel({
  error,
}: {
  error: OnlineAuthErrorDetails | null;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-sky-200/25 bg-sky-300/10 p-3 text-xs text-sky-50">
      <p className="font-semibold text-white">Firebase Auth Debug</p>
      <dl className="mt-2 grid gap-1">
        <DebugRow label="error.code" value={error.code} />
        <DebugRow label="error.message" value={error.message} />
      </dl>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <dt className="font-semibold text-sky-100/80">{label}</dt>
      <dd className="break-words font-mono text-sky-50">{value}</dd>
    </div>
  );
}

export function OnlinePlayLink({ href = "/online" }: { href?: string }) {
  const onlineMode = getOnlineBackendMode();
  const [authState, setAuthState] = useState<"loading" | "anonymous" | "authenticated">(
    onlineMode === "local" ? "authenticated" : "loading",
  );

  useEffect(() => {
    if (onlineMode === "local") {
      setAuthState("authenticated");
      return undefined;
    }

    return subscribeToOnlineAuthState(
      (nextUser) => setAuthState(nextUser ? "authenticated" : "anonymous"),
      () => setAuthState("anonymous"),
    );
  }, [onlineMode]);

  if (authState === "authenticated") {
    return (
      <Link
        href={href}
        className="mt-5 flex min-h-14 w-full items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-5 py-3 text-center text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
      >
        Online spielen
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled
      className="mt-5 flex min-h-14 w-full cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-slate-300 opacity-70"
    >
      {authState === "loading" ? "Login wird geprüft..." : "Bitte erst einloggen"}
    </button>
  );
}
