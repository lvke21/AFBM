export type SeasonStandingRow = {
  teamId: string;
  name: string;
  abbreviation: string;
  overallRating: number;
  record: string;
  pointsFor: number;
  pointsAgainst: number;
  touchdownsFor: number;
  turnoversForced: number;
  turnoversCommitted: number;
  turnoverDifferential: number;
  passingYards: number;
  rushingYards: number;
  sacks: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
};

export type SeasonMatchSummary = {
  id: string;
  week: number;
  kind: string;
  scheduledAt: Date;
  status: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type SeasonOverview = {
  id: string;
  year: number;
  phase: string;
  week: number;
  championName: string | null;
  playoffPicture: Array<{
    seed: number;
    teamId: string;
    name: string;
    record: string;
  }>;
  standings: SeasonStandingRow[];
  matches: SeasonMatchSummary[];
};
