"use client";

import Link from "next/link";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { getRosterActionState } from "./roster-model";

type RosterActionMenuProps = {
  managerControlled: boolean;
  player: TeamPlayerSummary;
  releasePlayerAction?: (formData: FormData) => Promise<void>;
  saveGameId: string;
  teamId: string;
};

export function RosterActionMenu({
  managerControlled,
  player,
  releasePlayerAction,
  saveGameId,
  teamId,
}: RosterActionMenuProps) {
  const actionState = getRosterActionState(player, managerControlled);

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/app/savegames/${saveGameId}/players/${player.id}`}
        className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
      >
        Profil
      </Link>
      {actionState.canRelease && releasePlayerAction ? (
        <form action={releasePlayerAction}>
          <input type="hidden" name="saveGameId" value={saveGameId} />
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="playerId" value={player.id} />
          <FormSubmitButton pendingLabel="Release...">Release</FormSubmitButton>
        </form>
      ) : (
        <span className="inline-flex min-h-9 items-center rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400">
          {actionState.releaseReason}
        </span>
      )}
    </div>
  );
}
