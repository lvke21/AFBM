import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";

export default function DevelopmentStaffPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Staff" value="Coming Soon" />
        <StatCard label="Status" value="Nicht implementiert" />
        <StatCard label="Coaches" value="n/a" />
      </section>

      <SectionPanel
        title="Staff"
        description="Coming Soon: Head Coach, Coordinator und Staff-Effekte sind noch nicht nutzbar."
        tone="subtle"
      >
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
          Nicht implementiert. Dieser Screen ist nur als zukuenftiger Arbeitsbereich vorbereitet.
        </div>
      </SectionPanel>
    </div>
  );
}
