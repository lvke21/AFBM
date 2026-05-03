"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getOnlineAuthErrorMessage,
  signOutOnlineUser,
  subscribeToOnlineAuthState,
  updateCurrentAuthenticatedOnlineUsername,
} from "@/lib/online/auth/online-auth";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { ensureCurrentOnlineUser } from "@/lib/online/online-user-service";
import type { OnlineAuthenticatedUser } from "@/lib/online/types";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";

export function OnlineUserStatus() {
  const router = useRouter();
  const [user, setUser] = useState<OnlineAuthenticatedUser | null>(null);
  const [userLoadState, setUserLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const modeStatus = getOnlineModeStatusCopy(repository.mode);

  useEffect(() => {
    if (repository.mode === "local") {
      const fallbackUser = ensureCurrentOnlineUser();

      setUser({
        ...fallbackUser,
        displayName: fallbackUser.username,
      });
      setUsernameInput(fallbackUser.username);
      setUserLoadState("ready");
      return undefined;
    }

    setUserLoadState("loading");
    setUserLoadError(null);

    return subscribeToOnlineAuthState(
      (currentUser) => {
        if (!currentUser) {
          setUser(null);
          setUsernameInput("");
          setUserLoadState("error");
          setUserLoadError("Bitte melde dich mit Email und Passwort an.");
          return;
        }

        setUser(currentUser);
        setUsernameInput(currentUser.username);
        setUserLoadState("ready");
        setUserLoadError(null);
      },
      (error) => {
        setUser(null);
        setUserLoadState("error");
        setUserLoadError(getOnlineAuthErrorMessage(error));
      },
    );
  }, [repository]);

  async function handleSaveUsername() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const updatedUser = await updateCurrentAuthenticatedOnlineUsername(
        usernameInput,
        repository.mode,
      );

      setUser(updatedUser);
      setUsernameInput(updatedUser.username);
      setFeedback("Anzeigename gespeichert.");
    } catch (error) {
      setFeedback(getOnlineAuthErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    if (repository.mode !== "firebase" || isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setFeedback(null);

    try {
      await signOutOnlineUser();
      setUser(null);
      setUserLoadState("error");
      setUserLoadError("Bitte melde dich mit Email und Passwort an.");
      router.replace("/app/savegames");
      router.refresh();
    } catch (error) {
      setFeedback(getOnlineAuthErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="grid gap-2 sm:justify-items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            repository.mode === "firebase"
              ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
              : "border-amber-200/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          {modeStatus.syncBadge}
        </span>
        <span className="w-fit rounded-full border border-sky-200/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
          {modeStatus.roleBadge}
        </span>
      </div>
      {userLoadState === "loading" ? (
        <div
          aria-live="polite"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 sm:w-72"
        >
          Login wird geprüft...
        </div>
      ) : null}
      {userLoadState === "error" ? (
        <div
          aria-live="polite"
          className="w-full rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100 sm:w-72"
        >
          <p className="font-semibold text-white">Nicht eingeloggt</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/85">
            {userLoadError ?? "Bitte melde dich an."}
          </p>
        </div>
      ) : null}
      {userLoadState === "ready" && user ? (
        <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 sm:w-72">
          <p className="font-semibold text-white">{user.username}</p>
          <p className="mt-1 text-xs text-slate-300">{user.email ?? "Lokaler Testmodus"}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">{user.userId}</p>
          <p className="mt-1 text-xs font-semibold text-slate-300">
            {repository.mode === "firebase" ? "Firebase Email/Passwort" : "Lokaler Testmodus"}
          </p>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-300">
              Anzeigename
              <input
                value={usernameInput}
                onChange={(event) => {
                  setUsernameInput(event.target.value);
                  setFeedback(null);
                }}
                className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-200/60"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSaving || usernameInput.trim().length === 0}
                onClick={handleSaveUsername}
                className="w-fit rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSaving ? "Speichert..." : "Name speichern"}
              </button>
              {repository.mode === "firebase" ? (
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="w-fit rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoggingOut ? "Logout..." : "Logout"}
                </button>
              ) : null}
            </div>
            {feedback ? (
              <p className="text-xs font-semibold text-slate-300">{feedback}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
