"use client";

import { usePathname } from "next/navigation";

import { pageTitleForPath, type AppShellContext } from "./navigation-model";
import { PageHeader } from "./page-header";

type RoutePageHeaderProps = {
  context: AppShellContext;
};

export function RoutePageHeader({ context }: RoutePageHeaderProps) {
  const pathname = usePathname();
  const title = pageTitleForPath(pathname, context);
  const subtitle = context.saveGame
    ? `${context.saveGame.name} · ${context.saveGame.leagueName}`
    : "Savegame auswaehlen oder neuen Spielstand anlegen.";

  return <PageHeader title={title} subtitle={subtitle} />;
}
