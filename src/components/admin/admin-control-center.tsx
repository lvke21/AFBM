"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminLeagueManager } from "@/components/admin/admin-league-manager";
import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { isAdminUid } from "@/lib/admin/admin-uid-allowlist";
import { getFirebaseClientConfig } from "@/lib/firebase/client";
import { getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";
import { getOnlineBackendMode } from "@/lib/online/online-league-repository-provider";
import type { OnlineLeague } from "@/lib/online/online-league-service";

type HighlightTarget = "create" | "leagues" | null;

function AdminActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-center text-lg font-semibold text-white transition hover:border-emerald-200/35 hover:bg-white/8 focus-visible:border-emerald-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/35"
    >
      {children}
    </button>
  );
}

function focusElement(id: string) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => element.focus({ preventScroll: true }), 250);
}

export function AdminControlCenter() {
  const router = useRouter();
  const authState = useFirebaseAuthState();
  const [selectedLeague, setSelectedLeague] = useState<OnlineLeague | null>(null);
  const [leagueCount, setLeagueCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [claimAdmin, setClaimAdmin] = useState<boolean | null>(null);
  const backendMode = getOnlineBackendMode();
  const uid = authState.user?.uid ?? null;
  const uidAllowlisted = isAdminUid(uid);

  const handleLeaguesChange = useCallback((nextLeagues: OnlineLeague[]) => {
    setLeagueCount(nextLeagues.length);
    setSelectedLeague((current) => {
      if (!current) {
        return null;
      }

      return nextLeagues.find((league) => league.id === current.id) ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function readAdminClaim() {
      if (!uid || backendMode !== "firebase") {
        setClaimAdmin(null);
        return;
      }

      try {
        const firebaseUser = getOnlineFirebaseAuth().currentUser;

        if (!firebaseUser || firebaseUser.uid !== uid) {
          setClaimAdmin(null);
          return;
        }

        const token = await firebaseUser.getIdTokenResult();

        if (!cancelled) {
          setClaimAdmin(token.claims.admin === true);
        }
      } catch {
        if (!cancelled) {
          setClaimAdmin(null);
        }
      }
    }

    void readAdminClaim();

    return () => {
      cancelled = true;
    };
  }, [backendMode, uid]);

  function flashHighlight(target: HighlightTarget) {
    setHighlightTarget(target);

    window.setTimeout(() => {
      setHighlightTarget((current) => (current === target ? null : current));
    }, 1800);
  }

  function handleManageLeagues() {
    setNotice(
      leagueCount > 0
        ? "Firebase Ligen ist markiert. Wähle eine Liga aus oder öffne sie direkt."
        : "Keine Ligen vorhanden. Du kannst zuerst eine neue Online-Liga erstellen.",
    );
    flashHighlight("leagues");
    focusElement("ligen-verwalten");
  }

  function handleCreateLeague() {
    setNotice("Neue Online-Liga ist markiert. Das Feld Liga Name ist bereit.");
    flashHighlight("create");
    focusElement("liga-erstellen");
    window.setTimeout(() => document.getElementById("admin-league-name-input")?.focus(), 320);
  }

  function handleSimulationAndWeek() {
    if (!selectedLeague) {
      setNotice("Wähle zuerst eine Liga aus.");
      flashHighlight("leagues");
      focusElement("ligen-verwalten");
      return;
    }

    router.push(`/admin/league/${selectedLeague.id}`);
  }

  function handleDebugTools() {
    setDebugVisible(true);
    setNotice("Debug Tools sind geöffnet.");
    window.setTimeout(() => focusElement("admin-debug-tools"), 0);
  }

  function handleSelectedLeagueChange(league: OnlineLeague) {
    setSelectedLeague(league);
    setNotice(`${league.name} ist für Simulation & Woche ausgewählt.`);
  }

  return (
    <AdminAuthGate>
      <main className="min-h-screen bg-[#07111d] text-white">
        <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%),radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_32%)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col">
            <header className="pt-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                Adminmodus
              </p>
              <h1
                className="mt-3 text-5xl font-semibold text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Admin Control Center
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Du steuerst die Liga. Jede Entscheidung beeinflusst alle Spieler.
              </p>
            </header>

            <section className="py-10">
              <div className="mx-auto w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
                <div className="grid gap-4">
                  <AdminActionButton onClick={handleManageLeagues}>
                    Ligen verwalten
                  </AdminActionButton>
                  <AdminActionButton onClick={handleCreateLeague}>
                    Liga erstellen
                  </AdminActionButton>
                  <AdminActionButton onClick={handleSimulationAndWeek}>
                    Simulation & Woche
                  </AdminActionButton>
                  <AdminActionButton onClick={handleDebugTools}>Debug Tools</AdminActionButton>
                  <Link
                    href="/"
                    className="flex min-h-16 w-full items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-6 py-4 text-center text-lg font-semibold text-emerald-50 transition hover:border-emerald-200/60 hover:bg-emerald-300/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/35"
                  >
                    Zurück zum Hauptmenü
                  </Link>
                </div>

                {notice ? (
                  <div className="mt-4 rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50">
                    {notice}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="pb-12">
              <AdminLeagueManager
                highlightedSection={highlightTarget}
                selectedLeagueId={selectedLeague?.id ?? null}
                onLeaguesChange={handleLeaguesChange}
                onSelectedLeagueChange={handleSelectedLeagueChange}
              />

              {debugVisible ? (
                <AdminDebugPanel
                  backendMode={backendMode}
                  claimAdmin={claimAdmin}
                  uid={uid}
                  uidAllowlisted={uidAllowlisted}
                />
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </AdminAuthGate>
  );
}

function AdminDebugPanel({
  backendMode,
  claimAdmin,
  uid,
  uidAllowlisted,
}: {
  backendMode: string;
  claimAdmin: boolean | null;
  uid: string | null;
  uidAllowlisted: boolean;
}) {
  const firebaseProjectId = readFirebaseProjectId();
  const adminLabel =
    claimAdmin === true
      ? "Admin via Custom Claim"
      : uidAllowlisted
        ? "Admin via UID-Allowlist"
        : "Kein Adminstatus erkannt";

  return (
    <section
      id="admin-debug-tools"
      tabIndex={-1}
      className="mt-6 rounded-lg border border-sky-200/20 bg-sky-300/5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-sky-200/35"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
        Debug Tools
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Admin Debug Snapshot</h2>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <DebugItem label="Aktuelle User UID" value={uid ?? "Nicht angemeldet"} />
        <DebugItem label="Adminstatus" value={adminLabel} />
        <DebugItem label="Claim admin" value={claimAdmin === null ? "Unbekannt" : String(claimAdmin)} />
        <DebugItem label="UID-Allowlist" value={String(uidAllowlisted)} />
        <DebugItem label="Backend-Modus" value={backendMode} />
        <DebugItem label="Firebase Projekt" value={firebaseProjectId} />
        <DebugItem label="Deploy Env" value={process.env.NEXT_PUBLIC_AFBM_DEPLOY_ENV ?? "Nicht gesetzt"} />
        <DebugItem label="Build Env" value={process.env.NODE_ENV} />
      </dl>
    </section>
  );
}

function readFirebaseProjectId() {
  try {
    return getFirebaseClientConfig().projectId || "Nicht gesetzt";
  } catch {
    return "Nicht gesetzt";
  }
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 break-words font-mono text-sm text-slate-100">{value}</dd>
    </div>
  );
}
