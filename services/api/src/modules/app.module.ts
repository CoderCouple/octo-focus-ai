import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { DatabaseModule } from "../db/database.module";
import { AiRunsModule } from "./ai-runs.module";
import { AuditModule } from "./audit.module";
import { CanvasesModule } from "./canvases.module";
import { CliTokensModule } from "./cli-tokens.module";
import { HealthModule } from "./health.module";
import { MeModule } from "./me.module";
import { PagesModule } from "./pages.module";
import { PreferencesModule } from "./preferences.module";
import { ProjectsModule } from "./projects.module";
import { PublicModule } from "./public.module";
import { PublishModule } from "./publish.module";
import { SharingModule } from "./sharing.module";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    HealthModule,
    MeModule,
    PreferencesModule,
    WorkspacesModule,
    ProjectsModule,
    PagesModule,
    CanvasesModule,
    SharingModule,
    PublishModule,
    PublicModule,
    AiRunsModule,
    AuditModule,
    CliTokensModule,
  ],
  providers: [ChangeEventsService, PermissionsService, SlugService, EmailService],
  exports: [ChangeEventsService, PermissionsService, SlugService, EmailService],
})
export class AppModule {}
