import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeProvider = {
  providerId: string;
};

type FakeUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  providerData: FakeProvider[];
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
};

type FakeAuth = {
  currentUser: FakeUser | null;
};

const mocks = vi.hoisted(() => ({
  authState: {
    currentUser: null as FakeUser | null,
  },
  emailCredential: vi.fn((email: string, password: string) => ({
    email,
    password,
  })),
  linkWithCredentialMock: vi.fn(),
  onAuthStateChangedMock: vi.fn(),
  signInAnonymouslyMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

function createFakeUser(input: Partial<FakeUser> = {}): FakeUser {
  return {
    uid: input.uid ?? "anon-uid",
    email: input.email ?? null,
    displayName: Object.hasOwn(input, "displayName")
      ? (input.displayName ?? null)
      : "Coach_Prime",
    isAnonymous: input.isAnonymous ?? true,
    providerData: input.providerData ?? [],
    metadata: {
      creationTime: "2026-04-30T10:00:00.000Z",
      lastSignInTime: "2026-04-30T10:05:00.000Z",
    },
  };
}

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseClientApp: vi.fn(() => ({ name: "test-app" })),
}));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credential: mocks.emailCredential,
  },
  getAuth: vi.fn(() => mocks.authState),
  linkWithCredential: mocks.linkWithCredentialMock,
  onAuthStateChanged: mocks.onAuthStateChangedMock,
  signInAnonymously: mocks.signInAnonymouslyMock,
  updateProfile: mocks.updateProfileMock,
}));

import {
  OnlineAccountLinkingError,
  mapOnlineAccountLinkingError,
  secureCurrentOnlineAccount,
} from "./account-linking";
import { getCurrentAuthenticatedOnlineUser } from "./online-auth";

describe("account linking", () => {
  beforeEach(() => {
    mocks.authState.currentUser = createFakeUser();
    mocks.emailCredential.mockClear();
    mocks.linkWithCredentialMock.mockReset();
    mocks.onAuthStateChangedMock.mockReset();
    mocks.signInAnonymouslyMock.mockReset();
    mocks.updateProfileMock.mockReset();

    mocks.onAuthStateChangedMock.mockImplementation(
      (auth: FakeAuth, callback: (user: FakeUser | null) => void) => {
        queueMicrotask(() => callback(auth.currentUser));

        return vi.fn();
      },
    );
    mocks.signInAnonymouslyMock.mockImplementation(async (auth: FakeAuth) => {
      const user = createFakeUser({ uid: "created-anon-uid", displayName: null });

      auth.currentUser = user;

      return { user };
    });
    mocks.linkWithCredentialMock.mockImplementation(
      async (user: FakeUser, credential: { email: string; password: string }) => {
        user.email = credential.email;
        user.isAnonymous = false;
        user.providerData = [{ providerId: "password" }];

        return { user };
      },
    );
    mocks.updateProfileMock.mockImplementation(
      async (user: FakeUser, profile: { displayName?: string }) => {
        if (profile.displayName) {
          user.displayName = profile.displayName;
        }
      },
    );
  });

  it("links an anonymous Firebase user without changing the UID", async () => {
    mocks.authState.currentUser = createFakeUser({ displayName: null });
    const membership = {
      leagueId: "league-alpha",
      userId: mocks.authState.currentUser?.uid,
      teamId: "team-alpha",
    };

    const result = await secureCurrentOnlineAccount({
      email: " coach@example.com ",
      password: "correct-horse-battery",
      displayName: " Coach Prime ",
    });

    expect(result).toMatchObject({
      status: "secured",
      userId: "anon-uid",
      email: "coach@example.com",
      displayName: "Coach_Prime",
      isAnonymous: false,
      providerIds: ["password"],
      uidPreserved: true,
    });
    expect(result.userId).toBe(membership.userId);
    expect(mocks.updateProfileMock).toHaveBeenCalledWith(mocks.authState.currentUser, {
      displayName: "Coach_Prime",
    });
  });

  it("creates an anonymous user first when no Firebase user exists", async () => {
    mocks.authState.currentUser = null;

    const result = await secureCurrentOnlineAccount({
      email: "rookie@example.com",
      password: "long-enough",
    });

    expect(mocks.signInAnonymouslyMock).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe("created-anon-uid");
    expect(result.uidPreserved).toBe(true);
  });

  it("keeps an already linked password account stable after reload", async () => {
    mocks.authState.currentUser = createFakeUser({
      uid: "stable-uid",
      email: "coach@example.com",
      isAnonymous: false,
      providerData: [{ providerId: "password" }],
    });

    const currentUser = await getCurrentAuthenticatedOnlineUser("firebase");
    const result = await secureCurrentOnlineAccount({
      email: "coach@example.com",
      password: "existing-password",
    });

    expect(currentUser.userId).toBe("stable-uid");
    expect(result).toMatchObject({
      status: "already-secured",
      userId: "stable-uid",
      uidPreserved: true,
    });
    expect(mocks.linkWithCredentialMock).not.toHaveBeenCalled();
  });

  it("does not switch accounts when the email is already in use", async () => {
    const originalUser = mocks.authState.currentUser;

    mocks.linkWithCredentialMock.mockRejectedValueOnce({
      code: "auth/email-already-in-use",
    });

    await expect(
      secureCurrentOnlineAccount({
        email: "taken@example.com",
        password: "long-enough",
      }),
    ).rejects.toMatchObject({
      code: "email-already-in-use",
    });
    expect(mocks.authState.currentUser).toBe(originalUser);
    expect(mocks.authState.currentUser?.uid).toBe("anon-uid");
    expect(mocks.authState.currentUser?.isAnonymous).toBe(true);
  });

  it("maps existing provider links to a concrete user-facing error", () => {
    const error = mapOnlineAccountLinkingError({ code: "auth/provider-already-linked" });

    expect(error).toBeInstanceOf(OnlineAccountLinkingError);
    expect(error.code).toBe("provider-already-linked");
    expect(error.message).toContain("bereits");
  });

  it("maps weak passwords to a user-facing error", () => {
    const error = mapOnlineAccountLinkingError({ code: "auth/weak-password" });

    expect(error).toBeInstanceOf(OnlineAccountLinkingError);
    expect(error.code).toBe("weak-password");
    expect(error.message).toContain("Passwort");
  });

  it("maps invalid emails to a user-facing error", () => {
    const error = mapOnlineAccountLinkingError({ code: "auth/invalid-email" });

    expect(error).toBeInstanceOf(OnlineAccountLinkingError);
    expect(error.code).toBe("invalid-email");
    expect(error.message).toContain("Email");
  });

  it("maps recent-login errors to a stable UID-preserving retry message", () => {
    const error = mapOnlineAccountLinkingError({ code: "auth/requires-recent-login" });

    expect(error).toBeInstanceOf(OnlineAccountLinkingError);
    expect(error.code).toBe("expired-credentials");
    expect(error.message).toContain("UID");
  });

  it("maps disabled Email/Password providers to a concrete setup error", () => {
    const error = mapOnlineAccountLinkingError({ code: "auth/operation-not-allowed" });

    expect(error).toBeInstanceOf(OnlineAccountLinkingError);
    expect(error.code).toBe("provider-disabled");
    expect(error.message).toContain("Email/Passwort");
  });

  it("maps missing Firebase Auth configuration from REST errors", () => {
    const error = mapOnlineAccountLinkingError({
      message: "Firebase: Error (auth/configuration-not-found). CONFIGURATION_NOT_FOUND",
    });

    expect(error).toBeInstanceOf(OnlineAccountLinkingError);
    expect(error.code).toBe("firebase-auth-not-configured");
    expect(error.message).toContain("Firebase Auth");
  });

  it("keeps account securing out of local test mode", async () => {
    await expect(
      secureCurrentOnlineAccount({
        email: "coach@example.com",
        password: "long-enough",
        mode: "local",
      }),
    ).rejects.toMatchObject({
      code: "local-mode",
    });
  });
});
