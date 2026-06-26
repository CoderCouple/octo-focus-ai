import { Module } from "@nestjs/common";
import {
  FigureResourceController,
  PublicFigureController,
} from "../api/v1/controller/figure-resource.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { FiguresRepository } from "../db/repository/figures.repository";
import { FiguresService } from "../service/figures.service";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [FigureResourceController, PublicFigureController],
  providers: [FiguresRepository, FiguresService, ChangeEventsService],
  exports: [FiguresService, FiguresRepository],
})
export class FigureResourceModule {}
