import { describe, expect, it } from "vitest";
import { friendlyInviteError } from "./friendly-invite-error";

describe("friendlyInviteError", () => {
  it("rewrites 'different email' messages", () => {
    expect(friendlyInviteError("Forbidden: invite was sent to a different email")).toMatch(
      /sign in with the email/i,
    );
  });

  it("rewrites 'not pending' messages", () => {
    expect(friendlyInviteError("Share not pending acceptance.")).toMatch(
      /already been accepted/i,
    );
  });

  it("rewrites 'not found' messages", () => {
    expect(friendlyInviteError("Resource share not found.")).toMatch(/no longer valid/i);
  });

  it("passes through unknown messages untouched", () => {
    expect(friendlyInviteError("Database unavailable")).toBe("Database unavailable");
  });

  it("does not collapse multiple matches — first match wins", () => {
    expect(friendlyInviteError("not found and not pending — different email")).toMatch(
      /sign in with the email/i,
    );
  });
});
