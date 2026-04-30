import Link from "next/link";
import type { ReactNode } from "react";

import { AdminLeagueManager } from "@/components/admin/admin-league-manager";
import { requireAdminSession } from "@/lib/admin/admin-session";

function AdminActionLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="flex min-h-16 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-center text-lg font-semibold text-white transition hover:border-emerald-200/35 hover:bg-white/8"
    >
      {children}
    </a>
  );
}

export default async function AdminHubPage() {
  await requireAdminSession("/admin");

  return (
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
                <AdminActionLink href="#ligen-verwalten">Ligen verwalten</AdminActionLink>
                <AdminActionLink href="#liga-erstellen">Liga erstellen</AdminActionLink>
                <AdminActionLink href="#ligen-verwalten">Simulation & Woche</AdminActionLink>
                <AdminActionLink href="#debug-tools">Debug Tools</AdminActionLink>
                <Link
                  href="/app/savegames"
                  className="flex min-h-16 w-full items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-6 py-4 text-center text-lg font-semibold text-emerald-50 transition hover:border-emerald-200/60 hover:bg-emerald-300/16"
                >
                  Zurück zum Hauptmenü
                </Link>
              </div>
            </div>
          </section>

          <section className="pb-12">
            <AdminLeagueManager />
          </section>
        </div>
      </div>
    </main>
  );
}
