import type { OnlineLeagueTeam } from "./online-league-types";

export const ONLINE_LEAGUES_STORAGE_KEY = "afbm.online.leagues";
export const ONLINE_LAST_LEAGUE_ID_STORAGE_KEY = "afbm.online.lastLeagueId";
export const GLOBAL_TEST_LEAGUE_ID = "global-test-league";

export const ONLINE_MVP_TEAM_POOL: OnlineLeagueTeam[] = [
  { id: "bos-guardians", name: "Boston Guardians", abbreviation: "BOS" },
  { id: "nyt-titans", name: "New York Titans", abbreviation: "NYT" },
  { id: "mia-cyclones", name: "Miami Cyclones", abbreviation: "MIA" },
  { id: "hou-outlaws", name: "Houston Outlaws", abbreviation: "HOU" },
  { id: "chi-blizzard", name: "Chicago Blizzard", abbreviation: "CHI" },
  { id: "det-iron", name: "Detroit Iron", abbreviation: "DET" },
  { id: "sdg-breakers", name: "San Diego Breakers", abbreviation: "SDG" },
  { id: "sea-orcas", name: "Seattle Orcas", abbreviation: "SEA" },
  { id: "atl-firebirds", name: "Atlanta Firebirds", abbreviation: "ATL" },
  { id: "den-mountaineers", name: "Denver Mountaineers", abbreviation: "DEN" },
  { id: "phx-scorch", name: "Phoenix Scorch", abbreviation: "PHX" },
  { id: "lvk-knights", name: "Las Vegas Knights", abbreviation: "LVK" },
  { id: "por-lumberjacks", name: "Portland Lumberjacks", abbreviation: "POR" },
  { id: "stl-archers", name: "St. Louis Archers", abbreviation: "STL" },
  { id: "orl-storm", name: "Orlando Storm", abbreviation: "ORL" },
  { id: "sac-condors", name: "Sacramento Condors", abbreviation: "SAC" },
];
