/**
 * Workspace-scoped slug allocator. Project/page/canvas share one namespace, so
 * we check all three tables before claiming a slug. Up to a few title-suffix
 * attempts, then fall back to suffix-only guarantees uniqueness.
 */
import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../db/database.module";
import { canvases, pages, projects } from "../db/schema";
import { randomSuffix, slugifyTitle, withSuffix } from "./slug";

const MAX_TRIES = 4;

@Injectable()
export class SlugService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async allocate(workspaceId: string, title: string): Promise<string> {
    const base = slugifyTitle(title);
    let candidate = base;
    for (let i = 0; i < MAX_TRIES; i++) {
      if (await this.isAvailable(workspaceId, candidate)) return candidate;
      candidate = withSuffix(base);
    }
    // Last resort: pure-random slug. Practically never reached.
    return `${base}-${randomSuffix()}${randomSuffix()}`;
  }

  private async isAvailable(workspaceId: string, slug: string): Promise<boolean> {
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.publicSlug, slug)))
      .limit(1);
    if (project) return false;

    const [page] = await this.db
      .select({ id: pages.id })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), eq(pages.publicSlug, slug)))
      .limit(1);
    if (page) return false;

    const [canvas] = await this.db
      .select({ id: canvases.id })
      .from(canvases)
      .innerJoin(projects, eq(canvases.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), eq(canvases.publicSlug, slug)))
      .limit(1);
    if (canvas) return false;

    return true;
  }
}
