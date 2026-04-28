export type SaveGameListItem = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  weekState: "PRE_WEEK" | "READY" | "GAME_RUNNING" | "POST_GAME";
  leagueName: string;
  currentSeasonLabel: string;
  teamCount: number;
  playerCount: number;
  updatedAt: Date;
};

export type SaveGameTeamSummary = {
  id: string;
  name: string;
  abbreviation: string;
  conferenceName: string;
  divisionName: string;
  managerControlled: boolean;
  overallRating: number;
  rosterSize: number;
  salaryCapSpace: number;
  currentRecord: string;
};

export type SaveGameSeasonSummary = {
  id: string;
  year: number;
  phase: string;
  week: number;
  matchCount: number;
};

export type SaveGameDetail = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  weekState: "PRE_WEEK" | "READY" | "GAME_RUNNING" | "POST_GAME";
  leagueName: string;
  createdAt: Date;
  updatedAt: Date;
  currentSeason: {
    id: string;
    year: number;
    phase: string;
    week: number;
  } | null;
  settings: {
    salaryCap: number;
    activeRosterLimit: number;
    practiceSquadSize: number;
    seasonLengthWeeks: number;
  } | null;
  teams: SaveGameTeamSummary[];
  seasons: SaveGameSeasonSummary[];
};

export type SaveGameFlowSnapshot = {
  saveGame: SaveGameDetail;
  featuredTeamId: string | null;
  currentSeasonId: string | null;
};
