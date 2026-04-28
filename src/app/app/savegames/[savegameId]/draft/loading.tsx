import { StatCard } from "@/components/ui/stat-card";

export default function DraftLoading() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Draft Class" value="Laedt..." />
        <StatCard label="Status" value="Laedt..." />
        <StatCard label="Prospects" value="Laedt..." />
        <StatCard label="Scouted" value="Laedt..." />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        Draftdaten werden geladen.
      </section>
    </div>
  );
}
