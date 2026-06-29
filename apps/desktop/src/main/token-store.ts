/**
 * Secure token storage backed by the macOS Keychain (via keytar).
 * keytar abstracts over OS credential stores; on Mac that's the
 * login keychain — same vault Safari + system auth uses. The token
 * is the user's API key (`oft_…` from `POST /v1/me/cli-tokens`), used
 * as a Bearer token on every API call.
 *
 * Service / account naming:
 *   - service: "OctoFocusAI" — the app's display name in Keychain.
 *   - account: "api-token" — there's only one credential per install
 *     today, but using a named account leaves room for per-workspace
 *     keys later without migrating the keychain entry.
 */
import keytar from "keytar";

const SERVICE = "OctoFocusAI";
const ACCOUNT = "api-token";

export async function getStoredToken(): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE, ACCOUNT);
  } catch (err) {
    console.error("token-store: read failed", err);
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, token);
}

export async function clearStoredToken(): Promise<void> {
  try {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  } catch (err) {
    console.error("token-store: delete failed", err);
  }
}
