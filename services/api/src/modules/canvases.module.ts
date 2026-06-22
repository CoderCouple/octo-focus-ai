import { Module } from "@nestjs/common";
import { CanvasAssetsController } from "../api/v1/controller/canvas-assets.controller";
import { CanvasesController } from "../api/v1/controller/canvases.controller";
import { CodeToDiagramController } from "../api/v1/controller/code-to-diagram.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { LlmService } from "../common/llm.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { DatabaseModule } from "../db/database.module";
import { CanvasAssetsRepository } from "../db/repository/canvas-assets.repository";
import { CanvasesRepository } from "../db/repository/canvases.repository";
import { CanvasAssetsService } from "../service/canvas-assets.service";
import { CanvasesService } from "../service/canvases.service";
import { CodeToDiagramService } from "../service/code-to-diagram.service";
import { ProjectsModule } from "./projects.module";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule, ProjectsModule],
  controllers: [CanvasesController, CanvasAssetsController, CodeToDiagramController],
  providers: [
    CanvasesRepository,
    CanvasAssetsRepository,
    CanvasesService,
    CanvasAssetsService,
    CodeToDiagramService,
    LlmService,
    PermissionsService,
    SlugService,
    ChangeEventsService,
  ],
  exports: [
    CanvasesService,
    CanvasAssetsService,
    CanvasesRepository,
    CanvasAssetsRepository,
    LlmService,
  ],
})
export class CanvasesModule {}
