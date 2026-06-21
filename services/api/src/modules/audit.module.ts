import { Module } from "@nestjs/common";
import { ChangeEventsController } from "../api/v1/controller/change-events.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../db/database.module";
import { ChangeEventsRepository } from "../db/repository/change-events.repository";
import { ChangeEventsReaderService } from "../service/change-events-reader.service";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [ChangeEventsController],
  providers: [ChangeEventsRepository, ChangeEventsReaderService],
  exports: [ChangeEventsReaderService],
})
export class AuditModule {}
