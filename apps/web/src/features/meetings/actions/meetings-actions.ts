"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/api/action";
import {
  createMeetingApi,
  deleteMeetingApi,
  getMeetingApi,
  listWorkspaceMeetingsApi,
  updateMeetingApi,
} from "../api/meetings-api";
import type { MeetingCreate, MeetingUpdate } from "../types";

export async function listWorkspaceMeetingsAction(workspaceId: string) {
  return runAction(() => listWorkspaceMeetingsApi(workspaceId));
}

export async function getMeetingAction(id: string) {
  return runAction(() => getMeetingApi(id));
}

export async function createMeetingAction(workspaceId: string, body: MeetingCreate) {
  return runAction(async () => {
    const row = await createMeetingApi(workspaceId, body);
    revalidatePath("/workspace/meetings");
    return row;
  });
}

export async function updateMeetingAction(id: string, body: MeetingUpdate) {
  return runAction(async () => {
    const row = await updateMeetingApi(id, body);
    revalidatePath("/workspace/meetings");
    return row;
  });
}

export async function deleteMeetingAction(id: string) {
  return runAction(async () => {
    await deleteMeetingApi(id);
    revalidatePath("/workspace/meetings");
  });
}
