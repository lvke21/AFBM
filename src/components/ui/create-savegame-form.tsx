import { createSaveGameAction } from "@/app/app/savegames/actions";
import { FRANCHISE_TEMPLATES } from "@/modules/shared/infrastructure/reference-data";

import { FormSubmitButton } from "./form-submit-button";

type CreateSaveGameFormProps = {
  disabled?: boolean;
  disabledReason?: string | null;
};

export function CreateSaveGameForm({
  disabled = false,
  disabledReason = null,
}: CreateSaveGameFormProps) {
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
          disabled={disabled}
          placeholder="Dynasty 2026"
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-200">User-Team</span>
        <select
          name="managerTeamAbbreviation"
          defaultValue={FRANCHISE_TEMPLATES[0]?.abbreviation}
          disabled={disabled}
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
        <FormSubmitButton disabled={disabled} pendingLabel="Savegame wird erstellt...">
          Offline Spielen
        </FormSubmitButton>
      </div>

      {disabledReason ? (
        <p className="text-sm leading-6 text-amber-100 lg:col-span-3">{disabledReason}</p>
      ) : null}
    </form>
  );
}
