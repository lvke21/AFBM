"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { isAdminUid } from "@/lib/admin/admin-uid-allowlist";
import { getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";

type AdminClaimState =
  | { status: "checking" }
  | { status: "allowed"; uid: string }
  | { status: "denied"; reason: string };

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const authState = useFirebaseAuthState();
  const [claimState, setClaimState] = useState<AdminClaimState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function checkAdminClaim() {
      if (authState.status === "loading") {
        setClaimState({ status: "checking" });
        return;
      }

      if (!authState.user) {
        setClaimState({
          status: "denied",
          reason: "Bitte melde dich zuerst mit Firebase an.",
        });
        return;
      }

      const firebaseUser = getOnlineFirebaseAuth().currentUser;

      if (!firebaseUser || firebaseUser.uid !== authState.user.uid) {
        setClaimState({ status: "checking" });
        return;
      }

      try {
        const token = await firebaseUser.getIdTokenResult(true);

        if (cancelled) {
          return;
        }

        if (token.claims.admin === true || isAdminUid(firebaseUser.uid)) {
          setClaimState({ status: "allowed", uid: firebaseUser.uid });
          return;
        }

        setClaimState({
          status: "denied",
          reason: "Dein Firebase-Account hat keine Adminrechte.",
        });
      } catch {
        if (!cancelled) {
          setClaimState({
            status: "denied",
            reason: "Adminrechte konnten nicht geprüft werden.",
          });
        }
      }
    }

    void checkAdminClaim();

    return () => {
      cancelled = true;
    };
  }, [authState.status, authState.user]);

  if (claimState.status === "allowed") {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-[#07111d] text-white">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <section className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            Adminzugang
          </p>
          <h1
            className="mt-3 text-4xl font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Firebase Adminrechte erforderlich
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {claimState.status === "checking" ? "Adminrechte werden geprüft..." : claimState.reason}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Nach dem Setzen eines neuen Custom Claims ist ein Token-Refresh nötig. Ein erneuter
            Login funktioniert ebenfalls.
          </p>
          <Link
            href="/app/savegames"
            className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
          >
            Zurück zum Hauptmenü
          </Link>
        </section>
      </div>
    </main>
  );
}
