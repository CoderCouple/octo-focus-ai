import { Module } from "@nestjs/common";
import { PublishController } from "../api/v1/controller/publish.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { DatabaseModule } from "../db/database.module";
import { PublishService } from "../service/publish.service";
import { CanvasesModule } from "./canvases.module";
import { PagesModule } from "./pages.module";
import { ProjectsModule } from "./projects.module";

@Module({
  imports: [DatabaseModule, AuthModule, ProjectsModule, PagesModule, CanvasesModule],
  controllers: [PublishController],
  providers: [PublishService, PermissionsService, SlugService, ChangeEventsService],
  exports: [PublishService],
})
export class PublishModule {}
