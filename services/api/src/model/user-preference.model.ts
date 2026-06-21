import type { userPreferences } from "../db/schemas/preferences";

export type NotesFont = "sans" | "serif" | "mono";
export type ThemeChoice = "system" | "light" | "dark";

export interface UserPreference {
  userId: string;
  defaultNotesFont: NotesFont;
  theme: ThemeChoice;
  sendNotificationEmails: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserPreference(row: typeof userPreferences.$inferSelect): UserPreference {
  return {
    userId: row.userId,
    defaultNotesFont: row.defaultNotesFont as NotesFont,
    theme: row.theme as ThemeChoice,
    sendNotificationEmails: row.sendNotificationEmails,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
