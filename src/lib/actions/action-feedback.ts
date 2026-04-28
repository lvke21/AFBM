export type ActionFeedbackTone = "success" | "error";
export type ActionEffectDirection = "up" | "down" | "neutral";
export type ActionValueFeedbackImpact = "positive" | "neutral" | "negative";

export type ActionDecisionEffect = {
  direction: ActionEffectDirection;
  label: string;
};

export type ActionValueFeedback = {
  impact: ActionValueFeedbackImpact;
  reason: string;
  context?: string;
};

export type ActionFeedback = {
  tone: ActionFeedbackTone;
  title: string;
  message: string;
  actionHref?: string | null;
  actionLabel?: string | null;
  effects?: ActionDecisionEffect[];
  impact?: string | null;
  valueFeedback?: ActionValueFeedback | null;
};

const FEEDBACK_TONES = new Set<ActionFeedbackTone>(["success", "error"]);
const EFFECT_DIRECTIONS = new Set<ActionEffectDirection>(["up", "down", "neutral"]);
const VALUE_FEEDBACK_IMPACTS = new Set<ActionValueFeedbackImpact>([
  "positive",
  "neutral",
  "negative",
]);
const EFFECTS_PARAM = "feedbackEffects";
const VALUE_FEEDBACK_PARAM = "feedbackValue";

function splitRelativeHref(href: string) {
  const [path, query = ""] = href.split("?");

  return {
    path,
    params: new URLSearchParams(query),
  };
}

export function withActionFeedback(href: string, feedback: ActionFeedback) {
  const { path, params } = splitRelativeHref(href);

  params.set("feedback", feedback.tone);
  params.set("feedbackTitle", feedback.title);
  params.set("feedbackMessage", feedback.message);

  if (feedback.impact) {
    params.set("feedbackImpact", feedback.impact);
  } else {
    params.delete("feedbackImpact");
  }

  if (feedback.effects && feedback.effects.length > 0) {
    params.set(EFFECTS_PARAM, JSON.stringify(feedback.effects.slice(0, 4)));
  } else {
    params.delete(EFFECTS_PARAM);
  }

  if (feedback.valueFeedback) {
    params.set(VALUE_FEEDBACK_PARAM, JSON.stringify(feedback.valueFeedback));
  } else {
    params.delete(VALUE_FEEDBACK_PARAM);
  }

  if (feedback.actionHref && feedback.actionLabel) {
    params.set("feedbackActionHref", feedback.actionHref);
    params.set("feedbackActionLabel", feedback.actionLabel);
  } else {
    params.delete("feedbackActionHref");
    params.delete("feedbackActionLabel");
  }

  return `${path}?${params.toString()}`;
}

function parseEffects(value: string | null): ActionDecisionEffect[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (effect): effect is ActionDecisionEffect =>
          effect &&
          typeof effect === "object" &&
          typeof effect.label === "string" &&
          effect.label.trim().length > 0 &&
          EFFECT_DIRECTIONS.has(effect.direction),
      )
      .slice(0, 4)
      .map((effect) => ({
        direction: effect.direction,
        label: effect.label.trim(),
      }));
  } catch {
    return [];
  }
}

function parseValueFeedback(value: string | null): ActionValueFeedback | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !VALUE_FEEDBACK_IMPACTS.has(parsed.impact) ||
      typeof parsed.reason !== "string" ||
      parsed.reason.trim().length === 0
    ) {
      return null;
    }

    const context = typeof parsed.context === "string" ? parsed.context.trim() : "";

    return {
      impact: parsed.impact,
      reason: parsed.reason.trim(),
      ...(context ? { context } : {}),
    };
  } catch {
    return null;
  }
}

export function readActionFeedback(searchParams: Pick<URLSearchParams, "get">): ActionFeedback | null {
  const tone = searchParams.get("feedback");
  const title = searchParams.get("feedbackTitle");
  const message = searchParams.get("feedbackMessage");

  if (!tone || !FEEDBACK_TONES.has(tone as ActionFeedbackTone) || !title || !message) {
    return null;
  }

  return {
    actionHref: searchParams.get("feedbackActionHref"),
    actionLabel: searchParams.get("feedbackActionLabel"),
    effects: parseEffects(searchParams.get(EFFECTS_PARAM)),
    tone: tone as ActionFeedbackTone,
    title,
    message,
    impact: searchParams.get("feedbackImpact"),
    valueFeedback: parseValueFeedback(searchParams.get(VALUE_FEEDBACK_PARAM)),
  };
}

export function actionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Die Aktion konnte nicht abgeschlossen werden.";
}
