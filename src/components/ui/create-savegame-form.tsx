import { createSaveGameAction } from "@/app/app/savegames/actions";
import { FRANCHISE_TEMPLATES } from "@/modules/shared/infrastructure/reference-data";

import { FormSubmitButton } from "./form-submit-button";

export function CreateSaveGameForm() {
  return (
    <form action={createSaveGameAction} className="grid gap-4 lg:grid-cols-[1.5fr_1fr_auto]">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-200">Savegame-Name</span>
        <input
          type="text"
          name="name"
          required
          minLength={3}
          maxLength={60}
          placeholder="Dynasty 2026"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-200">User-Team</span>
        <select
          name="managerTeamAbbreviation"
          defaultValue={FRANCHISE_TEMPLATES[0]?.abbreviation}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0"
        >
          {FRANCHISE_TEMPLATES.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.city} {team.nickname}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <FormSubmitButton pendingLabel="Savegame wird erstellt...">
          Savegame erstellen
        </FormSubmitButton>
      </div>
    </form>
  );
}
