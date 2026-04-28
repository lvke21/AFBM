import { describe, expect, it } from "vitest";

import { actionErrorMessage, readActionFeedback, withActionFeedback } from "./action-feedback";

describe("action feedback", () => {
  it("adds feedback query parameters without dropping existing routing context", () => {
    const href = withActionFeedback("/app/savegames/save-1/game/setup?matchId=match-1", {
      effects: [
        { direction: "up", label: "Starter verbessert" },
        { direction: "neutral", label: "Value neutral" },
      ],
      impact: "Cap Hit 1 Mio.",
      valueFeedback: {
        impact: "positive",
        reason: "Guter Value fuer aktuelle Rolle",
        context: "Slot #1",
      },
      actionHref: "/app/savegames/save-1/team/roster",
      actionLabel: "Roster pruefen",
      message: "Gespeichert.",
      title: "Aktion erfolgreich",
      tone: "success",
    });
    const url = new URL(href, "http://localhost");

    expect(url.pathname).toBe("/app/savegames/save-1/game/setup");
    expect(url.searchParams.get("matchId")).toBe("match-1");
    expect(url.searchParams.get("feedback")).toBe("success");
    expect(JSON.parse(url.searchParams.get("feedbackEffects") ?? "[]")).toEqual([
      { direction: "up", label: "Starter verbessert" },
      { direction: "neutral", label: "Value neutral" },
    ]);
    expect(url.searchParams.get("feedbackImpact")).toBe("Cap Hit 1 Mio.");
    expect(JSON.parse(url.searchParams.get("feedbackValue") ?? "{}")).toEqual({
      impact: "positive",
      reason: "Guter Value fuer aktuelle Rolle",
      context: "Slot #1",
    });
    expect(url.searchParams.get("feedbackActionHref")).toBe("/app/savegames/save-1/team/roster");
    expect(url.searchParams.get("feedbackActionLabel")).toBe("Roster pruefen");
  });

  it("parses complete feedback and ignores incomplete state", () => {
    const params = new URLSearchParams({
      feedback: "error",
      feedbackMessage: "Nicht gespeichert.",
      feedbackTitle: "Fehler",
    });

    expect(readActionFeedback(params)).toEqual({
      actionHref: null,
      actionLabel: null,
      effects: [],
      impact: null,
      message: "Nicht gespeichert.",
      title: "Fehler",
      tone: "error",
      valueFeedback: null,
    });
    expect(readActionFeedback(new URLSearchParams({ feedback: "success" }))).toBeNull();
  });

  it("parses value feedback and drops invalid value payloads", () => {
    const valueFeedback = encodeURIComponent(
      JSON.stringify({
        impact: "negative",
        reason: "Teuer fuer Backup",
        context: "Cap Hit 12 Mio.",
      }),
    );
    const params = new URLSearchParams(
      `feedback=success&feedbackTitle=OK&feedbackMessage=Gespeichert&feedbackValue=${valueFeedback}`,
    );

    expect(readActionFeedback(params)?.valueFeedback).toEqual({
      impact: "negative",
      reason: "Teuer fuer Backup",
      context: "Cap Hit 12 Mio.",
    });
    expect(
      readActionFeedback(
        new URLSearchParams(
          "feedback=success&feedbackTitle=OK&feedbackMessage=Gespeichert&feedbackValue=not-json",
        ),
      )?.valueFeedback,
    ).toBeNull();
  });

  it("parses stable decision effects and ignores invalid effect payloads", () => {
    const effects = encodeURIComponent(
      JSON.stringify([
        { direction: "up", label: "Need reduziert" },
        { direction: "down", label: "Depth reduziert" },
        { direction: "invalid", label: "Falsch" },
      ]),
    );
    const params = new URLSearchParams(
      `feedback=success&feedbackTitle=OK&feedbackMessage=Gespeichert&feedbackEffects=${effects}`,
    );

    expect(readActionFeedback(params)?.effects).toEqual([
      { direction: "up", label: "Need reduziert" },
      { direction: "down", label: "Depth reduziert" },
    ]);
    expect(
      readActionFeedback(
        new URLSearchParams(
          "feedback=success&feedbackTitle=OK&feedbackMessage=Gespeichert&feedbackEffects=not-json",
        ),
      )?.effects,
    ).toEqual([]);
  });

  it("normalizes unknown errors for user-facing messages", () => {
    expect(actionErrorMessage(new Error("Not enough salary cap space"))).toBe(
      "Not enough salary cap space",
    );
    expect(actionErrorMessage(null)).toBe("Die Aktion konnte nicht abgeschlossen werden.");
  });
});
