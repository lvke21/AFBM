# Rejoin Recovery Rules

## Current Rule

Membership is the canonical player-team relationship. A player may rejoin only when the active membership for the current `userId` points to a team and that team projection still points back to the same `userId`.

## Invariants

| Case | Behavior |
| --- | --- |
| Membership exists and `team.assignedUserId` matches | Rejoin succeeds. |
| Membership exists and `team.assignedUserId` is missing or different | Hard fail with membership projection conflict. |
| Team projection exists but membership is missing | Hard fail with `missing-membership-for-team:<teamId>`. No silent repair. |
| Membership exists but team document is missing | Hard fail with membership projection conflict. |
| Wrong user opens the league | Hard fail as missing player/membership. |
| Reload after simulation | Rejoin remains valid when membership and team projection are aligned. |

## Recovery Direction

Normal player UI must not create or repair one-sided relationships. Admin recovery may repair the projection only after inspecting both sides:

- membership userId/teamId
- team id/displayName/assignedUserId/status
- mirror leagueId/userId/teamId/status

The UI should show both team ID and team name in support/debug contexts. Team ID is the stable internal key; display name is a label only.

## Touched Code

- `src/lib/online/repositories/firebase-online-league-commands.ts`
- `src/lib/online/repositories/firebase-online-league-mappers.ts`
- `src/lib/online/online-league-service.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-league-route-state-model.ts`
