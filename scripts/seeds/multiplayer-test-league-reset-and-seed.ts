import { resetMultiplayerTestLeague } from "./multiplayer-test-league-reset";
import { seedMultiplayerTestLeague } from "./multiplayer-test-league-firestore-seed";
import { seedMultiplayerPlayerPool } from "./multiplayer-player-pool-firestore-seed";
import { prepareMultiplayerDraft } from "./multiplayer-draft-prep-firestore-seed";
import { validateMultiplayerSeedWorkflow } from "./multiplayer-test-league-validate";

export async function resetAndSeedMultiplayerTestLeague() {
  const reset = await resetMultiplayerTestLeague();
  const league = await seedMultiplayerTestLeague();
  const players = await seedMultiplayerPlayerPool();
  const draft = await prepareMultiplayerDraft();
  const validation = await validateMultiplayerSeedWorkflow();

  if (!validation.ok) {
    throw new Error(`Multiplayer seed validation failed: ${validation.issues.join("; ")}`);
  }

  return {
    reset,
    league,
    players,
    draft,
    validation,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetAndSeedMultiplayerTestLeague()
    .then((summary) => {
      console.log("Multiplayer reset + seed completed.");
      console.log(JSON.stringify({
        reset: summary.reset,
        league: summary.league,
        playerCount: summary.players.count,
        draft: summary.draft,
        validation: summary.validation.summary,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
