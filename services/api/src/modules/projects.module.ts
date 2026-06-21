import { Module } from "@nestjs/common";
import { ProjectsController } from "../api/v1/controller/projects.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { ProjectsService } from "../service/projects.service";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService, ChangeEventsService],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
