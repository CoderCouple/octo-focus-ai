"use server";

import type { PageCreate, PageUpdate } from "@octofocus/shared";
import { createPageApi, getPageApi, listPagesApi, updatePageApi } from "@/api/pages-api";

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
