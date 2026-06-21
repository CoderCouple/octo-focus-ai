import { Module } from "@nestjs/common";
import { PagesController } from "../api/v1/controller/pages.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { PagesRepository } from "../db/repository/pages.repository";
import { PagesService } from "../service/pages.service";
import { ProjectsModule } from "./projects.module";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule, ProjectsModule],
  controllers: [PagesController],
  providers: [PagesRepository, PagesService, ChangeEventsService],
  exports: [PagesService, PagesRepository],
})
export class PagesModule {}
