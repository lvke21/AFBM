import { describe, expect, it } from "vitest";

import {
  assessPlayerValueDecision,
  assessTradeValueDecision,
  buildDepthChartLineupEffects,
  buildDepthChartLineupImpact,
  buildDepthChartLineupValueFeedback,
  buildReleaseEffects,
  buildRosterAssignmentEffects,
  buildRosterAssignmentValueFeedback,
  buildSigningEffects,
  buildTransactionValueFeedback,
  buildTradeEffects,
} from "./decision-effects";

describe("decision effects", () => {
  it("shows starter improvement only for active slot-one starters", () => {
    expect(
      buildRosterAssignmentEffects({
        depthChartSlot: 1,
        developmentFocus: false,
        rosterStatus: "STARTER",
        specialRole: null,
      }),
    ).toContainEqual({ direction: "up", label: "Starter verbessert" });

    expect(
      buildRosterAssignmentEffects({
        depthChartSlot: 1,
        developmentFocus: false,
        rosterStatus: "INACTIVE",
        specialRole: null,
      }),
    ).toContainEqual({ direction: "down", label: "Depth reduziert" });
  });

  it("keeps sparse assignment feedback neutral when no active slot is set", () => {
    expect(
      buildRosterAssignmentEffects({
        depthChartSlot: null,
        developmentFocus: false,
        rosterStatus: "BACKUP",
        specialRole: null,
      }),
    ).toEqual([{ direction: "neutral", label: "Depth neutral" }]);
  });

  it("marks active signings as depth and need improvements", () => {
    expect(buildSigningEffects({ depthChartSlot: 3, rosterStatus: "BACKUP" })).toEqual([
      { direction: "up", label: "Depth erhoeht" },
      { direction: "up", label: "Need reduziert" },
    ]);
  });

  it("qualifies trade value without false positives", () => {
    expect(buildTradeEffects({ managerValueScore: 82, partnerValueScore: 70 })).toContainEqual({
      direction: "up",
      label: "Value verbessert",
    });
    expect(buildTradeEffects({ managerValueScore: 70, partnerValueScore: 82 })).toContainEqual({
      direction: "down",
      label: "Value verschlechtert",
    });
    expect(buildTradeEffects({ managerValueScore: 72, partnerValueScore: 70 })).toContainEqual({
      direction: "neutral",
      label: "Value neutral",
    });
  });

  it("maps existing player value labels into transaction quality", () => {
    expect(assessPlayerValueDecision({ label: "Great Value", score: 84 })).toEqual({
      direction: "up",
      label: "Guter Value",
      reason: "Der bestehende Value Score sieht Fit, Leistung und Kosten klar positiv.",
    });
    expect(assessPlayerValueDecision({ label: "Fair Value", score: 70 }).label).toBe("Neutral");
    expect(assessPlayerValueDecision({ label: "Expensive", score: 52 }).label).toBe("Riskant");
    expect(assessPlayerValueDecision({ label: "Low Fit", score: 48 }).label).toBe("Riskant");
    expect(assessPlayerValueDecision({ label: null, score: null })).toEqual({
      direction: "neutral",
      label: "Neutral",
      reason: "Value-Daten sind unvollstaendig; die Entscheidung wird neutral eingeordnet.",
    });
  });

  it("maps trade value score deltas into a non-contradictory move verdict", () => {
    expect(assessTradeValueDecision({ managerValueScore: 82, partnerValueScore: 70 })).toEqual({
      direction: "up",
      label: "Guter Value",
      reason: "Der erhaltene Value liegt klar ueber dem abgegebenen Value.",
    });
    expect(assessTradeValueDecision({ managerValueScore: 70, partnerValueScore: 82 }).label).toBe(
      "Riskant",
    );
    expect(assessTradeValueDecision({ managerValueScore: 72, partnerValueScore: 70 }).label).toBe(
      "Neutral",
    );
    expect(assessTradeValueDecision({ managerValueScore: Number.NaN, partnerValueScore: 70 })).toEqual({
      direction: "neutral",
      label: "Neutral",
      reason: "Trade-Value-Daten sind unvollstaendig; die Entscheidung wird neutral eingeordnet.",
    });
  });

  it("builds structured value feedback for positive, neutral and negative transactions", () => {
    expect(
      buildTransactionValueFeedback(
        assessPlayerValueDecision({ label: "Great Value", score: 91 }),
        "Guter Value fuer aktuelle Rolle",
      ),
    ).toEqual({
      impact: "positive",
      reason: "Der bestehende Value Score sieht Fit, Leistung und Kosten klar positiv.",
      context: "Guter Value fuer aktuelle Rolle",
    });
    expect(
      buildTransactionValueFeedback(
        assessPlayerValueDecision({ label: "Fair Value", score: 70 }),
      ),
    ).toEqual({
      impact: "neutral",
      reason: "Der bestehende Value Score sieht keinen klaren Vorteil und kein klares Risiko.",
    });
    expect(
      buildTransactionValueFeedback(
        assessPlayerValueDecision({ label: "Expensive", score: 40 }),
        "Teuer fuer Backup",
      ),
    ).toEqual({
      impact: "negative",
      reason: "Der bestehende Value Score warnt vor hoher Kostenlast.",
      context: "Teuer fuer Backup",
    });
  });

  it("keeps trade effects neutral for missing scores and equal player values", () => {
    expect(buildTradeEffects({ managerValueScore: null, partnerValueScore: 80 })).toEqual([
      { direction: "neutral", label: "Value neutral" },
      { direction: "neutral", label: "Need geprueft" },
    ]);
    expect(buildTradeEffects({ managerValueScore: 75, partnerValueScore: 75 })).toEqual([
      { direction: "neutral", label: "Value neutral" },
      { direction: "neutral", label: "Need geprueft" },
    ]);
  });

  it("builds structured roster-change value feedback with safe fallbacks", () => {
    expect(
      buildRosterAssignmentValueFeedback({
        depthChartSlot: 1,
        developmentFocus: false,
        rosterStatus: "STARTER",
        specialRole: null,
      }),
    ).toEqual({
      impact: "positive",
      reason: "Guter Value fuer aktuelle Rolle: Der Spieler ist als Starter klar eingeordnet.",
      context: "Roster-Change",
    });
    expect(
      buildRosterAssignmentValueFeedback({
        depthChartSlot: null,
        developmentFocus: false,
        rosterStatus: "INACTIVE",
        specialRole: null,
      }),
    ).toEqual({
      impact: "negative",
      reason: "Aktive Depth sinkt durch diese Rollenentscheidung.",
      context: "Roster-Change",
    });
    expect(
      buildRosterAssignmentValueFeedback({
        depthChartSlot: null,
        developmentFocus: false,
        rosterStatus: "BACKUP",
        specialRole: null,
      }),
    ).toEqual({
      impact: "neutral",
      reason: "Keine klare Value-Veraenderung; Rolle und aktiver Slot bleiben neutral.",
      context: "Roster-Change",
    });
    expect(
      buildRosterAssignmentValueFeedback({
        depthChartSlot: null,
        developmentFocus: true,
        rosterStatus: "BACKUP",
        specialRole: null,
      }).impact,
    ).toBe("positive");
  });

  it("shows release tradeoffs qualitatively", () => {
    expect(buildReleaseEffects({ capHit: 6_000_000, capSavings: 4_000_000 })).toEqual([
      { direction: "down", label: "Depth reduziert" },
      { direction: "up", label: "Flexibilitaet erhoeht" },
    ]);
  });

  it("builds depth chart before-after feedback from existing starter ratings", () => {
    const input = {
      currentSlot: 2,
      targetSlot: 1,
      playerName: "Casey Starter",
      playerOverall: 82,
      positionCode: "QB",
      starterOverallBefore: 76,
      starterOverallAfter: 82,
      swappedWithPlayerName: "Riley Target",
      swappedWithPlayerOverall: 76,
    };

    expect(buildDepthChartLineupEffects(input)).toEqual([
      { direction: "up", label: "Prioritaet erhoeht" },
      { direction: "up", label: "Positions-OVR +6" },
    ]);
    expect(buildDepthChartLineupImpact(input)).toBe(
      "QB · Slot #2 -> #1 · Tausch mit Riley Target (76 OVR) · Positionsstaerke 76 -> 82 (+6) · Bewertung: Passing leicht verbessert.",
    );
    expect(buildDepthChartLineupValueFeedback(input)).toEqual({
      impact: "positive",
      reason:
        "Passing leicht verbessert: Der neue Slot-1-Wert liegt ueber der vorherigen Positionsstaerke.",
      context: "QB Depth Chart",
    });
  });

  it("marks depth chart demotions as risk when starter strength drops or opens", () => {
    const input = {
      currentSlot: 1,
      targetSlot: 2,
      playerName: "Evan Stone",
      playerOverall: 78,
      positionCode: "QB",
      starterOverallBefore: 78,
      starterOverallAfter: null,
      swappedWithPlayerName: null,
      swappedWithPlayerOverall: null,
    };

    expect(buildDepthChartLineupEffects(input)).toEqual([
      { direction: "down", label: "Prioritaet reduziert" },
      { direction: "down", label: "Starter offen" },
    ]);
    expect(buildDepthChartLineupImpact(input)).toContain(
      "Positionsstaerke 78 -> offen (n/a)",
    );
    expect(buildDepthChartLineupValueFeedback(input)).toEqual({
      impact: "negative",
      reason:
        "Passing Risiko steigt: Der vorherige Slot-1-Wert ist nach der Aenderung offen.",
      context: "QB Depth Chart",
    });
  });
});
