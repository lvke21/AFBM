export const ADMIN_LEAGUE_NAME_MIN_LENGTH = 3;
export const ADMIN_LEAGUE_NAME_MAX_LENGTH = 60;
export const ADMIN_LEAGUE_MAX_USERS_MIN = 2;
export const ADMIN_LEAGUE_MAX_USERS_MAX = 32;

type AdminLeagueFormValidationResult =
  | {
      ok: true;
      value: {
        name: string;
        maxUsers: number;
      };
    }
  | {
      ok: false;
      message: string;
    };

export function validateAdminLeagueForm(input: {
  name: string;
  maxUsers: number;
}): AdminLeagueFormValidationResult {
  const name = input.name.trim();
  const maxUsers = Math.floor(input.maxUsers);

  if (!name) {
    return { ok: false, message: "Liga Name ist erforderlich." };
  }

  if (name.length < ADMIN_LEAGUE_NAME_MIN_LENGTH) {
    return {
      ok: false,
      message: `Liga Name muss mindestens ${ADMIN_LEAGUE_NAME_MIN_LENGTH} Zeichen lang sein.`,
    };
  }

  if (name.length > ADMIN_LEAGUE_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Liga Name darf maximal ${ADMIN_LEAGUE_NAME_MAX_LENGTH} Zeichen lang sein.`,
    };
  }

  if (!Number.isFinite(input.maxUsers) || maxUsers !== input.maxUsers) {
    return { ok: false, message: "Max Spieler muss eine ganze Zahl sein." };
  }

  if (maxUsers < ADMIN_LEAGUE_MAX_USERS_MIN || maxUsers > ADMIN_LEAGUE_MAX_USERS_MAX) {
    return {
      ok: false,
      message: `Max Spieler muss zwischen ${ADMIN_LEAGUE_MAX_USERS_MIN} und ${ADMIN_LEAGUE_MAX_USERS_MAX} liegen.`,
    };
  }

  return {
    ok: true,
    value: {
      name,
      maxUsers,
    },
  };
}
