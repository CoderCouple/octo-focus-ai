import { Module } from "@nestjs/common";
import { MeetingsController } from "../api/v1/controller/meetings.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { DatabaseModule } from "../db/database.module";
import { MeetingsRepository } from "../db/repository/meetings.repository";
import { MeetingsService } from "../service/meetings.service";
import { WorkspacesModule } from "./workspaces.module";

@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [MeetingsController],
  providers: [MeetingsRepository, MeetingsService, ChangeEventsService],
  exports: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
