import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { AiRunsController } from "../routes/ai-runs.controller";
import { CanvasesController } from "../routes/canvases.controller";
import { ChangeEventsController } from "../routes/change-events.controller";
import { HealthController } from "../routes/health.controller";
import { MeController } from "../routes/me.controller";
import { PagesController } from "../routes/pages.controller";
import { ProjectsController } from "../routes/projects.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    HealthController,
    MeController,
    ProjectsController,
    CanvasesController,
    PagesController,
    AiRunsController,
    ChangeEventsController,
  ],
  providers: [ChangeEventsService],
  exports: [ChangeEventsService],
})
export class AppModule {}
