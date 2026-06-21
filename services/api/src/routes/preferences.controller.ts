/**
 * /me/preferences — one row per user, lazy-created on first read.
 * Holds workspace-wide UI prefs (default notes font, theme,
 * notification-email opt-out). Per-resource prefs live in the resource's
 * settings JSONB column instead.
 */
import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from "@nestjs/common";
import { UserPreferenceUpdateSchema, type UserPreferenceUpdate } from "@octofocus/shared";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { userPreferences } from "../db/schema";

@Controller("me/preferences")
@UseGuards(SupabaseAuthGuard)
export class PreferencesController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  async get(@Req() req: AuthenticatedRequest) {
    return this.upsertDefault(req.user.id);
  }

  @Patch()
  async patch(
    @Body(new ZodValidationPipe(UserPreferenceUpdateSchema)) body: UserPreferenceUpdate,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.upsertDefault(req.user.id);
    const [row] = await this.db
      .update(userPreferences)
      .set({
        ...(body.defaultNotesFont !== undefined ? { defaultNotesFont: body.defaultNotesFont } : {}),
        ...(body.theme !== undefined ? { theme: body.theme } : {}),
        ...(body.sendNotificationEmails !== undefined
          ? { sendNotificationEmails: body.sendNotificationEmails }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, req.user.id))
      .returning();
    return row;
  }

  private async upsertDefault(userId: string) {
    const [existing] = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    if (existing) return existing;
    const [row] = await this.db
      .insert(userPreferences)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    return (
      row ??
      (
        await this.db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, userId))
          .limit(1)
      )[0]
    );
  }
}
