import Link from "next/link";

import type { SeasonStandingRow } from "@/modules/seasons/domain/season.types";
import {
  getRedZoneTouchdownRate,
  getTeamHref,
  sortStandingsRows,
} from "./season-view-model";

type StandingsTableProps = {
  saveGameId: string;
  standings: SeasonStandingRow[];
};

export function StandingsTable({ saveGameId, standings }: StandingsTableProps) {
  const rows = sortStandingsRows(standings);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
        Noch keine Standings vorhanden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-slate-200">
        <thead className="text-slate-400">
          <tr>
            <th className="px-3 py-3">#</th>
            <th className="px-3 py-3">Team</th>
            <th className="px-3 py-3">Record</th>
            <th className="px-3 py-3">PF</th>
            <th className="px-3 py-3">PA</th>
            <th className="px-3 py-3">Diff</th>
            <th className="px-3 py-3">TD</th>
            <th className="px-3 py-3">TO +/-</th>
            <th className="px-3 py-3">Pass</th>
            <th className="px-3 py-3">Rush</th>
            <th className="px-3 py-3">Sacks</th>
            <th className="px-3 py-3">Expl</th>
            <th className="px-3 py-3">RZ TD%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((standing, index) => {
            const redZoneRate = getRedZoneTouchdownRate(standing);

            return (
              <tr key={standing.teamId} className="border-t border-white/8">
                <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                <td className="px-3 py-3">
                  <Link
                    href={getTeamHref(saveGameId, standing.teamId)}
                    className="font-semibold text-white underline-offset-4 hover:underline"
                  >
                    {standing.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{standing.abbreviation}</p>
                </td>
                <td className="px-3 py-3">{standing.record}</td>
                <td className="px-3 py-3">{standing.pointsFor}</td>
                <td className="px-3 py-3">{standing.pointsAgainst}</td>
                <td className="px-3 py-3">{standing.pointsFor - standing.pointsAgainst}</td>
                <td className="px-3 py-3">{standing.touchdownsFor}</td>
                <td className="px-3 py-3">{standing.turnoverDifferential}</td>
                <td className="px-3 py-3">{standing.passingYards}</td>
                <td className="px-3 py-3">{standing.rushingYards}</td>
                <td className="px-3 py-3">{standing.sacks}</td>
                <td className="px-3 py-3">{standing.explosivePlays}</td>
                <td className="px-3 py-3">{redZoneRate == null ? "-" : `${redZoneRate}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
