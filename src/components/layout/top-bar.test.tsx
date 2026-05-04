import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TopBar } from "./top-bar";
import type { AppShellContext } from "./navigation-model";

describe("TopBar", () => {
  it("uses player-facing phase labels when provided by online lifecycle context", () => {
    const context: AppShellContext = {
      saveGame: {
        id: "online-league",
        name: "Online Liga",
        leagueName: "AFBM Online",
      },
      currentSeason: {
        id: "online-season-1",
        year: 1,
        phase: "readyOpen",
        phaseLabel: "Woche offen",
        week: 2,
      },
      managerTeam: {
        id: "basel-rhinos",
        name: "Basel Rhinos",
        abbreviation: "BAS",
        currentRecord: "1-0",
      },
    };

    const markup = renderToStaticMarkup(<TopBar context={context} />);

    expect(markup).toContain("Woche offen");
    expect(markup).not.toContain("readyOpen");
  });
});
