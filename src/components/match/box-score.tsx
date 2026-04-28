import { SectionCard } from "@/components/ui/section-card";

import { buildBoxScoreRows, type MatchReport } from "./match-report-model";

type BoxScoreProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam">;
};

export function BoxScore({ match }: BoxScoreProps) {
  const rows = buildBoxScoreRows(match);

  return (
    <SectionCard
      title="BoxScore"
      description="Die BoxScore-Tabelle verbindet Ergebnis, Yards, Turnovers und Red-Zone-Effizienz."
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="text-slate-400">
            <tr>
              <th className="px-3 py-3">Kategorie</th>
              <th className="px-3 py-3">{match.homeTeam.abbreviation}</th>
              <th className="px-3 py-3">{match.awayTeam.abbreviation}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-white/8">
                <td className="px-3 py-3">{row.label}</td>
                <td className="px-3 py-3">{row.home}</td>
                <td className="px-3 py-3">{row.away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
