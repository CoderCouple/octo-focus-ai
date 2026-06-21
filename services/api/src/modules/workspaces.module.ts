import { Module } from "@nestjs/common";
import { WorkspaceMembersController } from "../api/v1/controller/workspace-members.controller";
import { WorkspacesController } from "../api/v1/controller/workspaces.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { DatabaseModule } from "../db/database.module";
import { WorkspaceInvitesRepository } from "../db/repository/workspace-invites.repository";
import { WorkspaceMembersRepository } from "../db/repository/workspace-members.repository";
import { WorkspacesRepository } from "../db/repository/workspaces.repository";
import { WorkspaceMembersService } from "../service/workspace-members.service";
import { WorkspacesService } from "../service/workspaces.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceInvitesRepository,
    WorkspacesService,
    WorkspaceMembersService,
    ChangeEventsService,
    EmailService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceInvitesRepository,
  ],
})
export class WorkspacesModule {}
