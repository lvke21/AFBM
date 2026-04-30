"use client";

import { useEffect, useMemo, useState } from "react";

import {
  OnlineAccountLinkingError,
  secureCurrentOnlineAccount,
} from "@/lib/online/auth/account-linking";
import { updateCurrentAuthenticatedOnlineUsername } from "@/lib/online/auth/online-auth";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { ensureCurrentOnlineUser } from "@/lib/online/online-user-service";
import type { OnlineAuthenticatedUser } from "@/lib/online/types";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";

function accountLinkingFeedbackMessage(error: unknown) {
  if (error instanceof OnlineAccountLinkingError) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "OnlineAccountLinkingError" &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Account konnte nicht gesichert werden. Deine Liga-Daten bleiben unveraendert.";
}

export function OnlineUserStatus() {
  const [user, setUser] = useState<OnlineAuthenticatedUser | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [accountFeedbackTone, setAccountFeedbackTone] = useState<"error" | "success">("success");
  const [isSecuringAccount, setIsSecuringAccount] = useState(false);
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const modeStatus = getOnlineModeStatusCopy(repository.mode);

  useEffect(() => {
    let active = true;

    repository
      .getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
          setUsernameInput(currentUser.username);
        }
      })
      .catch(() => {
        if (active) {
          const fallbackUser = ensureCurrentOnlineUser();

          setUser({
            ...fallbackUser,
            displayName: fallbackUser.username,
            isAnonymous: true,
          });
          setUsernameInput(fallbackUser.username);
        }
      });

    return () => {
      active = false;
    };
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
    } catch {
      setFeedback("Anzeigename konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSecureAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSecuringAccount) {
      return;
    }

    setIsSecuringAccount(true);
    setAccountFeedback(null);

    try {
      const previousUid = user?.userId;
      const result = await secureCurrentOnlineAccount({
        email: accountEmail,
        password: accountPassword,
        displayName: usernameInput,
        mode: repository.mode,
      });

      setUser({
        userId: result.userId,
        username: result.displayName,
        displayName: result.displayName,
        isAnonymous: result.isAnonymous,
      });
      setUsernameInput(result.displayName);
      setAccountPassword("");
      setAccountFeedbackTone("success");
      setAccountFeedback(
        result.uidPreserved && previousUid === result.userId
          ? "Account gesichert. Deine Online-Liga bleibt mit derselben UID verbunden."
          : "Account gesichert.",
      );
    } catch (error) {
      setAccountFeedbackTone("error");
      setAccountFeedback(accountLinkingFeedbackMessage(error));
    } finally {
      setIsSecuringAccount(false);
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
      {user ? (
        <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 sm:w-72">
          <p className="font-semibold text-white">{user.username}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">{user.userId}</p>
          <p className="mt-1 text-xs font-semibold text-slate-300">
            {repository.mode === "firebase"
              ? user.isAnonymous
                ? "Temporärer Firebase-Account"
                : "Gesicherter Firebase-Account"
              : "Lokaler Test-Account"}
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
            <button
              type="button"
              disabled={isSaving || usernameInput.trim().length === 0}
              onClick={handleSaveUsername}
              className="w-fit rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSaving ? "Speichert..." : "Name speichern"}
            </button>
            {feedback ? (
              <p className="text-xs font-semibold text-slate-300">{feedback}</p>
            ) : null}
          </div>
          <form
            className="mt-4 grid gap-2 border-t border-white/10 pt-4"
            onSubmit={handleSecureAccount}
          >
            <div>
              <p className="text-sm font-semibold text-white">Account sichern</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Fuege Email und Passwort hinzu, ohne deine Firebase UID zu wechseln.
                Memberships, Teams und Ligen bleiben verbunden.
              </p>
            </div>
            {repository.mode === "firebase" && user.isAnonymous ? (
              <>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={accountEmail}
                    onChange={(event) => {
                      setAccountEmail(event.target.value);
                      setAccountFeedback(null);
                    }}
                    className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-200/60"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  Passwort
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={accountPassword}
                    onChange={(event) => {
                      setAccountPassword(event.target.value);
                      setAccountFeedback(null);
                    }}
                    className="rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-200/60"
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    isSecuringAccount ||
                    accountEmail.trim().length === 0 ||
                    accountPassword.length === 0
                  }
                  className="w-fit rounded-lg border border-sky-200/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isSecuringAccount ? "Sichert..." : "Account sichern"}
                </button>
              </>
            ) : (
              <p className="text-xs leading-5 text-slate-300">
                {repository.mode === "firebase"
                  ? "Dieser Account ist bereits mit einem dauerhaften Login verbunden."
                  : "Im lokalen Testmodus werden keine Firebase-Logins verknuepft."}
              </p>
            )}
            {accountFeedback ? (
              <p
                className={`text-xs font-semibold ${
                  accountFeedbackTone === "success" ? "text-emerald-200" : "text-rose-200"
                }`}
              >
                {accountFeedback}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
