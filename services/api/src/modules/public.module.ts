import { Module } from "@nestjs/common";
import { PublicController } from "../api/v1/controller/public.controller";
import { PermissionsService } from "../common/permissions.service";
import { DatabaseModule } from "../db/database.module";
import { PublicService } from "../service/public.service";
import { CanvasesModule } from "./canvases.module";
import { PagesModule } from "./pages.module";
import { ProjectsModule } from "./projects.module";
import { SharingModule } from "./sharing.module";

@Module({
  imports: [DatabaseModule, ProjectsModule, PagesModule, CanvasesModule, SharingModule],
  controllers: [PublicController],
  providers: [PublicService, PermissionsService],
})
export class PublicModule {}
