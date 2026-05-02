import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";

export default function SaveGameNotFound() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <SectionCard
          title="Spielstand nicht verfuegbar"
          description="Der angefragte Spielstand konnte nicht geladen werden oder gehoert nicht zu deinem Account."
        >
          <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            Waehle einen vorhandenen Spielstand oder wechsle in den Online Hub, um eine Liga neu
            zu laden. Es wurden keine lokalen Daten veraendert.
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/app/savegames"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 font-semibold text-emerald-50 transition hover:bg-emerald-300/22"
              >
                Zu Savegames
              </Link>
              <Link
                href="/online"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/12 bg-white/6 px-4 py-2 font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Online Hub
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
