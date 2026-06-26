import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { figures } from "../schemas/figures";
import { resourceShares } from "../schemas/sharing";
import { users } from "../schemas/users";

export interface CreatorSummary {
  id: string;
  name: string;
  email: string;
}

type FigureRow = typeof figures.$inferSelect;
export type FigureRowWithMeta = FigureRow & {
  creator: CreatorSummary | null;
  sharedCount: number;
};

@Injectable()
export class FiguresRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<FigureRow | null> {
    const rows = await this.db
      .select()
      .from(figures)
      .where(and(eq(figures.id, id), isNull(figures.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async insert(values: {
    workspaceId: string;
    createdByUserId: string;
    title: string;
    description?: string | null;
    dsl: string;
  }): Promise<FigureRow> {
    const rows = await this.db
      .insert(figures)
      .values({
        workspaceId: values.workspaceId,
        createdByUserId: values.createdByUserId,
        title: values.title,
        description: values.description ?? null,
        dsl: values.dsl,
      })
      .returning();
    return rows[0];
  }

  async updateById(
    id: string,
    patch: Partial<{
      title: string;
      description: string | null;
      dsl: string;
    }>,
  ): Promise<FigureRow | null> {
    const rows = await this.db
      .update(figures)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(figures.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async softDeleteById(id: string): Promise<FigureRow | null> {
    const rows = await this.db
      .update(figures)
      .set({ deletedAt: new Date() })
      .where(eq(figures.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async listForWorkspace(workspaceId: string): Promise<FigureRowWithMeta[]> {
    const rows = await this.db
      .select({
        figure: figures,
        creatorId: users.id,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(figures)
      .leftJoin(users, eq(figures.createdByUserId, users.id))
      .where(and(eq(figures.workspaceId, workspaceId), isNull(figures.deletedAt)))
      .orderBy(desc(figures.updatedAt));

    if (rows.length === 0) return [];

    const figureIds = rows.map((r) => r.figure.id);
    const shareRows = await this.db
      .select({
        resourceId: resourceShares.resourceId,
        count: sql<number>`count(*)::int`,
      })
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, "figure"),
          inArray(resourceShares.resourceId, figureIds),
          eq(resourceShares.status, "active"),
        ),
      )
      .groupBy(resourceShares.resourceId);

    const sharedById = new Map(shareRows.map((r) => [r.resourceId, Number(r.count)]));

    return rows.map((r) => ({
      ...r.figure,
      creator:
        r.creatorId && r.creatorName && r.creatorEmail
          ? { id: r.creatorId, name: r.creatorName, email: r.creatorEmail }
          : null,
      sharedCount: sharedById.get(r.figure.id) ?? 0,
    }));
  }
}
