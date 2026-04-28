"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  buildNavigationItems,
  isNavigationItemActive,
  type AppShellContext,
} from "./navigation-model";

type SidebarNavigationProps = {
  context: AppShellContext;
};

const sectionLabels = ["Core Actions", "Team Management", "Analysis/Secondary"] as const;

export function SidebarNavigation({ context }: SidebarNavigationProps) {
  const pathname = usePathname();
  const items = buildNavigationItems(context);
  const targetKeyByLabel: Record<string, string> = {
    "Game Flow": "game-start",
    Inbox: "inbox",
    Roster: "roster",
    "Depth Chart": "depth-chart",
  };

  return (
    <nav aria-label="GM Navigation" className="space-y-6">
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
                const active = isNavigationItemActive(item, pathname);
                const primary = section === "Core Actions";
                const className = [
                  "flex items-center justify-between rounded-lg px-3 py-2 font-semibold transition",
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
                    <span key={item.label} className={className} title={item.disabledReason}>
                      {item.label}
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
