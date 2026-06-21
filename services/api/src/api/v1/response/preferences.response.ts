import type {
  NotesFont,
  ThemeChoice,
  UserPreference,
} from "../../../model/user-preference.model";

export interface UserPreferenceDto {
  userId: string;
  defaultNotesFont: NotesFont;
  theme: ThemeChoice;
  sendNotificationEmails: boolean;
  createdAt: string;
  updatedAt: string;
}

export function userPreferenceToDto(pref: UserPreference): UserPreferenceDto {
  return {
    userId: pref.userId,
    defaultNotesFont: pref.defaultNotesFont,
    theme: pref.theme,
    sendNotificationEmails: pref.sendNotificationEmails,
    createdAt: pref.createdAt.toISOString(),
    updatedAt: pref.updatedAt.toISOString(),
  };
}
