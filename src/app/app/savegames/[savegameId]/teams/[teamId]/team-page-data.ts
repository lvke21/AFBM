export type TeamRouteParams = {
  savegameId: string;
  teamId: string;
};

export type TeamRoutePageProps = {
  params: Promise<TeamRouteParams>;
};
