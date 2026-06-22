export { NotesPane } from "./components/notes-pane";
export { NotesStats } from "./components/notes-stats";
export { NotesTable } from "./components/notes-table";
export { deriveNotesStats, noteStatusLabel } from "./lib/derive-notes-stats";
export {
  createNoteAction,
  deleteNoteAction,
  getNoteAction,
  listProjectNotesAction,
  listWorkspaceNotesAction,
  renameNoteAction,
  updateNoteAction,
} from "./actions/notes-actions";
// Server-only api fetchers are NOT re-exported here — barrel must stay
// client-safe. RSCs import directly from `./api/notes-api`.
export { updateNoteClientApi, updateNoteSettingsApi } from "./api/notes-client-api";
export type { Page, PageCreate, PageUpdate } from "./types";
export { useWorkspaceNotes, useRenameNote, useDeleteNote } from "./hooks/use-notes";
export { noteKeys } from "./constants";
export type { WorkspacePageSummary } from "./types";
