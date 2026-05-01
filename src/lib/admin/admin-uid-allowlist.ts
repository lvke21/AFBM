const ADMIN_UID_ALLOWLIST = new Set(["KFy5PrqAzzP7vRbfP4wIDamzbh43"]);

export function isAdminUid(uid: string | null | undefined): boolean {
  return typeof uid === "string" && ADMIN_UID_ALLOWLIST.has(uid);
}
