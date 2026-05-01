import { describe, expect, it } from "vitest";

import {
  FIREBASE_AUTH_LOADING_COPY,
  createFirebaseAuthErrorState,
  createFirebaseAuthStateFromUser,
} from "./firebase-auth-state";

describe("firebase-auth-state", () => {
  it("uses the requested loading copy", () => {
    expect(FIREBASE_AUTH_LOADING_COPY).toBe("Authentifizierung wird geprüft...");
  });

  it("maps a missing Firebase user to not authenticated", () => {
    expect(createFirebaseAuthStateFromUser(null)).toEqual({
      status: "not-authenticated",
      user: null,
      errorMessage: null,
    });
  });

  it("maps a Firebase user to authenticated state", () => {
    expect(
      createFirebaseAuthStateFromUser({
        uid: "firebase-user-1",
        email: "gm@example.test",
        displayName: "GM One",
        isAnonymous: false,
        providerData: [
          {
            providerId: "password",
            uid: "gm@example.test",
            email: "gm@example.test",
            displayName: "GM One",
          },
        ],
      }),
    ).toEqual({
      status: "authenticated",
      errorMessage: null,
      user: {
        uid: "firebase-user-1",
        email: "gm@example.test",
        displayName: "GM One",
        isAnonymous: false,
        providerData: [
          {
            providerId: "password",
            uid: "gm@example.test",
            email: "gm@example.test",
            displayName: "GM One",
          },
        ],
      },
    });
  });

  it("keeps listener failures explicit without authenticating the user", () => {
    expect(createFirebaseAuthErrorState("Firebase Auth konnte nicht initialisiert werden.")).toEqual(
      {
        status: "not-authenticated",
        user: null,
        errorMessage: "Firebase Auth konnte nicht initialisiert werden.",
      },
    );
  });
});
