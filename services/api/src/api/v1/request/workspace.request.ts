/**
 * Workspace + member request DTOs. Re-exports the Zod schemas that already
 * live in @octofocus/shared so the API layer stays the single declaration
 * point for HTTP input contracts.
 */
export {
  WorkspaceCreateSchema,
  WorkspaceUpdateSchema,
  WorkspaceMemberInviteSchema,
  WorkspaceMemberUpdateSchema,
  type WorkspaceCreate,
  type WorkspaceUpdate,
  type WorkspaceMemberInvite,
  type WorkspaceMemberUpdate,
} from "@octofocus/shared";
