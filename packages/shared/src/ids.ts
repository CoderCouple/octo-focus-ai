import { randomUUID } from "crypto";

/**
 * Stripe-style prefixed IDs.
 *
 * Every entity in OctoFocusAI has a typed ID of the form `<prefix>_<uuid>`.
 * The prefix makes IDs self-documenting everywhere they appear: DB rows,
 * URLs, API logs, error messages, copy-pasted into Slack.
 *
 * Storage: TEXT column in Postgres. Trade ~24 bytes/row for grep-ability.
 *
 * Generation: $defaultFn on the Drizzle column. The auth guard creates user
 * IDs explicitly from the Supabase JWT subject so they stay synced with
 * Supabase Auth.
 */

export const ID_PREFIXES = {
  user: "usr",
  workspace: "wsp",
  workspaceMember: "mem",
  project: "prj",
  page: "pag",
  pageBlock: "blk",
  canvas: "cnv",
  canvasSnapshot: "snp",
  pageCanvasLink: "pcl",
  agent: "agt",
  aiRun: "run",
  changeEvent: "evt",
  resourceShare: "shr",
  shareLink: "lnk",
  userPreference: "prf",
  canvasAsset: "ast",
  workspaceInvite: "win",
  cliToken: "cli",
  meeting: "mtg",
  component: "cmp",
  figure: "fig",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

const PREFIX_REGEX = new RegExp(
  `^(${Object.values(ID_PREFIXES).join("|")})_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
);

export function generateId<P extends IdPrefix>(prefix: P): `${P}_${string}` {
  return `${prefix}_${randomUUID()}` as `${P}_${string}`;
}

/** Like generateId but builds from an existing UUID — used for users.id, which mirrors Supabase Auth's user.id. */
export function buildIdFromUuid<P extends IdPrefix>(prefix: P, uuid: string): `${P}_${string}` {
  return `${prefix}_${uuid}` as `${P}_${string}`;
}

export function isPrefixedId(value: unknown): value is string {
  return typeof value === "string" && PREFIX_REGEX.test(value);
}

export function hasPrefix(value: string, prefix: IdPrefix): boolean {
  return value.startsWith(`${prefix}_`);
}
