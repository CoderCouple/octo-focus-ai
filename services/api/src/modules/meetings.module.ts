import { Module } from "@nestjs/common";
import { MeetingsController } from "../api/v1/controller/meetings.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { LlmService } from "../common/llm.service";
import { DatabaseModule } from "../db/database.module";
import { MeetingsRepository } from "../db/repository/meetings.repository";
import { MeetingsService } from "../service/meetings.service";
import { WorkspacesModule } from "./workspaces.module";

// LlmService is registered locally rather than via a separate
// module import — it's a thin stateless wrapper around the Anthropic
// SDK and there is no LlmModule. MeetingsService injects it for the
// `summarize()` flow added in PR4.
@Module({
  imports: [DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [MeetingsController],
  providers: [MeetingsRepository, MeetingsService, ChangeEventsService, LlmService],
  exports: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
