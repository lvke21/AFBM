import { SectionPanel } from "@/components/layout/section-panel";

import type { TeamProfileState } from "./dashboard-model";

type TeamProfilePanelProps = {
  state: TeamProfileState;
};

function traitClass(tone: TeamProfileState["traits"][number]["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-50";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-50";
  }

  return "border-white/10 bg-white/5 text-slate-100";
}

export function TeamProfilePanel({ state }: TeamProfilePanelProps) {
  return (
    <SectionPanel
      title={state.title}
      description="Kurze Einordnung, was fuer ein Team du aktuell fuehrst."
    >
      {state.traits.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">{state.summary}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {state.traits.map((trait) => (
              <article key={trait.label} className={`rounded-lg border p-4 ${traitClass(trait.tone)}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
                  Eigenschaft
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">{trait.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{trait.description}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionPanel>
  );
}
