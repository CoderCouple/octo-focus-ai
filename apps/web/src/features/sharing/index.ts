export { SharePopover } from "./components/share-popover";
export type { SharePopoverProps } from "./components/share-popover";
// Server-only fetcher (`acceptResourceShareApi`) is NOT re-exported here —
// the `share-popover` client component imports this barrel, and pulling
// `server-only` into the client bundle would break the build. The /invite
// RSC imports `acceptResourceShareApi` directly from `./api/share-accept-api`.
// The browser fetchers in `./api/shares-api` are intentionally consumed only
// from `share-popover.tsx` (sibling import) so they don't go through the barrel.
export { friendlyInviteError } from "./lib/friendly-invite-error";
export { PERMISSION_LABEL, VISIBILITY_LABEL, shareKeys } from "./constants";
export type {
  PublishedResource,
  ResourceKind,
  ResourceShare,
  SharePermission,
  ShareLink,
  Visibility,
} from "./types";
