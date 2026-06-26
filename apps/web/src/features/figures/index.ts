export type {
  CreatorSummary,
  PublicFigure,
  SavedFigure,
  SavedFigureCreate,
  SavedFigureUpdate,
  Visibility,
  WorkspaceFigureSummary,
} from "./types";

export {
  createSavedFigureClientApi,
  getPublicFigureClientApi,
  updateSavedFigureClientApi,
} from "./api/saved-figures-client-api";
