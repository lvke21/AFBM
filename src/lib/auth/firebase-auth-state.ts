export const FIREBASE_AUTH_LOADING_COPY = "Authentifizierung wird geprüft...";

export type FirebaseAuthStatus = "loading" | "not-authenticated" | "authenticated";

export type FirebaseAuthProviderData = {
  providerId: string;
  uid: string | null;
  email: string | null;
  displayName: string | null;
};

export type FirebaseAuthUserState = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  providerData: FirebaseAuthProviderData[];
};

export type FirebaseAuthState = {
  status: FirebaseAuthStatus;
  user: FirebaseAuthUserState | null;
  errorMessage: string | null;
};

export type FirebaseAuthUserLike = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  providerData: Array<{
    providerId: string;
    uid: string | null;
    email: string | null;
    displayName: string | null;
  }>;
};

export const INITIAL_FIREBASE_AUTH_STATE: FirebaseAuthState = {
  status: "loading",
  user: null,
  errorMessage: null,
};

export function createFirebaseAuthStateFromUser(
  user: FirebaseAuthUserLike | null,
): FirebaseAuthState {
  if (!user) {
    return {
      status: "not-authenticated",
      user: null,
      errorMessage: null,
    };
  }

  return {
    status: "authenticated",
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      providerData: user.providerData.map((provider) => ({
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName,
      })),
    },
    errorMessage: null,
  };
}

export function createFirebaseAuthErrorState(errorMessage: string): FirebaseAuthState {
  return {
    status: "not-authenticated",
    user: null,
    errorMessage,
  };
}
