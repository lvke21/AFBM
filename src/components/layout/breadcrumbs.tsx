"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildBreadcrumbs, type AppShellContext } from "./navigation-model";

type BreadcrumbsProps = {
  context: AppShellContext;
};

export function Breadcrumbs({ context }: BreadcrumbsProps) {
  const pathname = usePathname();
  const items = buildBreadcrumbs(pathname, context);

  return (
    <nav aria-label="Breadcrumbs" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      {items.map((item, index) => {
        const last = index === items.length - 1;

        return (
          <span key={`${item.href}-${index}`} className="inline-flex items-center gap-2">
            {index > 0 ? <span className="text-slate-600">/</span> : null}
            {last ? (
              <span className="font-semibold text-slate-200">{item.label}</span>
            ) : (
              <Link href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
