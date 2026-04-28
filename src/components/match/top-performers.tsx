import { SectionCard } from "@/components/ui/section-card";

import { buildTopPerformerCards, type MatchReport } from "./match-report-model";

type TopPerformersProps = {
  leaders: MatchReport["leaders"];
};

export function TopPerformers({ leaders }: TopPerformersProps) {
  const cards = buildTopPerformerCards(leaders);

  return (
    <SectionCard
      title="Top Performers"
      description="Die wichtigsten Einzelspieler werden aus den Match-Rohdaten abgeleitet."
    >
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.category}
            className="rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {card.category}
            </p>
            {card.leader ? (
              <>
                <p className="mt-2 text-lg font-semibold text-white">
                  {card.leader.fullName}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {card.leader.teamAbbreviation} · {card.leader.positionCode}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Pass {card.leader.passingYards} · Rush {card.leader.rushingYards} · Rec{" "}
                  {card.leader.receivingYards} · TKL {card.leader.tackles} · Sacks{" "}
                  {card.leader.sacks}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Noch keine Werte.</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
