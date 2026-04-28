import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";

type GameFlowEmptyStateProps = {
  seasonHref: string | null;
};

export function GameFlowEmptyState({ seasonHref }: GameFlowEmptyStateProps) {
  return (
    <SectionPanel
      title="Kein Spiel im Fokus"
      description="Fuer diesen Savegame-Kontext konnte kein relevantes Spiel gefunden werden."
      tone="subtle"
    >
      <p className="text-sm text-slate-300">
        Oeffne den Saisonplan, um Schedule, Woche und Simulationsstatus zu pruefen.
      </p>
      {seasonHref ? (
        <Link
          href={seasonHref}
          className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Saisonplan oeffnen
        </Link>
      ) : null}
    </SectionPanel>
  );
}
