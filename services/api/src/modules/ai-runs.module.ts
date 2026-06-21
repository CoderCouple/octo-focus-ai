import { Module } from "@nestjs/common";
import { AiRunsController } from "../api/v1/controller/ai-runs.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../db/database.module";
import { AiRunsRepository } from "../db/repository/ai-runs.repository";
import { AiRunsService } from "../service/ai-runs.service";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [AiRunsController],
  providers: [AiRunsRepository, AiRunsService],
  exports: [AiRunsService],
})
export class AiRunsModule {}
