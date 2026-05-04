import { describe, expect, it } from "vitest";

import {
  getOnlineLeagueRouteFallbackHref,
  resolveOnlineLeagueRouteFallback,
} from "./online-league-route-fallback-model";

describe("online league route fallback model", () => {
  it("maps direct legacy section URLs to stable dashboard anchors", () => {
    expect(resolveOnlineLeagueRouteFallback(["roster"])).toEqual({
      type: "anchor",
      anchor: "roster",
    });
    expect(resolveOnlineLeagueRouteFallback(["depth-chart"])).toEqual({
      type: "anchor",
      anchor: "depth-chart",
    });
    expect(resolveOnlineLeagueRouteFallback(["schedule"])).toEqual({
      type: "anchor",
      anchor: "week-loop",
    });
    expect(resolveOnlineLeagueRouteFallback(["standings"])).toEqual({
      type: "anchor",
      anchor: "league",
    });
    expect(getOnlineLeagueRouteFallbackHref("league-1", resolveOnlineLeagueRouteFallback([
      "week-flow",
    ]))).toBe("/online/league/league-1#week-loop");
    expect(getOnlineLeagueRouteFallbackHref("league-1", resolveOnlineLeagueRouteFallback([
      "roster",
    ]))).toBe("/online/league/league-1#roster");
    expect(getOnlineLeagueRouteFallbackHref("league-1", resolveOnlineLeagueRouteFallback([
      "depth-chart",
    ]))).toBe("/online/league/league-1#depth-chart");
  });

  it("maps known non-MVP sections to coming-soon routes", () => {
    expect(resolveOnlineLeagueRouteFallback(["contracts"])).toEqual({
      type: "coming-soon",
      feature: "contracts-cap",
    });
    expect(resolveOnlineLeagueRouteFallback(["trades"])).toEqual({
      type: "coming-soon",
      feature: "trade-board",
    });
  });

  it("builds safe hrefs for fallback resolutions", () => {
    expect(
      getOnlineLeagueRouteFallbackHref("league-1", {
        type: "anchor",
        anchor: "team",
      }),
    ).toBe("/online/league/league-1#team");
    expect(
      getOnlineLeagueRouteFallbackHref("league-1", {
        type: "coming-soon",
        feature: "finance",
      }),
    ).toBe("/online/league/league-1/coming-soon/finance");
    expect(getOnlineLeagueRouteFallbackHref("league-1", { type: "draft" })).toBe(
      "/online/league/league-1/draft",
    );
  });

  it("keeps unknown routes inside the league fallback instead of forcing a 404", () => {
    expect(resolveOnlineLeagueRouteFallback(["unknown", "panel"])).toEqual({
      type: "unknown",
      pathLabel: "unknown/panel",
    });
  });

  it("routes legacy non-MVP aliases to intentional coming-soon pages", () => {
    const expected = [
      ["contracts", "contracts-cap"],
      ["development", "development"],
      ["training", "training"],
      ["development/training", "training"],
      ["trade-board", "trade-board"],
      ["inbox", "inbox"],
      ["finance", "finance"],
    ] as const;

    expected.forEach(([section, feature]) => {
      expect(resolveOnlineLeagueRouteFallback(section.split("/"))).toEqual({
        type: "coming-soon",
        feature,
      });
    });
  });
});
