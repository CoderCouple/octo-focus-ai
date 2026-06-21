import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { WorkspaceMembersService } from "../../../service/workspace-members.service";
import {
  WorkspaceMemberInviteSchema,
  WorkspaceMemberUpdateSchema,
  type WorkspaceMemberInvite,
  type WorkspaceMemberUpdate,
} from "../request/workspace.request";
import { memberToDto, type WorkspaceMemberDto } from "../response/workspace.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller("workspaces/:workspaceId/members")
@UseGuards(SupabaseAuthGuard)
export class WorkspaceMembersController {
  constructor(private readonly members: WorkspaceMembersService) {}

  @Get()
  async list(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMemberDto[]> {
    const rows = await this.members.list(workspaceId, req.user.id);
    return rows.map(({ member, user }) => memberToDto(member, user));
  }

  @Post()
  async invite(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Body(new ZodValidationPipe(WorkspaceMemberInviteSchema)) body: WorkspaceMemberInvite,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMemberDto> {
    const { member, user } = await this.members.invite(
      workspaceId,
      body,
      req.user.id,
      req.user.email,
    );
    return memberToDto(member, user);
  }

  @Patch(":userId")
  async updateRole(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Param("userId", IdParam) userId: string,
    @Body(new ZodValidationPipe(WorkspaceMemberUpdateSchema)) body: WorkspaceMemberUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMemberDto> {
    const member = await this.members.updateRole(workspaceId, userId, body, req.user.id);
    return memberToDto(member);
  }

  @Delete(":userId")
  @HttpCode(200)
  async remove(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Param("userId", IdParam) userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.members.remove(workspaceId, userId, req.user.id);
    return { ok: true };
  }
}
