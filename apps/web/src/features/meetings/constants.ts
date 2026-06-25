export const meetingKeys = {
  list: (workspaceId: string) => ["meetings", workspaceId] as const,
  detail: (id: string) => ["meeting", id] as const,
};
