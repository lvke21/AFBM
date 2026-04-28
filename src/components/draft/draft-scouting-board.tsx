import { ScoutingLevel } from "@prisma/client";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { DraftBoardState } from "@/modules/draft/application/draft-query.service";

type DraftScoutingBoardProps = {
  board: DraftBoardState;
  saveGameId: string;
  scoutProspectAction: (formData: FormData) => Promise<void>;
};

function levelLabel(level: ScoutingLevel) {
  if (level === ScoutingLevel.FOCUSED) {
    return "Focused";
  }

  if (level === ScoutingLevel.BASIC) {
    return "Basic";
  }

  return "Ungescoutet";
}

function levelClasses(level: ScoutingLevel) {
  if (level === ScoutingLevel.FOCUSED) {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  if (level === ScoutingLevel.BASIC) {
    return "border-sky-300/30 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

export function DraftScoutingBoard({
  board,
  saveGameId,
  scoutProspectAction,
}: DraftScoutingBoardProps) {
  if (!board.draftClass) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
        Keine Draft Class fuer dieses Savegame vorhanden.
      </div>
    );
  }

  if (board.prospects.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
        Keine verfuegbaren Prospects in dieser Draft Class.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
      <table className="min-w-full text-left text-sm text-slate-200">
        <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Prospect</th>
            <th className="px-4 py-3">Projection</th>
            <th className="px-4 py-3">Scouting</th>
            <th className="px-4 py-3">Visible Info</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {board.prospects.map((prospect) => {
            const isComplete = prospect.scoutingLevel === ScoutingLevel.FOCUSED;

            return (
              <tr key={prospect.id} className="border-t border-white/8 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{prospect.fullName}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {prospect.positionCode} · Age {prospect.age}
                    {prospect.college ? ` · ${prospect.college}` : ""}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p>Round {prospect.projectedRound}</p>
                  <p className="mt-1 text-xs text-slate-400">Status: {prospect.status}</p>
                  <p className="mt-1 text-xs text-slate-400">Risk: {prospect.riskLevel}</p>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(prospect.scoutingLevel)}`}
                  >
                    {levelLabel(prospect.scoutingLevel)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Overall</p>
                      <p className="font-semibold text-white">{prospect.visibleOverall}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Potential</p>
                      <p className="font-semibold text-white">{prospect.visiblePotential}</p>
                    </div>
                  </div>
                  {prospect.strengths.length > 0 ? (
                    <p className="mt-2 text-xs text-emerald-100">
                      Strengths: {prospect.strengths.join(", ")}
                    </p>
                  ) : null}
                  {prospect.weaknesses.length > 0 ? (
                    <p className="mt-1 text-xs text-rose-100">
                      Weaknesses: {prospect.weaknesses.join(", ")}
                    </p>
                  ) : null}
                  {prospect.notes ? (
                    <p className="mt-2 rounded-md border border-white/8 bg-black/10 px-2 py-1 text-xs text-slate-300">
                      {prospect.notes}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <form action={scoutProspectAction}>
                    <input type="hidden" name="saveGameId" value={saveGameId} />
                    <input type="hidden" name="draftPlayerId" value={prospect.id} />
                    <FormSubmitButton pendingLabel="Scoutet...">
                      {isComplete ? "Scout" : "Scout"}
                    </FormSubmitButton>
                  </form>
                  <p className="mt-2 text-xs text-slate-500">
                    {isComplete
                      ? "Maximales MVP-Scouting erreicht."
                      : "Erhoeht das Scouting-Level um eine Stufe."}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
