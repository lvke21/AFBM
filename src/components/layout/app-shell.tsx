import type { ReactNode } from "react";

import { GlobalActionFeedback } from "@/components/feedback/global-action-feedback";
import { OnboardingCoach } from "@/components/onboarding/onboarding-coach";

import { Breadcrumbs } from "./breadcrumbs";
import type { AppShellContext } from "./navigation-model";
import { RoutePageHeader } from "./route-page-header";
import { SidebarNavigation } from "./sidebar-navigation";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: ReactNode;
  context?: AppShellContext;
};

const EMPTY_CONTEXT: AppShellContext = {
  saveGame: null,
  currentSeason: null,
  managerTeam: null,
};

export function AppShell({ children, context = EMPTY_CONTEXT }: AppShellProps) {
  return (
    <div className="app-shell min-h-screen">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="glass-panel border-x-0 border-t-0 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-t">
          <div className="px-4 py-5 lg:px-5">
            <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Manager-Konsole
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {context.managerTeam?.name ?? "Franchise Hub"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {context.saveGame?.name ?? "Savegame-Kontext wird im Hub gewaehlt"}
              </p>
            </div>
            <SidebarNavigation context={context} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <TopBar context={context} />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-5">
              <Breadcrumbs context={context} />
            </div>
            <div className="mb-8">
              <RoutePageHeader context={context} />
            </div>
            <GlobalActionFeedback />
            {children}
          </main>
          {context.online ? null : <OnboardingCoach context={context} />}
        </div>
      </div>
    </div>
  );
}
