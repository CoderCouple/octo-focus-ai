/**
 * Map raw api error messages from the resource-share accept endpoint into
 * user-friendly copy for the /invite/[shareId] failure card. Returns the
 * input untouched when no canned message matches — we'd rather show the
 * upstream text than something misleading.
 */
export function friendlyInviteError(raw: string): string {
  if (raw.includes("different email")) {
    return "This invite was sent to a different email address. Sign in with the email it was sent to.";
  }
  if (raw.includes("not pending")) {
    return "This invite has already been accepted or revoked.";
  }
  if (raw.includes("not found")) {
    return "This invite link is no longer valid.";
  }
  return raw;
}
