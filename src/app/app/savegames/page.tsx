import Link from "next/link";

import { FirebaseEmailAuthPanel } from "@/components/auth/firebase-email-auth-panel";
import { SavegamesAuthStateStatus } from "@/components/auth/savegames-auth-state-status";
import { AppShell } from "@/components/layout/app-shell";
import { SavegamesListSection } from "@/components/savegames/savegames-list-section";
import { SavegamesOnlineLink } from "@/components/savegames/savegames-online-link";
import { CreateSaveGameForm } from "@/components/ui/create-savegame-form";
import { getOfflineSaveGameCreateAvailability } from "@/modules/savegames/application/savegame-command.service";

export const dynamic = "force-dynamic";

export default async function SaveGamesPage() {
  const offlineCreateAvailability = getOfflineSaveGameCreateAvailability();

  return (
    <AppShell>
      <SavegamesAuthStateStatus />
      <div className="space-y-8">
        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#07111d] shadow-2xl shadow-black/30">
          <div className="grid min-h-[620px] lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="absolute inset-0 grid-stripes opacity-35" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(61,220,151,0.2),transparent_32%),linear-gradient(180deg,rgba(7,17,29,0.1),rgba(7,17,29,0.96))]" />
              <div className="relative">
                <span className="eyebrow">AFBM Manager Hub</span>
                <h1
                  className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] text-white sm:text-6xl lg:text-7xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Das hier ist kein Spielstand.
                  <span className="block text-emerald-300">Das ist dein Vermächtnis.</span>
                </h1>
                <div className="mt-8 max-w-2xl space-y-5 text-base leading-7 text-slate-200 sm:text-lg">
                  <p>
                    Du übernimmst kein fertiges Team. Du übernimmst Entscheidungen,
                    die alles verändern.
                  </p>
                  <p>
                    Jeder Trade, den du machst. Jeder Spieler, dem du vertraust.
                    Jeder Fehler, den du dir erlaubst — oder eben nicht.
                  </p>
                  <p>
                    Hier gibt es keine zweite Stimme. Keinen Coach, der dich rettet.
                    Keine Ausreden.
                  </p>
                  <p className="text-2xl font-semibold text-white">Nur dich.</p>
                  <p>Und das, was am Ende dabei rauskommt.</p>
                  <p>
                    Wirst du eine Dynastie aufbauen? Oder wirst du untergehen, bevor
                    überhaupt jemand deinen Namen kennt?
                  </p>
                  <p className="font-semibold text-emerald-200">
                    Drück weiter. Und leb mit den Konsequenzen.
                  </p>
                </div>
              </div>

              <div className="relative mt-10 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    Fokus
                  </p>
                  <p className="mt-2 font-semibold text-white">Roster, Trades, Week Loop</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    Einstieg
                  </p>
                  <p className="mt-2 font-semibold text-white">Offline sofort spielbar</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    Konsequenz
                  </p>
                  <p className="mt-2 font-semibold text-white">Jede Entscheidung bleibt</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.035] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Spielmodus
                </p>
                <h2
                  className="mt-3 text-3xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Wähle deinen Einstieg
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Offline Spielen ist aktuell der direkte Weg in deine Franchise.
                  Online und Adminmodus sind als eigene Bereiche vorbereitet.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-lg border border-emerald-300/35 bg-emerald-300/10 p-5 shadow-xl shadow-emerald-950/20">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                        {offlineCreateAvailability.enabled ? "Verfügbar" : "Firestore-Modus"}
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Offline Spielen</h3>
                    </div>
                    <span className="w-fit rounded-full border border-emerald-200/30 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {offlineCreateAvailability.enabled ? "Sofort starten" : "Erstellung pausiert"}
                    </span>
                  </div>
                  <CreateSaveGameForm
                    requiresFirebaseAuth
                    disabled={!offlineCreateAvailability.enabled}
                    disabledReason={offlineCreateAvailability.reason}
                  />
                </div>

                <div className="rounded-lg border border-sky-200/20 bg-sky-300/8 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                    Online Zugang
                  </p>
                  <div className="mt-4">
                    <FirebaseEmailAuthPanel compact />
                  </div>
                </div>

                <SavegamesOnlineLink />

                <Link
                  href="/admin"
                  className="rounded-lg border border-amber-200/20 bg-amber-300/8 p-5 text-left transition hover:border-amber-200/45 hover:bg-amber-300/12"
                  aria-describedby="admin-mode-hint"
                >
                  <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                        Admin Hub
                      </span>
                      <span className="mt-1 block text-xl font-semibold text-white">
                        Adminmodus
                      </span>
                    </span>
                    <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                      Tools
                    </span>
                  </span>
                  <span id="admin-mode-hint" className="mt-3 block text-sm text-slate-300">
                    Öffne zentrale Werkzeuge fuer Liga-Verwaltung, Simulation und Debug.
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SavegamesListSection />
      </div>
    </AppShell>
  );
}
