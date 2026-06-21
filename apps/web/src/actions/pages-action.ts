"use server";

import { revalidatePath } from "next/cache";
import type { PageCreate, PageUpdate } from "@octofocus/shared";
import {
  createPageApi,
  deletePageApi,
  getPageApi,
  listPagesApi,
  updatePageApi,
} from "@/api/pages-api";

export async function renamePageAction(pageId: string, title: string) {
  const row = await updatePageApi(pageId, { title });
  revalidatePath("/app/notes");
  return row;
}

export async function deletePageAction(pageId: string) {
  await deletePageApi(pageId);
  revalidatePath("/app/notes");
}

export async function listPagesAction(projectId: string) {
  return listPagesApi(projectId);
}

export async function createPageAction(projectId: string, body: PageCreate) {
  return createPageApi(projectId, body);
}

export async function getPageAction(pageId: string) {
  return getPageApi(pageId);
}

export async function updatePageAction(pageId: string, body: PageUpdate) {
  return updatePageApi(pageId, body);
}
