import { describe, expect, it } from "vitest";

import {
  FIREBASE_MVP_ACTION_AUDIT,
  getFirebaseMvpHiddenActions,
  getFirebaseMvpVisibleActions,
} from "./multiplayer-firebase-mvp-actions";

describe("multiplayer Firebase MVP action audit", () => {
  it("keeps only synchronized and tested MVP actions visible", () => {
    expect(getFirebaseMvpVisibleActions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "online-hub-join-league" }),
        expect.objectContaining({ id: "online-dashboard-ready-toggle" }),
        expect.objectContaining({ id: "online-dashboard-fantasy-draft-pick" }),
        expect.objectContaining({ id: "admin-ready-week-simulation" }),
      ]),
    );

    for (const item of getFirebaseMvpVisibleActions()) {
      expect(item.synchronized).toBe(true);
      expect(item.tested).toBe(true);
    }
  });

  it("hides legacy local-only or untested Firebase actions", () => {
    const hiddenActionIds = getFirebaseMvpHiddenActions().map((item) => item.id);

    expect(hiddenActionIds).toEqual(
      expect.arrayContaining([
        "online-dashboard-training-plan",
        "online-dashboard-franchise-actions",
        "online-dashboard-contract-actions",
        "online-dashboard-trade-actions",
        "online-dashboard-legacy-draft-actions",
        "online-dashboard-coach-actions",
        "admin-debug-tools",
        "admin-revenue-sharing",
        "admin-training-reset",
        "admin-gm-control-actions",
      ]),
    );
  });

  it("has an explicit decision for every audited action", () => {
    expect(FIREBASE_MVP_ACTION_AUDIT.length).toBeGreaterThan(15);
    for (const item of FIREBASE_MVP_ACTION_AUDIT) {
      expect(item.decision.length).toBeGreaterThan(0);
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });
});
