"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  buildNavigationItems,
  isNavigationItemActive,
  type AppShellContext,
} from "./navigation-model";

type SidebarNavigationProps = {
  context: AppShellContext;
};

const sectionLabels = ["Core Actions", "Team Management", "Analysis/Secondary"] as const;
const noContextLabels = new Set(["Dashboard"]);

function getVisibleItems(context: AppShellContext) {
  const items = buildNavigationItems(context);

  if (!context.saveGame && !context.online) {
    return items.filter((item) => noContextLabels.has(item.label));
  }

  return items;
}

function getContextNotice(context: AppShellContext) {
  if (!context.saveGame && !context.online) {
    return {
      message: "Kein aktiver Spielstand oder Online-Liga geladen.",
      primaryHref: "/app/savegames",
      primaryLabel: "Savegames",
      secondaryHref: "/online",
      secondaryLabel: "Onlinebereich",
    };
  }

  if (context.online && !context.online.teamNavigationReady) {
    return {
      message: "Die Online-Liga ist geladen, aber fuer diesen User ist noch kein Team verbunden.",
      primaryHref: "/online",
      primaryLabel: "Onlinebereich",
      secondaryHref: "/app/savegames",
      secondaryLabel: "Savegames",
    };
  }

  if (context.saveGame && !context.managerTeam) {
    return {
      message: "Kein Manager-Team fuer diesen Spielstand geladen.",
      primaryHref: "/app/savegames",
      primaryLabel: "Savegames",
      secondaryHref: "/online",
      secondaryLabel: "Onlinebereich",
    };
  }

  return null;
}

export function SidebarNavigation({ context }: SidebarNavigationProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const items = getVisibleItems(context);
  const contextNotice = getContextNotice(context);
  const targetKeyByLabel: Record<string, string> = {
    Spielablauf: "game-start",
    Inbox: "inbox",
    Roster: "roster",
    "Depth Chart": "depth-chart",
  };

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <nav aria-label="Manager-Navigation" className="space-y-6">
      {contextNotice ? (
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-50">
          <p className="leading-5">{contextNotice.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={contextNotice.primaryHref}
              className="rounded-md border border-amber-200/30 bg-amber-200/15 px-2.5 py-1.5 font-semibold text-amber-50 transition hover:bg-amber-200/25"
            >
              {contextNotice.primaryLabel}
            </Link>
            <Link
              href={contextNotice.secondaryHref}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-semibold text-slate-100 transition hover:bg-white/10"
            >
              {contextNotice.secondaryLabel}
            </Link>
          </div>
        </div>
      ) : null}
      {sectionLabels.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);

        if (sectionItems.length === 0) {
          return null;
        }

        return (
          <div key={section}>
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section}
            </p>
            <div className={section === "Core Actions" ? "mt-2 space-y-2" : "mt-2 space-y-1"}>
              {sectionItems.map((item) => {
                const active = isNavigationItemActive(item, pathname, hash);
                const primary = section === "Core Actions";
                const className = [
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-semibold transition",
                  primary ? "min-h-12 text-sm" : "min-h-10 text-sm",
                  active
                    ? "border border-emerald-400/35 bg-emerald-400/12 text-emerald-100"
                    : primary
                      ? "border border-white/10 bg-white/5 text-slate-100 hover:border-sky-300/30 hover:bg-sky-300/10 hover:text-white"
                      : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/6 hover:text-white",
                  item.href ? "" : "cursor-not-allowed opacity-45 hover:border-transparent hover:bg-transparent",
                ].join(" ");

                if (!item.href) {
                  return (
                    <span
                      key={item.label}
                      className={className}
                      title={item.disabledReason}
                      aria-disabled="true"
                    >
                      <span>{item.label}</span>
                      {item.disabledReason ? (
                        <span className="max-w-28 text-right text-[0.68rem] font-medium leading-4 text-slate-400">
                          {item.disabledReason}
                        </span>
                      ) : null}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={className}
                    aria-current={active ? "page" : undefined}
                    data-onboarding-key={targetKeyByLabel[item.label]}
                  >
                    <span>{item.label}</span>
                    {active ? <span className="h-2 w-2 rounded-full bg-emerald-300" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
