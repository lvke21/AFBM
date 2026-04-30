export type LeagueUser = {
  userId: string;
  username: string;
};

export type League = {
  id: string;
  name: string;
  users: LeagueUser[];
  maxUsers: number;
  status: "waiting" | "active";
};

export type JoinLeagueResult =
  | {
      status: "joined" | "already-member";
      league: League;
    }
  | {
      status: "full";
      league: League;
      message: string;
    };

export const GLOBAL_LEAGUE_STORAGE_KEY = "afbm.multiplayer.leagues.global";
export const LAST_LEAGUE_ID_STORAGE_KEY = "afbm.multiplayer.lastLeagueId";

type LeagueStorage = Pick<Storage, "getItem" | "setItem">;

function getBrowserStorage(): LeagueStorage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("League state is only available in the browser.");
  }

  return window.localStorage;
}

function createInitialLeague(): League {
  return {
    id: "global-league",
    name: "Global Test League",
    users: [],
    maxUsers: 16,
    status: "waiting",
  };
}

function isLeague(value: unknown): value is League {
  if (!value || typeof value !== "object") {
    return false;
  }

  const league = value as Partial<League>;

  return (
    typeof league.id === "string" &&
    typeof league.name === "string" &&
    Array.isArray(league.users) &&
    league.users.every(
      (user) =>
        typeof user === "object" &&
        user !== null &&
        typeof (user as Partial<LeagueUser>).userId === "string" &&
        typeof (user as Partial<LeagueUser>).username === "string",
    ) &&
    typeof league.maxUsers === "number" &&
    (league.status === "waiting" || league.status === "active")
  );
}

function readStoredLeague(storage: LeagueStorage): League | null {
  const rawLeague = storage.getItem(GLOBAL_LEAGUE_STORAGE_KEY);

  if (!rawLeague) {
    return null;
  }

  try {
    const parsedLeague = JSON.parse(rawLeague) as unknown;
    return isLeague(parsedLeague) ? parsedLeague : null;
  } catch {
    return null;
  }
}

function isValidStoredValue(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function saveLeague(
  league: League,
  storage: LeagueStorage = getBrowserStorage(),
): League {
  storage.setItem(GLOBAL_LEAGUE_STORAGE_KEY, JSON.stringify(league));
  return league;
}

export function getLeague(storage: LeagueStorage = getBrowserStorage()): League {
  const storedLeague = readStoredLeague(storage);

  if (storedLeague) {
    return storedLeague;
  }

  return saveLeague(createInitialLeague(), storage);
}

export function getLeagueById(
  leagueId: string,
  storage: LeagueStorage = getBrowserStorage(),
): League | null {
  const league = getLeague(storage);

  return league.id === leagueId ? league : null;
}

export function getLastLeagueId(storage: LeagueStorage = getBrowserStorage()): string | null {
  const storedLeagueId = storage.getItem(LAST_LEAGUE_ID_STORAGE_KEY);

  return isValidStoredValue(storedLeagueId) ? storedLeagueId : null;
}

export function resetLeague(storage: LeagueStorage = getBrowserStorage()): League {
  return saveLeague(createInitialLeague(), storage);
}

export function joinLeague(
  user: LeagueUser,
  storage: LeagueStorage = getBrowserStorage(),
): JoinLeagueResult {
  const league = getLeague(storage);
  const existingUser = league.users.some((leagueUser) => leagueUser.userId === user.userId);

  if (existingUser) {
    storage.setItem(LAST_LEAGUE_ID_STORAGE_KEY, league.id);

    return {
      status: "already-member",
      league,
    };
  }

  if (league.users.length >= league.maxUsers) {
    return {
      status: "full",
      league,
      message: "Liga ist voll",
    };
  }

  const updatedLeague = saveLeague(
    {
      ...league,
      users: [...league.users, user],
    },
    storage,
  );

  storage.setItem(LAST_LEAGUE_ID_STORAGE_KEY, updatedLeague.id);

  return {
    status: "joined",
    league: updatedLeague,
  };
}
