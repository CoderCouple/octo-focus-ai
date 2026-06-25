import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { components } from "../schemas/components";
import { resourceShares } from "../schemas/sharing";
import { users } from "../schemas/users";
import type { ComponentLanguage } from "../../model/component.model";

export interface CreatorSummary {
  id: string;
  name: string;
  email: string;
}

type ComponentRow = typeof components.$inferSelect;
export type ComponentRowWithMeta = ComponentRow & {
  creator: CreatorSummary | null;
  sharedCount: number;
};

@Injectable()
export class ComponentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<ComponentRow | null> {
    const rows = await this.db
      .select()
      .from(components)
      .where(and(eq(components.id, id), isNull(components.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async insert(values: {
    workspaceId: string;
    createdByUserId: string;
    title: string;
    description?: string | null;
    code: string;
    language: ComponentLanguage;
  }): Promise<ComponentRow> {
    const rows = await this.db
      .insert(components)
      .values({
        workspaceId: values.workspaceId,
        createdByUserId: values.createdByUserId,
        title: values.title,
        description: values.description ?? null,
        code: values.code,
        language: values.language,
      })
      .returning();
    return rows[0];
  }

  async updateById(
    id: string,
    patch: Partial<{
      title: string;
      description: string | null;
      code: string;
      language: ComponentLanguage;
    }>,
  ): Promise<ComponentRow | null> {
    const rows = await this.db
      .update(components)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(components.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async softDeleteById(id: string): Promise<ComponentRow | null> {
    const rows = await this.db
      .update(components)
      .set({ deletedAt: new Date() })
      .where(eq(components.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async listForWorkspace(workspaceId: string): Promise<ComponentRowWithMeta[]> {
    const rows = await this.db
      .select({
        component: components,
        creatorId: users.id,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(components)
      .leftJoin(users, eq(components.createdByUserId, users.id))
      .where(and(eq(components.workspaceId, workspaceId), isNull(components.deletedAt)))
      .orderBy(desc(components.updatedAt));

    if (rows.length === 0) return [];

    const componentIds = rows.map((r) => r.component.id);
    const shareRows = await this.db
      .select({
        resourceId: resourceShares.resourceId,
        count: sql<number>`count(*)::int`,
      })
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, "component"),
          inArray(resourceShares.resourceId, componentIds),
          eq(resourceShares.status, "active"),
        ),
      )
      .groupBy(resourceShares.resourceId);

    const sharedById = new Map(shareRows.map((r) => [r.resourceId, Number(r.count)]));

    return rows.map((r) => ({
      ...r.component,
      creator:
        r.creatorId && r.creatorName && r.creatorEmail
          ? { id: r.creatorId, name: r.creatorName, email: r.creatorEmail }
          : null,
      sharedCount: sharedById.get(r.component.id) ?? 0,
    }));
  }
}
