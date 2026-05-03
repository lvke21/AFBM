const ADMIN_UID_ALLOWLIST = new Set(["KFy5PrqAzzP7vRbfP4wIDamzbh43"]);

// Bootstrap hint only. Admin access still requires Firebase custom claim admin=true.
export function isAdminUid(uid: string | null | undefined): boolean {
  return typeof uid === "string" && ADMIN_UID_ALLOWLIST.has(uid);
}
