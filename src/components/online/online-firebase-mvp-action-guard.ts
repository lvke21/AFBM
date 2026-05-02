import type { OnlineBackendMode } from "@/lib/online/types";

export const FIREBASE_MVP_LOCAL_ACTION_MESSAGE =
  "Diese Aktion ist im Firebase-Multiplayer noch nicht synchronisiert. Es wurden keine lokalen Ersatzdaten geschrieben.";

type FirebaseMvpActionGuardInput = {
  mode: OnlineBackendMode;
  setFeedback: (message: string) => void;
};

export function guardFirebaseMvpLocalAction({
  mode,
  setFeedback,
}: FirebaseMvpActionGuardInput) {
  if (mode !== "firebase") {
    return false;
  }

  setFeedback(FIREBASE_MVP_LOCAL_ACTION_MESSAGE);
  return true;
}
