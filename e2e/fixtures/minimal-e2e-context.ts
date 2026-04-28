import {
  PARITY_TEST_EMAIL,
  PARITY_TEST_PASSWORD,
  PRISMA_PARITY_IDS,
} from "../../scripts/seeds/parity-fixture";

export const E2E_TEST_EMAIL = PARITY_TEST_EMAIL;
export const E2E_TEST_PASSWORD = PARITY_TEST_PASSWORD;

export const E2E_TEST_IDS = {
  ...PRISMA_PARITY_IDS,
} as const;

export const E2E_TEST_ROUTES = {
  dashboard: `/app/savegames/${E2E_TEST_IDS.saveGameId}`,
  draft: `/app/savegames/${E2E_TEST_IDS.saveGameId}/draft`,
} as const;

export const E2E_TEST_LABELS = {
  managerTeamName: "Boston Guardians",
  opponentTeamName: "New York Titans",
  saveGameName: "E2E Minimal Savegame",
} as const;
