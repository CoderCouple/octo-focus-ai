import { Module } from "@nestjs/common";
import { ProjectsController } from "../api/v1/controller/projects.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { CanvasesRepository } from "../db/repository/canvases.repository";
import { PagesRepository } from "../db/repository/pages.repository";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { ProjectsService } from "../service/projects.service";
import { WorkspacesModule } from "./workspaces.module";

// PagesRepository + CanvasesRepository are registered directly here
// (not via PagesModule / CanvasesModule imports) because both of
// those modules already depend on ProjectsModule — pulling them in
// would create a circular import. The repos themselves are plain
// `@Injectable()` classes whose only dep is the `DRIZZLE` token, so
// they slot in with no other wiring.
@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsRepository,
    PagesRepository,
    CanvasesRepository,
    ProjectsService,
    ChangeEventsService,
  ],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
