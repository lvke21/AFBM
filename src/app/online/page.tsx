import Link from "next/link";

import { OnlineContinueButton } from "@/components/online/online-continue-button";
import { OnlineLeagueSearch } from "@/components/online/online-league-search";
import { OnlineModeStatus } from "@/components/online/online-mode-status";
import { OnlineUserStatus } from "@/components/online/online-user-status";

function HubButton({
  children,
  disabled = false,
  href,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  href?: string;
}) {
  const className =
    "flex min-h-20 w-full items-center justify-center rounded-lg border px-6 py-5 text-center text-xl font-semibold transition";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} border-emerald-300/35 bg-emerald-300/10 text-emerald-50 hover:border-emerald-200/60 hover:bg-emerald-300/16`}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${className} border-white/10 bg-white/5 text-white disabled:cursor-not-allowed disabled:opacity-55`}
    >
      {children}
    </button>
  );
}

export default function OnlineHubPage() {
  return (
    <main className="min-h-screen bg-[#07111d] text-white">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%),radial-gradient(circle_at_top_left,rgba(61,220,151,0.14),transparent_30%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Multiplayer
              </p>
              <h1
                className="mt-2 text-5xl font-semibold text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Online Liga
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Du spielst nicht mehr allein. Jede Entscheidung beeinflusst nicht nur
                dein Team — sondern die Liga.
              </p>
              <OnlineModeStatus />
            </div>

            <OnlineUserStatus />
          </header>

          <section className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="grid gap-4">
                <OnlineContinueButton />
                <OnlineLeagueSearch />
                <HubButton href="/app/savegames">Zurück zum Hauptmenü</HubButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
