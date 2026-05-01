"use client";

import Link from "next/link";

import { openSavegamesLogin } from "@/components/auth/auth-required-actions";
import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";

const ONLINE_LINK_CLASS =
  "rounded-lg border border-sky-200/20 bg-sky-300/8 p-5 text-left transition hover:border-sky-200/45 hover:bg-sky-300/12";

export function SavegamesOnlineLink() {
  const authState = useFirebaseAuthState();
  const isAuthenticated = authState.isAuthenticated;

  const content = (
    <>
      <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
            Online Hub
          </span>
          <span className="mt-1 block text-xl font-semibold text-white">Online Spielen</span>
        </span>
        <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {isAuthenticated ? "Bereit" : "Login erforderlich"}
        </span>
      </span>
      <span id="online-playing-hint" className="mt-3 block text-sm text-slate-300">
        {isAuthenticated
          ? "Öffne den Multiplayer-Einstieg fuer kommende Online-Ligen."
          : "Melde dich an, um zu spielen."}
      </span>
    </>
  );

  if (isAuthenticated) {
    return (
      <Link href="/online" className={ONLINE_LINK_CLASS} aria-describedby="online-playing-hint">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-disabled="true"
      className={`${ONLINE_LINK_CLASS} cursor-not-allowed opacity-65`}
      onClick={openSavegamesLogin}
    >
      {content}
    </button>
  );
}
