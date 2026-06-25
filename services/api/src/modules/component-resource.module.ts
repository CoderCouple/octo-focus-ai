import { Module } from "@nestjs/common";
import {
  ComponentResourceController,
  PublicComponentController,
} from "../api/v1/controller/component-resource.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { ComponentsRepository } from "../db/repository/components.repository";
import { ComponentsService } from "../service/components.service";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [ComponentResourceController, PublicComponentController],
  providers: [ComponentsRepository, ComponentsService, ChangeEventsService],
  exports: [ComponentsService, ComponentsRepository],
})
export class ComponentResourceModule {}
