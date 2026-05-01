export type AppShellContext = {
  saveGame: {
    id: string;
    name: string;
    leagueName: string;
  } | null;
  baseHref?: string | null;
  currentSeason: {
    id: string;
    year: number;
    phase: string;
    week: number;
  } | null;
  managerTeam: {
    id: string;
    name: string;
    abbreviation: string;
    currentRecord: string;
  } | null;
  nextGameHref?: string | null;
};

export type NavigationItem = {
  label: string;
  href: string | null;
  activePatterns: string[];
  excludePatterns?: string[];
  section: "Core Actions" | "Team Management" | "Analysis/Secondary";
  disabledReason?: string;
};

export type BreadcrumbItem = {
  label: string;
  href: string;
};

function saveGameBase(context: AppShellContext) {
  if (context.baseHref) {
    return context.baseHref;
  }

  return context.saveGame ? `/app/savegames/${context.saveGame.id}` : null;
}

export function buildNavigationItems(context: AppShellContext): NavigationItem[] {
  const base = saveGameBase(context);
  const teamHref = base && context.managerTeam ? `${base}/team` : null;
  const rosterHref = teamHref ? `${teamHref}/roster` : null;
  const depthChartHref = teamHref ? `${teamHref}/depth-chart` : null;
  const contractsHref = teamHref ? `${teamHref}/contracts` : null;
  const tradeBoardHref = teamHref ? `${teamHref}/trades` : null;
  const financeHref = base && context.managerTeam ? `${base}/finance` : null;
  const seasonHref = base && context.currentSeason ? `${base}/league` : null;
  const developmentHref = base ? `${base}/development` : null;
  const draftHref = base ? `${base}/draft` : null;

  return [
    {
      label: "Dashboard",
      href: base ?? "/app",
      activePatterns: [],
      section: "Core Actions",
    },
    {
      label: "Spielablauf",
      href: context.nextGameHref ?? (base ? `${base}/game/setup` : null),
      activePatterns: ["/game/", "/matches/"],
      section: "Core Actions",
      disabledReason: base ? undefined : "Kein Savegame",
    },
    {
      label: "Roster",
      href: rosterHref,
      activePatterns: ["/team/roster", "/players/"],
      section: "Core Actions",
      disabledReason: teamHref ? undefined : "Kein Manager-Team",
    },
    {
      label: "Depth Chart",
      href: depthChartHref,
      activePatterns: ["/team/depth-chart"],
      section: "Core Actions",
      disabledReason: teamHref ? undefined : "Kein Manager-Team",
    },
    {
      label: "Contracts/Cap",
      href: contractsHref,
      activePatterns: ["/team/contracts"],
      section: "Core Actions",
      disabledReason: teamHref ? undefined : "Kein Manager-Team",
    },
    {
      label: "Development",
      href: developmentHref,
      activePatterns: ["/development"],
      section: "Core Actions",
      disabledReason: developmentHref ? undefined : "Kein Savegame",
    },
    {
      label: "Team Overview",
      href: teamHref,
      activePatterns: ["/team"],
      excludePatterns: ["/team/roster", "/team/depth-chart", "/team/contracts", "/team/trades"],
      section: "Team Management",
      disabledReason: teamHref ? undefined : "Kein Manager-Team",
    },
    {
      label: "Trade Board",
      href: tradeBoardHref,
      activePatterns: ["/team/trades", "/finance/trades"],
      section: "Team Management",
      disabledReason: teamHref ? undefined : "Kein Manager-Team",
    },
    {
      label: "Inbox",
      href: base ? `${base}/inbox` : null,
      activePatterns: ["/inbox"],
      section: "Team Management",
      disabledReason: base ? undefined : "Kein Savegame",
    },
    {
      label: "Finance",
      href: financeHref,
      activePatterns: ["/finance", "/free-agents"],
      excludePatterns: ["/finance/trades"],
      section: "Analysis/Secondary",
      disabledReason: financeHref ? undefined : "Kein Manager-Team",
    },
    {
      label: "League",
      href: seasonHref,
      activePatterns: ["/league", "/seasons/"],
      section: "Analysis/Secondary",
      disabledReason: seasonHref ? undefined : "Keine aktive Saison",
    },
    {
      label: "Draft",
      href: draftHref,
      activePatterns: ["/draft"],
      section: "Analysis/Secondary",
      disabledReason: draftHref ? undefined : "Kein Savegame",
    },
    {
      label: "Savegames",
      href: "/app/savegames",
      activePatterns: ["/app/savegames"],
      section: "Analysis/Secondary",
    },
  ];
}

export function isNavigationItemActive(item: NavigationItem, pathname: string) {
  if (item.href && pathname === item.href) {
    return true;
  }

  if (item.excludePatterns?.some((pattern) => pathname.includes(pattern))) {
    return false;
  }

  return item.activePatterns.some((pattern) => {
    if (pattern === "/app/savegames") {
      return pathname === pattern;
    }

    if (pattern === "/team") {
      return pathname.endsWith("/team") || pathname.includes("/team/");
    }

    if (pattern === "/league") {
      return pathname.endsWith("/league") || pathname.includes("/league/");
    }

    return pattern.length > 0 && pathname.includes(pattern);
  });
}

export function buildBreadcrumbs(pathname: string, context: AppShellContext): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ label: "App", href: "/app" }];

  if (pathname.startsWith("/app/savegames")) {
    breadcrumbs.push({ label: "Savegames", href: "/app/savegames" });
  }

  const base = saveGameBase(context);

  if (base && pathname.startsWith(base) && context.saveGame) {
    breadcrumbs.push({ label: context.saveGame.name, href: base });
  }

  if (
    (pathname.endsWith("/team") || pathname.includes("/team/")) &&
    context.managerTeam &&
    base
  ) {
    const teamBase = `${base}/team`;

    breadcrumbs.push({
      label: context.managerTeam.abbreviation,
      href: teamBase,
    });

    const teamSection = getTeamSectionLabel(pathname);

    if (teamSection) {
      breadcrumbs.push({ label: teamSection, href: pathname });
    }
  } else if (pathname.includes("/players/")) {
    breadcrumbs.push({ label: "Spielerprofil", href: pathname });
  } else if (pathname.includes("/inbox")) {
    breadcrumbs.push({ label: "Inbox", href: pathname });
  } else if (pathname.includes("/finance")) {
    breadcrumbs.push({ label: "Finance", href: `${base ?? ""}/finance` });
    if (pathname.endsWith("/contracts")) {
      breadcrumbs.push({ label: "Contracts", href: pathname });
    } else if (pathname.endsWith("/events")) {
      breadcrumbs.push({ label: "Events", href: pathname });
    } else if (pathname.endsWith("/free-agency")) {
      breadcrumbs.push({ label: "Free Agency", href: pathname });
    } else if (pathname.endsWith("/trades")) {
      breadcrumbs.push({ label: "Trades", href: pathname });
    }
  } else if (pathname.includes("/free-agents")) {
    breadcrumbs.push({ label: "Free Agency", href: pathname });
  } else if (pathname.includes("/game/setup")) {
    breadcrumbs.push({ label: "Spielvorbereitung", href: pathname });
  } else if (pathname.includes("/game/live")) {
    breadcrumbs.push({ label: "Live-Spiel", href: pathname });
  } else if (pathname.includes("/game/report")) {
    breadcrumbs.push({ label: "Spielbericht", href: pathname });
  } else if ((pathname.includes("/seasons/") || pathname.includes("/league")) && context.currentSeason && base) {
    breadcrumbs.push({
      label: `${context.currentSeason.year} Woche ${context.currentSeason.week}`,
      href: `${base}/league`,
    });
    if (pathname.endsWith("/schedule")) {
      breadcrumbs.push({ label: "Schedule", href: pathname });
    } else if (pathname.endsWith("/teams")) {
      breadcrumbs.push({ label: "Teams", href: pathname });
    } else if (pathname.endsWith("/history")) {
      breadcrumbs.push({ label: "History", href: pathname });
    }
  } else if (pathname.includes("/development")) {
    breadcrumbs.push({ label: "Development", href: `${base ?? ""}/development` });
    if (pathname.endsWith("/training")) {
      breadcrumbs.push({ label: "Training", href: pathname });
    } else if (pathname.endsWith("/scouting")) {
      breadcrumbs.push({ label: "Scouting", href: pathname });
    } else if (pathname.endsWith("/staff")) {
      breadcrumbs.push({ label: "Staff", href: pathname });
    }
  } else if (pathname.includes("/draft")) {
    breadcrumbs.push({ label: "Draft", href: pathname });
  } else if (pathname.includes("/matches/") && pathname.endsWith("/center")) {
    breadcrumbs.push({ label: "Game Center", href: pathname });
  } else if (pathname.includes("/matches/")) {
    breadcrumbs.push({ label: "Spielbericht", href: pathname });
  }

  return breadcrumbs.filter(
    (item, index, all) => index === all.findIndex((candidate) => candidate.href === item.href),
  );
}

function getTeamSectionLabel(pathname: string) {
  if (pathname.endsWith("/roster")) {
    return "Roster";
  }

  if (pathname.endsWith("/depth-chart")) {
    return "Depth Chart";
  }

  if (pathname.endsWith("/contracts")) {
    return "Contracts";
  }

  if (pathname.endsWith("/trades")) {
    return "Trade Board";
  }

  if (pathname.endsWith("/chemistry")) {
    return "Chemistry";
  }

  if (pathname.endsWith("/x-factor")) {
    return "X-Factor";
  }

  if (pathname.endsWith("/finance")) {
    return "Finance";
  }

  if (pathname.endsWith("/schemes")) {
    return "Schemes";
  }

  if (pathname.endsWith("/gameplan")) {
    return "Gameplan";
  }

  return null;
}

export function pageTitleForPath(pathname: string, context: AppShellContext) {
  if (pathname.includes("/finance/free-agency") || pathname.includes("/free-agents")) {
    return "Free Agency";
  }

  if (pathname.includes("/players/")) {
    return "Spielerprofil";
  }

  if (pathname.includes("/inbox")) {
    return "Inbox";
  }

  if (pathname.includes("/finance")) {
    if (pathname.endsWith("/contracts")) {
      return "Finance Contracts";
    }

    if (pathname.endsWith("/events")) {
      return "Finance Events";
    }

    if (pathname.endsWith("/free-agency")) {
      return "Finance Free Agency";
    }

    if (pathname.endsWith("/trades")) {
      return "Finance Trades";
    }

    return "Finance";
  }

  if (pathname.includes("/development")) {
    if (pathname.endsWith("/training")) {
      return "Development Training";
    }

    if (pathname.endsWith("/scouting")) {
      return "Development Scouting";
    }

    if (pathname.endsWith("/staff")) {
      return "Development Staff";
    }

    return "Development";
  }

  if (pathname.includes("/draft")) {
    return "Draft";
  }

  if (pathname.includes("/game/setup")) {
    return "Spielvorbereitung";
  }

  if (pathname.includes("/game/live")) {
    return "Live-Spiel";
  }

  if (pathname.includes("/game/report")) {
    return "Spielbericht";
  }

  if (pathname.endsWith("/team") || pathname.includes("/team/")) {
    const teamSection = getTeamSectionLabel(pathname);

    return teamSection ? `Team ${teamSection}` : "Team";
  }

  if (pathname.includes("/matches/")) {
    if (pathname.endsWith("/center")) {
      return "Game Center";
    }

    return "Spielbericht";
  }

  if (pathname.includes("/seasons/") || pathname.includes("/league")) {
    return "League";
  }

  if (pathname === "/app/savegames") {
    return "Savegames";
  }

  return context.saveGame ? "GM Office" : "Dashboard";
}
