import { describe, expect, it } from "vitest";

import {
  buildBreadcrumbs,
  buildNavigationItems,
  isNavigationItemActive,
  pageTitleForPath,
  type AppShellContext,
} from "./navigation-model";

const context: AppShellContext = {
  saveGame: {
    id: "save-1",
    name: "Test Save",
    leagueName: "AFBM",
  },
  currentSeason: {
    id: "season-1",
    year: 2026,
    phase: "REGULAR_SEASON",
    week: 4,
  },
  managerTeam: {
    id: "team-1",
    name: "Boston Guardians",
    abbreviation: "BOS",
    currentRecord: "2-1",
  },
  nextGameHref: "/app/savegames/save-1/game/setup?matchId=match-1",
};

describe("GM navigation model", () => {
  it("builds navigation from real context shape without disabled core links", () => {
    const items = buildNavigationItems(context);

    expect(items.find((item) => item.label === "Dashboard")?.href).toBe("/app/savegames/save-1");
    expect(items.find((item) => item.label === "Inbox")?.href).toBe(
      "/app/savegames/save-1/inbox",
    );
    expect(items.find((item) => item.label === "Team Overview")?.href).toBe(
      "/app/savegames/save-1/team",
    );
    expect(items.find((item) => item.label === "Roster")?.href).toBe(
      "/app/savegames/save-1/team/roster",
    );
    expect(items.find((item) => item.label === "Depth Chart")?.href).toBe(
      "/app/savegames/save-1/team/depth-chart",
    );
    expect(items.find((item) => item.label === "Contracts/Cap")?.href).toBe(
      "/app/savegames/save-1/team/contracts",
    );
    expect(items.find((item) => item.label === "Trade Board")?.href).toBe(
      "/app/savegames/save-1/team/trades",
    );
    expect(items.find((item) => item.label === "League")?.href).toBe(
      "/app/savegames/save-1/league",
    );
    expect(items.find((item) => item.label === "Spielablauf")?.href).toBe(
      "/app/savegames/save-1/game/setup?matchId=match-1",
    );
    expect(items.find((item) => item.label === "Finance")?.href).toBe(
      "/app/savegames/save-1/finance",
    );
    expect(items.find((item) => item.label === "Development")?.href).toBe(
      "/app/savegames/save-1/development",
    );
    expect(items.find((item) => item.label === "Draft")?.href).toBe(
      "/app/savegames/save-1/draft",
    );
  });

  it("marks route families active", () => {
    const items = buildNavigationItems(context);
    const dashboard = items.find((item) => item.label === "Dashboard");
    const inbox = items.find((item) => item.label === "Inbox");
    const teamOverview = items.find((item) => item.label === "Team Overview");
    const roster = items.find((item) => item.label === "Roster");
    const depthChart = items.find((item) => item.label === "Depth Chart");
    const contracts = items.find((item) => item.label === "Contracts/Cap");
    const tradeBoard = items.find((item) => item.label === "Trade Board");
    const game = items.find((item) => item.label === "Spielablauf");
    const league = items.find((item) => item.label === "League");
    const finance = items.find((item) => item.label === "Finance");
    const development = items.find((item) => item.label === "Development");
    const draft = items.find((item) => item.label === "Draft");

    expect(dashboard && isNavigationItemActive(dashboard, "/app/savegames/save-1")).toBe(true);
    expect(dashboard && isNavigationItemActive(dashboard, "/app/savegames/save-1/inbox")).toBe(false);
    expect(inbox && isNavigationItemActive(inbox, "/app/savegames/save-1/inbox")).toBe(true);
    expect(teamOverview && isNavigationItemActive(teamOverview, "/app/savegames/save-1/team")).toBe(true);
    expect(teamOverview && isNavigationItemActive(teamOverview, "/app/savegames/save-1/team/roster")).toBe(false);
    expect(roster && isNavigationItemActive(roster, "/app/savegames/save-1/team/roster")).toBe(true);
    expect(roster && isNavigationItemActive(roster, "/app/savegames/save-1/players/player-1")).toBe(true);
    expect(depthChart && isNavigationItemActive(depthChart, "/app/savegames/save-1/team/depth-chart")).toBe(true);
    expect(contracts && isNavigationItemActive(contracts, "/app/savegames/save-1/team/contracts")).toBe(true);
    expect(tradeBoard && isNavigationItemActive(tradeBoard, "/app/savegames/save-1/team/trades")).toBe(true);
    expect(teamOverview && isNavigationItemActive(teamOverview, "/app/savegames/save-1/league/teams")).toBe(false);
    expect(
      finance &&
        isNavigationItemActive(finance, "/app/savegames/save-1/finance"),
    ).toBe(true);
    expect(
      finance &&
        isNavigationItemActive(finance, "/app/savegames/save-1/team/contracts"),
    ).toBe(false);
    expect(
      finance &&
        isNavigationItemActive(finance, "/app/savegames/save-1/finance/free-agency"),
    ).toBe(true);
    expect(
      game && isNavigationItemActive(game, "/app/savegames/save-1/game/live?matchId=match-1"),
    ).toBe(true);
    expect(league && isNavigationItemActive(league, "/app/savegames/save-1/seasons/season-1")).toBe(true);
    expect(league && isNavigationItemActive(league, "/app/savegames/save-1/league")).toBe(true);
    expect(development && isNavigationItemActive(development, "/app/savegames/save-1/development/staff")).toBe(true);
    expect(development && isNavigationItemActive(development, "/app/savegames/save-1/draft")).toBe(false);
    expect(draft && isNavigationItemActive(draft, "/app/savegames/save-1/draft")).toBe(true);
  });

  it("creates contextual breadcrumbs and page titles", () => {
    expect(buildBreadcrumbs("/app/savegames/save-1/team", context)).toEqual([
      { label: "App", href: "/app" },
      { label: "Savegames", href: "/app/savegames" },
      { label: "Test Save", href: "/app/savegames/save-1" },
      { label: "BOS", href: "/app/savegames/save-1/team" },
    ]);
    expect(buildBreadcrumbs("/app/savegames/save-1/team/roster", context)).toEqual([
      { label: "App", href: "/app" },
      { label: "Savegames", href: "/app/savegames" },
      { label: "Test Save", href: "/app/savegames/save-1" },
      { label: "BOS", href: "/app/savegames/save-1/team" },
      { label: "Roster", href: "/app/savegames/save-1/team/roster" },
    ]);
    expect(pageTitleForPath("/app/savegames/save-1/team/roster", context)).toBe(
      "Team Roster",
    );
    expect(buildBreadcrumbs("/app/savegames/save-1/game/setup", context)).toEqual([
      { label: "App", href: "/app" },
      { label: "Savegames", href: "/app/savegames" },
      { label: "Test Save", href: "/app/savegames/save-1" },
      { label: "Spielvorbereitung", href: "/app/savegames/save-1/game/setup" },
    ]);
    expect(pageTitleForPath("/app/savegames/save-1/game/report", context)).toBe("Spielbericht");
    expect(buildBreadcrumbs("/app/savegames/save-1/finance", context)).toEqual([
      { label: "App", href: "/app" },
      { label: "Savegames", href: "/app/savegames" },
      { label: "Test Save", href: "/app/savegames/save-1" },
      { label: "Finance", href: "/app/savegames/save-1/finance" },
    ]);
    expect(pageTitleForPath("/app/savegames/save-1/finance", context)).toBe("Finance");
    expect(pageTitleForPath("/app/savegames/save-1/finance/events", context)).toBe("Finance Events");
    expect(pageTitleForPath("/app/savegames/save-1/finance/free-agency", context)).toBe("Free Agency");
    expect(pageTitleForPath("/app/savegames/save-1/development", context)).toBe("Development");
    expect(buildBreadcrumbs("/app/savegames/save-1/draft", context)).toEqual([
      { label: "App", href: "/app" },
      { label: "Savegames", href: "/app/savegames" },
      { label: "Test Save", href: "/app/savegames/save-1" },
      { label: "Draft", href: "/app/savegames/save-1/draft" },
    ]);
    expect(pageTitleForPath("/app/savegames/save-1/draft", context)).toBe("Draft");
    expect(pageTitleForPath("/app/savegames/save-1/inbox", context)).toBe("Inbox");
  });

  it("distinguishes Game Center from the match report route", () => {
    expect(buildBreadcrumbs("/app/savegames/save-1/matches/match-1/center", context)).toEqual([
      { label: "App", href: "/app" },
      { label: "Savegames", href: "/app/savegames" },
      { label: "Test Save", href: "/app/savegames/save-1" },
      { label: "Game Center", href: "/app/savegames/save-1/matches/match-1/center" },
    ]);
    expect(pageTitleForPath("/app/savegames/save-1/matches/match-1/center", context)).toBe(
      "Game Center",
    );
    expect(pageTitleForPath("/app/savegames/save-1/matches/match-1", context)).toBe(
      "Spielbericht",
    );
  });

  it("falls back safely when no savegame is open", () => {
    const items = buildNavigationItems({
      saveGame: null,
      currentSeason: null,
      managerTeam: null,
    });

    expect(items.find((item) => item.label === "Dashboard")?.href).toBe("/app");
    expect(items.find((item) => item.label === "Team Overview")?.href).toBeNull();
    expect(items.find((item) => item.label === "Roster")?.href).toBeNull();
  });
});
