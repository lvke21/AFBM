type TeamScheduleSeed = {
  id: string;
  city: string;
  abbreviation: string;
};

export type ScheduledMatchSeed = {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  stadiumName: string;
};

function rotateTeams(teams: TeamScheduleSeed[]) {
  const [anchor, ...rest] = teams;
  const last = rest.pop();

  if (!anchor || !last) {
    return teams;
  }

  return [anchor, last, ...rest];
}

function buildSingleRoundRobin(teams: TeamScheduleSeed[]) {
  const teamPool = [...teams].sort((left, right) =>
    left.abbreviation.localeCompare(right.abbreviation),
  );

  if (teamPool.length % 2 !== 0) {
    throw new Error("Double round robin requires an even number of teams.");
  }

  const rounds: Array<Array<{ home: TeamScheduleSeed; away: TeamScheduleSeed }>> = [];
  let rotation = [...teamPool];

  for (let roundIndex = 0; roundIndex < teamPool.length - 1; roundIndex += 1) {
    const pairings: Array<{ home: TeamScheduleSeed; away: TeamScheduleSeed }> = [];

    for (let pairIndex = 0; pairIndex < rotation.length / 2; pairIndex += 1) {
      const homeCandidate = rotation[pairIndex];
      const awayCandidate = rotation[rotation.length - 1 - pairIndex];

      if (roundIndex % 2 === 0) {
        pairings.push({ home: homeCandidate, away: awayCandidate });
      } else {
        pairings.push({ home: awayCandidate, away: homeCandidate });
      }
    }

    rounds.push(pairings);
    rotation = rotateTeams(rotation);
  }

  return rounds;
}

export function buildDoubleRoundRobinSchedule(
  teams: TeamScheduleSeed[],
  seasonYear: number,
) {
  if (teams.length < 2) {
    return [];
  }

  const firstLeg = buildSingleRoundRobin(teams);
  const secondLeg = firstLeg.map((round) =>
    round.map((match) => ({
      home: match.away,
      away: match.home,
    })),
  );

  return [...firstLeg, ...secondLeg].flatMap((round, weekIndex) =>
    round.map((match, pairingIndex) => ({
      week: weekIndex + 1,
      homeTeamId: match.home.id,
      awayTeamId: match.away.id,
      scheduledAt: new Date(
        Date.UTC(seasonYear, 8, weekIndex * 7 + pairingIndex + 1, 18, 0, 0),
      ),
      stadiumName: `${match.home.city} Stadium`,
    })),
  );
}
