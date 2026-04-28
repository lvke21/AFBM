import Link from "next/link";
import type { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="glass-panel mb-8 flex flex-col gap-4 rounded-lg px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="eyebrow">
              AFBM Manager
            </Link>
            <h1
              className="mt-4 text-3xl font-semibold tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Savegames, Teams und Saisonverwaltung
            </h1>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm text-slate-200">
            <Link
              href="/app"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              Dashboard
            </Link>
            <Link
              href="/app/savegames"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              Savegames
            </Link>
            <Link
              href="/docs/architecture"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              Architektur
            </Link>
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
