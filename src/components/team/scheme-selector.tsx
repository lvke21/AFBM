import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import {
  DEFENSE_SCHEMES,
  OFFENSE_SCHEMES,
  SPECIAL_TEAMS_SCHEMES,
  selectSchemeCode,
} from "./team-overview-model";

type SchemeSelectorProps = {
  saveGameId: string;
  team: TeamDetail;
  updateAction: (formData: FormData) => Promise<void>;
};

export function SchemeSelector({ saveGameId, team, updateAction }: SchemeSelectorProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Scheme
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Scheme Identity</h2>
      <p className="mt-2 text-sm text-slate-300">
        Offense, Defense und Special Teams beeinflussen Scheme Fit und Kaderbewertung.
      </p>

      {team.managerControlled ? (
        <form action={updateAction} className="mt-5 grid gap-3">
          <input type="hidden" name="saveGameId" value={saveGameId} />
          <input type="hidden" name="teamId" value={team.id} />
          <label className="grid gap-2 text-sm text-slate-300">
            Offense
            <select
              name="offenseSchemeCode"
              defaultValue={selectSchemeCode(
                OFFENSE_SCHEMES,
                team.schemes.offense,
                "BALANCED_OFFENSE",
              )}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            >
              {OFFENSE_SCHEMES.map((scheme) => (
                <option key={scheme.code} value={scheme.code}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Defense
            <select
              name="defenseSchemeCode"
              defaultValue={selectSchemeCode(
                DEFENSE_SCHEMES,
                team.schemes.defense,
                "FOUR_THREE_FRONT",
              )}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            >
              {DEFENSE_SCHEMES.map((scheme) => (
                <option key={scheme.code} value={scheme.code}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Special Teams
            <select
              name="specialTeamsSchemeCode"
              defaultValue={selectSchemeCode(
                SPECIAL_TEAMS_SCHEMES,
                team.schemes.specialTeams,
                "FIELD_POSITION",
              )}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            >
              {SPECIAL_TEAMS_SCHEMES.map((scheme) => (
                <option key={scheme.code} value={scheme.code}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </label>
          <FormSubmitButton pendingLabel="Schemes werden gespeichert...">
            Schemes speichern
          </FormSubmitButton>
        </form>
      ) : (
        <div className="mt-5 space-y-3 text-sm text-slate-300">
          <p>Offense: {team.schemes.offense ?? "n/a"}</p>
          <p>Defense: {team.schemes.defense ?? "n/a"}</p>
          <p>Special Teams: {team.schemes.specialTeams ?? "n/a"}</p>
          <p className="rounded-lg border border-white/8 bg-black/10 p-3 text-xs text-slate-400">
            Dieses Team wird nicht vom Nutzer gesteuert. Schemes sind readonly.
          </p>
        </div>
      )}
    </section>
  );
}
