import { StatusBadge } from "@/components/ui/status-badge";

import type { LiveSimulationState, LiveStorylineItem } from "./live-simulation-model";

type LiveStorylinePanelProps = {
  state: LiveSimulationState;
};

function toneLabel(tone: LiveStorylineItem["tone"]) {
  if (tone === "success") {
    return "Edge";
  }

  if (tone === "warning") {
    return "Pressure";
  }

  if (tone === "danger") {
    return "Swing";
  }

  if (tone === "active") {
    return "Live";
  }

  return "Read";
}

function StoryCard({ item, prominent = false }: { item: LiveStorylineItem; prominent?: boolean }) {
  return (
    <article
      className={[
        "rounded-lg border p-4",
        prominent
          ? "border-sky-300/25 bg-sky-300/10"
          : "border-white/10 bg-black/15",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {item.label}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
        </div>
        <StatusBadge label={toneLabel(item.tone)} tone={item.tone} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
    </article>
  );
}

export function LiveStorylinePanel({ state }: LiveStorylinePanelProps) {
  const { storyline } = state;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Live Storyline
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">What This Game Feels Like</h2>
        </div>
        <StatusBadge label="Manager Lens" tone="active" />
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <StoryCard item={storyline.currentGameState} prominent />
        <StoryCard item={storyline.keyDrive} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <StoryCard item={storyline.momentumSignal} />
        <StoryCard item={storyline.managerImpact} />
        <StoryCard item={storyline.watchNext} />
      </div>
    </section>
  );
}
