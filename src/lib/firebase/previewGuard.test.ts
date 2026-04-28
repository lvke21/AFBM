import { describe, expect, it } from "vitest";

import { assertFirestorePreviewOrEmulatorAllowed } from "./previewGuard";

describe("firestore preview guard", () => {
  it("allows demo emulator access", () => {
    expect(
      assertFirestorePreviewOrEmulatorAllowed({
        FIREBASE_PROJECT_ID: "demo-afbm",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      }),
    ).toEqual({
      emulatorHost: "127.0.0.1:8080",
      mode: "emulator",
      projectId: "demo-afbm",
    });
  });

  it("blocks non-emulator access without the preview flag", () => {
    expect(() =>
      assertFirestorePreviewOrEmulatorAllowed({
        FIREBASE_PROJECT_ID: "afbm-staging",
        FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS: "afbm-staging",
      }),
    ).toThrow("FIRESTORE_PREVIEW_DRY_RUN=true");
  });

  it("blocks non-allowlisted preview projects", () => {
    expect(() =>
      assertFirestorePreviewOrEmulatorAllowed({
        FIREBASE_PROJECT_ID: "afbm-staging",
        FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS: "other-staging",
        FIRESTORE_PREVIEW_DRY_RUN: "true",
      }),
    ).toThrow("not in FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS");
  });

  it("blocks production-like project ids", () => {
    expect(() =>
      assertFirestorePreviewOrEmulatorAllowed({
        FIREBASE_PROJECT_ID: "afbm-production",
        FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS: "afbm-production",
        FIRESTORE_PREVIEW_DRY_RUN: "true",
      }),
    ).toThrow("production-like project");
  });

  it("blocks preview access in production runtime", () => {
    expect(() =>
      assertFirestorePreviewOrEmulatorAllowed({
        FIREBASE_PROJECT_ID: "afbm-staging",
        FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS: "afbm-staging",
        FIRESTORE_PREVIEW_DRY_RUN: "true",
        NODE_ENV: "production",
      }),
    ).toThrow("NODE_ENV=production");
  });

  it("allows allowlisted staging only with explicit dry-run flag", () => {
    expect(
      assertFirestorePreviewOrEmulatorAllowed({
        FIREBASE_PROJECT_ID: "afbm-staging",
        FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS: "afbm-staging,other-staging",
        FIRESTORE_PREVIEW_DRY_RUN: "true",
        NODE_ENV: "test",
      }),
    ).toEqual({
      mode: "preview",
      projectId: "afbm-staging",
    });
  });
});
