import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { DatabaseModule } from "../db/database.module";
import { AiRunsController } from "../routes/ai-runs.controller";
import { CanvasAssetsController } from "../routes/canvas-assets.controller";
import { CanvasesController } from "../routes/canvases.controller";
import { ChangeEventsController } from "../routes/change-events.controller";
import { HealthController } from "../routes/health.controller";
import { MeController } from "../routes/me.controller";
import { PagesController } from "../routes/pages.controller";
import { PreferencesController } from "../routes/preferences.controller";
import { ProjectsController } from "../routes/projects.controller";
import { PublicController } from "../routes/public.controller";
import { PublishController } from "../routes/publish.controller";
import { SharesController } from "../routes/shares.controller";
import { WorkspaceMembersController } from "../routes/workspace-members.controller";
import { WorkspacesController } from "../routes/workspaces.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    HealthController,
    MeController,
    PreferencesController,
    WorkspacesController,
    WorkspaceMembersController,
    ProjectsController,
    CanvasesController,
    CanvasAssetsController,
    PagesController,
    AiRunsController,
    ChangeEventsController,
    PublishController,
    SharesController,
    PublicController,
  ],
  providers: [ChangeEventsService, PermissionsService, SlugService, EmailService],
  exports: [ChangeEventsService, PermissionsService, SlugService, EmailService],
})
export class AppModule {}
