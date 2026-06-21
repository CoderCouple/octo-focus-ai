import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { DatabaseModule } from "../db/database.module";
import { AiRunsController } from "../routes/ai-runs.controller";
import { ChangeEventsController } from "../routes/change-events.controller";
import { HealthController } from "../routes/health.controller";
import { MeController } from "../routes/me.controller";
import { PreferencesController } from "../routes/preferences.controller";
import { CanvasesModule } from "./canvases.module";
import { PagesModule } from "./pages.module";
import { ProjectsModule } from "./projects.module";
import { PublicModule } from "./public.module";
import { PublishModule } from "./publish.module";
import { SharingModule } from "./sharing.module";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    PagesModule,
    CanvasesModule,
    SharingModule,
    PublishModule,
    PublicModule,
  ],
  controllers: [
    HealthController,
    MeController,
    PreferencesController,
    AiRunsController,
    ChangeEventsController,
  ],
  providers: [ChangeEventsService, PermissionsService, SlugService, EmailService],
  exports: [ChangeEventsService, PermissionsService, SlugService, EmailService],
})
export class AppModule {}
