"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type FinanceSectionNavigationProps = {
  saveGameId: string;
};

const SECTIONS = [
  {
    label: "Overview",
    path: "",
    description: "Cap, Cash und Prioritaeten",
  },
  {
    label: "Contracts/Cap",
    path: "contracts",
    description: "Vertraege und Cap Hits",
  },
  {
    label: "Events",
    path: "events",
    description: "Cash- und Cap-Historie",
  },
  {
    label: "Free Agency",
    path: "free-agency",
    description: "Signings und Cap-Fit",
  },
  {
    label: "Trade Planning",
    path: "trades",
    description: "Sekundaere Trade-Folgen",
  },
];

function sectionHref(saveGameId: string, path: string) {
  const base = `/app/savegames/${saveGameId}/finance`;

  return path ? `${base}/${path}` : base;
}

export function FinanceSectionNavigation({ saveGameId }: FinanceSectionNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Finance sections" className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {SECTIONS.map((section) => {
          const href = sectionHref(saveGameId, section.path);
          const active = pathname === href;

          return (
            <Link
              key={section.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-lg border px-3 py-3 transition",
                active
                  ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-50"
                  : "border-transparent bg-black/10 text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold">{section.label}</span>
              <span className="mt-1 block text-xs text-slate-400">{section.description}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
