import type { OnlineContractPlayer, OnlineDepthChartEntry } from "./online-league-types";

export function createDefaultOnlineDepthChart(
  roster: OnlineContractPlayer[],
  now = new Date().toISOString(),
): OnlineDepthChartEntry[] {
  const playersByPosition = new Map<string, OnlineContractPlayer[]>();

  roster
    .filter((player) => player.status === "active")
    .forEach((player) => {
      playersByPosition.set(player.position, [
        ...(playersByPosition.get(player.position) ?? []),
        player,
      ]);
    });

  return Array.from(playersByPosition.entries())
    .map(([position, players]) => {
      const sortedPlayers = [...players].sort((left, right) => right.overall - left.overall);
      const starter = sortedPlayers[0];

      return starter
        ? {
            position,
            starterPlayerId: starter.playerId,
            backupPlayerIds: sortedPlayers.slice(1).map((player) => player.playerId),
            updatedAt: now,
          }
        : null;
    })
    .filter((entry): entry is OnlineDepthChartEntry => Boolean(entry));
}

export function validateOnlineDepthChartForRoster(
  roster: OnlineContractPlayer[],
  depthChart: OnlineDepthChartEntry[],
) {
  const activeRoster = roster.filter((player) => player.status === "active");
  const activePlayerIds = new Set(activeRoster.map((player) => player.playerId));
  const positions = new Set(activeRoster.map((player) => player.position));
  const usedStarters = new Set<string>();

  return depthChart.every((entry) => {
    if (!positions.has(entry.position) || !activePlayerIds.has(entry.starterPlayerId)) {
      return false;
    }

    if (usedStarters.has(entry.starterPlayerId)) {
      return false;
    }

    usedStarters.add(entry.starterPlayerId);

    return entry.backupPlayerIds.every(
      (playerId) => playerId !== entry.starterPlayerId && activePlayerIds.has(playerId),
    );
  });
}
