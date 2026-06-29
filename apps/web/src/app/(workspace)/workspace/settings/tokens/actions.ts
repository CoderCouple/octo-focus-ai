"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";

export interface CliToken {
  id: string;
  userId: string;
  name: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CliTokenCreated extends CliToken {
  /** Plaintext token. Returned exactly once. Never logged, never re-fetchable. */
  plaintext: string;
}

export async function listTokensAction(): Promise<{
  success: boolean;
  data?: CliToken[];
  message?: string;
}> {
  try {
    const tokens = await serverFetch<CliToken[]>("/me/cli-tokens");
    return { success: true, data: tokens };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load tokens.",
    };
  }
}

export async function createTokenAction(
  name: string,
): Promise<{ success: boolean; data?: CliTokenCreated; message?: string }> {
  try {
    const token = await serverFetch<CliTokenCreated>("/me/cli-tokens", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    revalidatePath("/workspace/settings/tokens");
    return { success: true, data: token };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create token.",
    };
  }
}

export async function revokeTokenAction(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    await serverFetch(`/me/cli-tokens/${id}`, { method: "DELETE" });
    revalidatePath("/workspace/settings/tokens");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to revoke token.",
    };
  }
}
