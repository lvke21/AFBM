import { SectionPanel } from "@/components/layout/section-panel";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  DEFENSE_SCHEMES,
  OFFENSE_SCHEMES,
  SPECIAL_TEAMS_SCHEMES,
} from "@/components/team/team-overview-model";

import {
  buildGamePreparationView,
  type GamePreparationMatch,
  type GamePreparationTeam,
} from "./game-preparation-model";

type GamePreparationPanelProps = {
  saveGameId: string;
  matchId: string;
  match: GamePreparationMatch;
  updateAction: (formData: FormData) => Promise<void>;
};

function formatScheme(team: GamePreparationTeam, key: keyof GamePreparationTeam["schemes"]) {
  return team.schemes[key]?.name ?? "Nicht gesetzt";
}

function schemeValue(
  team: GamePreparationTeam,
  key: keyof GamePreparationTeam["schemes"],
  fallback: string,
) {
  return team.schemes[key]?.code ?? fallback;
}

const X_FACTOR_OPTIONS = {
  offensiveFocus: [
    ["RUN_FIRST", "Run first"],
    ["BALANCED", "Balanced"],
    ["PASS_FIRST", "Pass first"],
  ],
  defensiveFocus: [
    ["STOP_RUN", "Stop run"],
    ["BALANCED", "Balanced"],
    ["LIMIT_PASS", "Limit pass"],
  ],
  aggression: [
    ["CONSERVATIVE", "Conservative"],
    ["BALANCED", "Balanced"],
    ["AGGRESSIVE", "Aggressive"],
  ],
  tempoPlan: [
    ["SLOW", "Slow"],
    ["NORMAL", "Normal"],
    ["HURRY_UP", "Hurry up"],
  ],
  protectionPlan: [
    ["MAX_PROTECT", "Max protect"],
    ["STANDARD", "Standard"],
    ["FAST_RELEASE", "Fast release"],
  ],
  offensiveMatchupFocus: [
    ["FEATURE_WR", "Feature WR"],
    ["FEATURE_TE", "Feature TE"],
    ["FEATURE_RB", "Feature RB"],
    ["PROTECT_QB", "Protect QB"],
    ["BALANCED", "Balanced"],
  ],
  defensiveMatchupFocus: [
    ["DOUBLE_WR1", "Double WR1"],
    ["SPY_QB", "Spy QB"],
    ["BRACKET_TE", "Bracket TE"],
    ["ATTACK_WEAK_OL", "Attack weak OL"],
    ["BALANCED", "Balanced"],
  ],
  turnoverPlan: [
    ["PROTECT_BALL", "Protect ball"],
    ["BALANCED", "Balanced"],
    ["HUNT_TURNOVERS", "Hunt turnovers"],
  ],
} as const;

function XFactorSelect({
  defaultValue,
  label,
  name,
  options,
  tradeoff,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: readonly (readonly [string, string])[];
  tradeoff: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
      >
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
      <span className="text-xs leading-5 text-slate-500">{tradeoff}</span>
    </label>
  );
}

export function GamePreparationPanel({
  saveGameId,
  matchId,
  match,
  updateAction,
}: GamePreparationPanelProps) {
  const preparation = buildGamePreparationView(match);

  if (!preparation) {
    return (
      <SectionPanel
        title="Spielvorbereitung"
        description="Dieses Match enthaelt kein vom GM gesteuertes Team."
        tone="subtle"
      >
        <p className="text-sm text-slate-400">
          Gameplan-Anpassungen sind nur fuer das eigene Team verfuegbar.
        </p>
      </SectionPanel>
    );
  }

  const { managerTeam, opponent } = preparation;

  return (
    <SectionPanel
      title="Spielvorbereitung"
      description={`${managerTeam.abbreviation} bereitet sich auf ${opponent.abbreviation} vor.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.3fr]">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Gegner
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{opponent.name}</h3>
          <dl className="mt-4 grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <dt>Overall</dt>
              <dd className="font-semibold text-white">{opponent.overallRating}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Morale</dt>
              <dd>{opponent.morale}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Defense</dt>
              <dd className="text-right">{formatScheme(opponent, "defense")}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Matchup Expectation
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {preparation.expectation.category}
          </h3>
          <dl className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <dt className="text-xs text-slate-500">Staerkevergleich</dt>
              <dd className="mt-1 font-semibold text-white">
                {managerTeam.overallRating}:{opponent.overallRating}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <dt className="text-xs text-slate-500">Schwierigkeit</dt>
              <dd className="mt-1 font-semibold text-white">
                {preparation.strengthLabel}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <dt className="text-xs text-slate-500">Zielkorridor</dt>
              <dd className="mt-1 font-semibold text-white">
                {preparation.expectation.expectedPointsFloor}+ Punkte
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {preparation.expectation.summary}
          </p>
          {preparation.underdogObjectives.length > 0 ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Underdog Objectives
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {preparation.underdogObjectives.map((objective) => (
                  <article
                    key={objective.id}
                    className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-white">{objective.title}</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-100">{objective.target}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {objective.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Eigene Staerke
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{managerTeam.name}</h3>
          <dl className="mt-4 grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <dt>Overall</dt>
              <dd className="font-semibold text-white">{managerTeam.overallRating}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Morale</dt>
              <dd>{managerTeam.morale}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Matchup</dt>
              <dd className="font-semibold text-emerald-200">
                {preparation.strengthLabel} {preparation.strengthDelta >= 0 ? "+" : ""}
                {preparation.strengthDelta}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Gameplan
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {preparation.canEditGameplan ? "Anpassen" : "Fixiert"}
          </h3>

          {preparation.canEditGameplan ? (
            <form action={updateAction} className="mt-4 grid gap-3">
              <input type="hidden" name="saveGameId" value={saveGameId} />
              <input type="hidden" name="matchId" value={matchId} />
              <input type="hidden" name="teamId" value={managerTeam.id} />
              <label className="grid gap-2 text-sm text-slate-300">
                Offense
                <select
                  name="offenseSchemeCode"
                  defaultValue={schemeValue(managerTeam, "offense", "BALANCED_OFFENSE")}
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
                  defaultValue={schemeValue(managerTeam, "defense", "FOUR_THREE_FRONT")}
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
                  defaultValue={schemeValue(managerTeam, "specialTeams", "FIELD_POSITION")}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                >
                  {SPECIAL_TEAMS_SCHEMES.map((scheme) => (
                    <option key={scheme.code} value={scheme.code}>
                      {scheme.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 grid gap-3 border-t border-white/10 pt-3 md:grid-cols-2">
                <XFactorSelect
                  label="Offensive Focus"
                  name="offensiveFocus"
                  defaultValue={preparation.offenseXFactorPlan.offensiveFocus}
                  options={X_FACTOR_OPTIONS.offensiveFocus}
                  tradeoff="Run-first controls variance; pass-first raises explosive upside."
                />
                <XFactorSelect
                  label="Protection"
                  name="protectionPlan"
                  defaultValue={preparation.offenseXFactorPlan.protectionPlan}
                  options={X_FACTOR_OPTIONS.protectionPlan}
                  tradeoff="Max protect lowers sacks; fast release gives up deeper routes."
                />
                <XFactorSelect
                  label="Tempo"
                  name="tempoPlan"
                  defaultValue={preparation.offenseXFactorPlan.tempoPlan}
                  options={X_FACTOR_OPTIONS.tempoPlan}
                  tradeoff="Hurry-up creates snaps; slow tempo protects tired defenses."
                />
                <XFactorSelect
                  label="Offense Matchup"
                  name="offensiveMatchupFocus"
                  defaultValue={preparation.offenseXFactorPlan.offensiveMatchupFocus}
                  options={X_FACTOR_OPTIONS.offensiveMatchupFocus}
                  tradeoff="Feature a matchup or keep distribution balanced."
                />
                <XFactorSelect
                  label="Defensive Focus"
                  name="defensiveFocus"
                  defaultValue={preparation.defenseXFactorPlan.defensiveFocus}
                  options={X_FACTOR_OPTIONS.defensiveFocus}
                  tradeoff="Stop-run and limit-pass calls trade efficiency for exposure elsewhere."
                />
                <XFactorSelect
                  label="Defense Matchup"
                  name="defensiveMatchupFocus"
                  defaultValue={preparation.defenseXFactorPlan.defensiveMatchupFocus}
                  options={X_FACTOR_OPTIONS.defensiveMatchupFocus}
                  tradeoff="Brackets and spies solve one threat while loosening another."
                />
                <XFactorSelect
                  label="Offense Risk"
                  name="offenseAggression"
                  defaultValue={preparation.offenseXFactorPlan.aggression}
                  options={X_FACTOR_OPTIONS.aggression}
                  tradeoff="Aggressive play raises ceiling and turnover exposure."
                />
                <XFactorSelect
                  label="Defense Risk"
                  name="defenseAggression"
                  defaultValue={preparation.defenseXFactorPlan.aggression}
                  options={X_FACTOR_OPTIONS.aggression}
                  tradeoff="Aggressive defense creates pressure and misses."
                />
                <XFactorSelect
                  label="Ball Security"
                  name="offenseTurnoverPlan"
                  defaultValue={preparation.offenseXFactorPlan.turnoverPlan}
                  options={X_FACTOR_OPTIONS.turnoverPlan}
                  tradeoff="Protect ball lowers giveaways; hunting variance can cost efficiency."
                />
                <XFactorSelect
                  label="Takeaway Plan"
                  name="defenseTurnoverPlan"
                  defaultValue={preparation.defenseXFactorPlan.turnoverPlan}
                  options={X_FACTOR_OPTIONS.turnoverPlan}
                  tradeoff="Hunt turnovers creates splash chances and missed tackles."
                />
              </div>
              <FormSubmitButton pendingLabel="Gameplan wird gespeichert...">
                Gameplan speichern
              </FormSubmitButton>
            </form>
          ) : (
            <dl className="mt-4 grid gap-2 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <dt>Offense</dt>
                <dd className="text-right">{formatScheme(managerTeam, "offense")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Defense</dt>
                <dd className="text-right">{formatScheme(managerTeam, "defense")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Special Teams</dt>
                <dd className="text-right">{formatScheme(managerTeam, "specialTeams")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Offensive Focus</dt>
                <dd className="text-right">{preparation.offenseXFactorPlan.offensiveFocus}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Defensive Focus</dt>
                <dd className="text-right">{preparation.defenseXFactorPlan.defensiveFocus}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}
