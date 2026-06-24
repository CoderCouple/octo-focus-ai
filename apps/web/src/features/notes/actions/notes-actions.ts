"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/api/action";
import {
  createNoteApi,
  deleteNoteApi,
  getNoteApi,
  listProjectNotesApi,
  listWorkspaceNotesApi,
  updateNoteApi,
} from "../api/notes-api";
import type { PageCreate, PageUpdate } from "../types";

export async function listWorkspaceNotesAction(workspaceId: string) {
  return runAction(() => listWorkspaceNotesApi(workspaceId));
}

export async function listProjectNotesAction(projectId: string) {
  return runAction(() => listProjectNotesApi(projectId));
}

export async function getNoteAction(pageId: string) {
  return runAction(() => getNoteApi(pageId));
}

export async function createNoteAction(projectId: string, body: PageCreate) {
  return runAction(async () => {
    const row = await createNoteApi(projectId, body);
    revalidatePath("/workspace/notes");
    return row;
  });
}

export async function updateNoteAction(pageId: string, body: PageUpdate) {
  return runAction(async () => {
    const row = await updateNoteApi(pageId, body);
    revalidatePath("/workspace/notes");
    return row;
  });
}

export async function renameNoteAction(pageId: string, title: string) {
  return runAction(async () => {
    const row = await updateNoteApi(pageId, { title });
    revalidatePath("/workspace/notes");
    return row;
  });
}

export async function deleteNoteAction(pageId: string) {
  return runAction(async () => {
    await deleteNoteApi(pageId);
    revalidatePath("/workspace/notes");
  });
}
