import { FirebaseEmailAuthPanel } from "@/components/auth/firebase-email-auth-panel";
import { AppShell } from "@/components/layout/app-shell";
import { SavegamesAdminLink } from "@/components/savegames/savegames-admin-link";
import { SavegamesListSection } from "@/components/savegames/savegames-list-section";
import { SavegamesOnlineLink } from "@/components/savegames/savegames-online-link";
import { CreateSaveGameForm } from "@/components/ui/create-savegame-form";
import { getOfflineSaveGameCreateAvailability } from "@/modules/savegames/application/savegame-command.service";

export const dynamic = "force-dynamic";

export default async function SaveGamesPage() {
  const offlineCreateAvailability = getOfflineSaveGameCreateAvailability();
  const offlineDisabledMessage =
    "Neue Offline-Karrieren sind in dieser Umgebung gerade pausiert. Du kannst vorhandene Franchises fortsetzen oder online spielen.";

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-lg border border-white/10 bg-[#07111d] p-6 shadow-2xl shadow-black/25 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_21rem] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                AFBM Manager Hub
              </p>
              <h1
                className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Was möchtest du als Nächstes tun?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Setze deine Karriere fort, starte eine neue Franchise oder geh direkt in den
                Multiplayer. Dein Account-Status steht rechts, alle Aktionen sind darunter klar
                getrennt.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Account
              </p>
              <FirebaseEmailAuthPanel compact />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <a
              href="#franchises"
              className="rounded-lg border border-emerald-300/35 bg-emerald-300/12 p-5 text-left transition hover:border-emerald-200/60 hover:bg-emerald-300/18"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Weiter
              </span>
              <span className="mt-2 block text-2xl font-semibold text-white">Fortsetzen</span>
              <span className="mt-2 block text-sm leading-6 text-emerald-50/85">
                Springe zu deiner letzten oder vorhandenen Franchise.
              </span>
            </a>
            <a
              href="#new-career"
              className="rounded-lg border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/20 hover:bg-white/8"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Offline
              </span>
              <span className="mt-2 block text-2xl font-semibold text-white">
                Neue Karriere starten
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-300">
                Erstelle eine Franchise mit Dynasty-Name und User-Team.
              </span>
            </a>
            <SavegamesOnlineLink />
          </div>
        </section>

        <section
          id="new-career"
          className="scroll-mt-6 rounded-lg border border-white/10 bg-white/[0.035] p-6"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Neues Spiel
              </p>
              <h2
                className="mt-2 text-3xl font-semibold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Neue Karriere starten
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Eine Offline-Karriere gehoert zu deinem Account. Waehle Namen und Team, dann
                startet dein Franchise Hub.
              </p>
            </div>
            <span
              className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                offlineCreateAvailability.enabled
                  ? "border-emerald-200/30 text-emerald-100"
                  : "border-amber-200/30 text-amber-100"
              }`}
            >
              {offlineCreateAvailability.enabled ? "Verfügbar" : "Aktuell pausiert"}
            </span>
          </div>
          <CreateSaveGameForm
            requiresFirebaseAuth
            disabled={!offlineCreateAvailability.enabled}
            disabledReason={
              offlineCreateAvailability.enabled ? null : offlineDisabledMessage
            }
          />
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            Admin
          </p>
          <div className="mt-3">
            <SavegamesAdminLink />
          </div>
        </section>

        <SavegamesListSection />
      </div>
    </AppShell>
  );
}
