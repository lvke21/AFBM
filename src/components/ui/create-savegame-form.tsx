"use client";

import { createSaveGameAction } from "@/app/app/savegames/actions";
import { openSavegamesLogin } from "@/components/auth/auth-required-actions";
import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { FRANCHISE_TEMPLATES } from "@/modules/shared/infrastructure/reference-data";

import { FormSubmitButton } from "./form-submit-button";

type CreateSaveGameFormProps = {
  disabled?: boolean;
  disabledReason?: string | null;
  requiresFirebaseAuth?: boolean;
};

export function CreateSaveGameForm({
  disabled = false,
  disabledReason = null,
  requiresFirebaseAuth = false,
}: CreateSaveGameFormProps) {
  const authState = useFirebaseAuthState();
  const authLocked = requiresFirebaseAuth && !authState.isAuthenticated;
  const isDisabled = disabled || authLocked;
  const reason =
    authLocked
      ? "Melde dich an, um zu spielen."
      : disabledReason;

  return (
    <form action={createSaveGameAction} className="grid gap-4 lg:grid-cols-[1.5fr_1fr_auto]">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-200">Dynasty-Name</span>
        <input
          type="text"
          name="name"
          required
          minLength={3}
          maxLength={60}
          disabled={isDisabled}
          placeholder="Dynasty 2026"
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-200">User-Team</span>
        <select
          name="managerTeamAbbreviation"
          defaultValue={FRANCHISE_TEMPLATES[0]?.abbreviation}
          disabled={isDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 focus:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {FRANCHISE_TEMPLATES.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.city} {team.nickname}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        {authLocked ? (
          <button
            type="button"
            aria-disabled="true"
            onClick={openSavegamesLogin}
            className="cursor-not-allowed rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 opacity-60 transition hover:bg-emerald-400/16"
          >
            Offline Spielen
          </button>
        ) : (
          <FormSubmitButton disabled={disabled} pendingLabel="Savegame wird erstellt...">
            Offline Spielen
          </FormSubmitButton>
        )}
      </div>

      {reason ? (
        <p className="text-sm leading-6 text-amber-100 lg:col-span-3">{reason}</p>
      ) : null}
    </form>
  );
}
