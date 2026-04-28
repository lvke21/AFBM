import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";

type FinanceTradesPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function FinanceTradesPage({ params }: FinanceTradesPageProps) {
  await params;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Trade Center" value="Coming Soon" />
        <StatCard label="Status" value="Nicht implementiert" />
        <StatCard label="Angebote" value="0" />
      </section>

      <SectionPanel
        title="Trades"
        description="Coming Soon: Trade-Angebote, Trade-Historie und Cap-Auswirkungen sind noch nicht nutzbar."
        tone="subtle"
      >
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
          Nicht implementiert. Es sind noch keine Trade-Funktionen verfuegbar. Der Bereich ist als
          stabiler Navigationsanker vorbereitet, ohne bestehende Finance-Logik zu duplizieren.
        </div>
      </SectionPanel>
    </div>
  );
}
