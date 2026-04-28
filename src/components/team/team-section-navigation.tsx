"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TeamSectionNavigationProps = {
  saveGameId: string;
  teamId: string;
};

const SECTIONS = [
  {
    group: "Analysis/Secondary",
    label: "Overview",
    path: "",
    description: "Status und Prioritaeten",
  },
  {
    group: "Core Actions",
    label: "Roster",
    path: "roster",
    description: "Kader und Spieleraktionen",
  },
  {
    group: "Core Actions",
    label: "Depth Chart",
    path: "depth-chart",
    description: "Starter und Rollen",
  },
  {
    group: "Core Actions",
    label: "Contracts",
    path: "contracts",
    description: "Bindung und Cap Hit",
  },
  {
    group: "Team Management",
    label: "Trade Board",
    path: "trades",
    description: "Planung, Board und Targets",
  },
  {
    group: "Analysis/Secondary",
    label: "Chemistry",
    path: "chemistry",
    description: "Zusammenhalt",
  },
  {
    group: "Analysis/Secondary",
    label: "X-Factor",
    path: "x-factor",
    description: "Star-Effekte",
  },
  {
    group: "Team Management",
    label: "Schemes",
    path: "schemes",
    description: "Identity und Fit",
  },
  {
    group: "Team Management",
    label: "Gameplan",
    path: "gameplan",
    description: "Strategie und Tendenzen",
  },
] as const;

const SECTION_GROUPS = [
  {
    description: "Direkte Manager-Entscheidungen",
    label: "Core Actions",
  },
  {
    description: "Planung und Team-Setup",
    label: "Team Management",
  },
  {
    description: "Kontext und Sekundaersysteme",
    label: "Analysis/Secondary",
  },
] as const;

function sectionHref(saveGameId: string, path: string) {
  const base = `/app/savegames/${saveGameId}/team`;

  return path ? `${base}/${path}` : base;
}

export function TeamSectionNavigation({ saveGameId, teamId }: TeamSectionNavigationProps) {
  const pathname = usePathname();
  void teamId;

  return (
    <nav aria-label="Team sections" className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
        {SECTION_GROUPS.map((group) => {
          const sections = SECTIONS.filter((section) => section.group === group.label);

          return (
            <section
              key={group.label}
              className="rounded-lg border border-white/10 bg-black/10 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {group.label}
              </p>
              <p className="mt-1 text-xs text-slate-400">{group.description}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {sections.map((section) => {
                  const href = sectionHref(saveGameId, section.path);
                  const active = pathname === href;
                  const primary = group.label === "Core Actions";

                  return (
                    <Link
                      key={section.label}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      data-onboarding-key={
                        section.label === "Roster"
                          ? "roster"
                          : section.label === "Depth Chart"
                            ? "depth-chart"
                            : undefined
                      }
                      className={[
                        "rounded-lg border px-3 py-3 transition",
                        primary ? "min-h-16" : "min-h-14",
                        active
                          ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-50"
                          : primary
                            ? "border-white/10 bg-white/5 text-slate-100 hover:border-sky-300/30 hover:bg-sky-300/10 hover:text-white"
                            : "border-transparent bg-black/10 text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-semibold">{section.label}</span>
                      <span className="mt-1 block text-xs text-slate-400">{section.description}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
