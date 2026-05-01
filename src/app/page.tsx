import Link from "next/link";

import {
  FirebaseEmailAuthPanel,
  OnlinePlayLink,
} from "@/components/auth/firebase-email-auth-panel";
import { MinimalMatchResultDemo } from "@/components/match/minimal-match-result-demo";

export default function LandingPage() {
  return (
    <main className="app-shell grid-stripes">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-12 lg:px-10">
        <header className="mb-16 flex items-center justify-between">
          <div>
            <p className="eyebrow">AFBM Manager</p>
            <h1
              className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-white md:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Wartbares Fundament fuer ein American-Football-Manager-Spiel.
            </h1>
          </div>
          <Link
            href="/app/savegames"
            className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
          >
            Zum Savegame-Hub
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="glass-panel rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">
              Zielbild
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-100">
              UI, Game-Logik und Persistenz sind bewusst getrennt. Statische
              Referenzdaten wie Ligen, Divisionen, Franchises und Positionen
              liegen getrennt vom dynamischen Savegame-Zustand fuer Teams,
              Spieler, Vertrage, Saisons, Matches und Statistiken.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Frontend</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  Next.js App Router
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Domain</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  Services & Module
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Persistenz</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  Prisma + PostgreSQL
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">
              Online Zugang
            </p>
            <div className="mt-6">
              <FirebaseEmailAuthPanel compact />
            </div>
            <OnlinePlayLink />
          </div>

          <MinimalMatchResultDemo />
        </section>
      </div>
    </main>
  );
}
