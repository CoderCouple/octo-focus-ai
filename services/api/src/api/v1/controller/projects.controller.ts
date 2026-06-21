import {
  Body,
  Controller,
  Delete,
  Get,
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
import { ProjectsService } from "../../../service/projects.service";
import {
  ProjectCreateSchema,
  ProjectUpdateSchema,
  type ProjectCreate,
  type ProjectUpdate,
} from "../request/project.request";
import { projectToDto, type ProjectDto } from "../response/project.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get("workspaces/:workspaceId/projects")
  async list(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectDto[]> {
    const items = await this.projects.listForWorkspace(workspaceId, req.user.id);
    return items.map(projectToDto);
  }

  @Post("workspaces/:workspaceId/projects")
  async create(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Body(new ZodValidationPipe(ProjectCreateSchema)) body: ProjectCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectDto> {
    const project = await this.projects.create(workspaceId, body, req.user.id);
    return projectToDto(project);
  }

  @Get("projects/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectDto> {
    return projectToDto(await this.projects.getOne(id, req.user.id));
  }

  @Patch("projects/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(ProjectUpdateSchema)) body: ProjectUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectDto> {
    return projectToDto(await this.projects.update(id, body, req.user.id));
  }

  @Delete("projects/:id")
  async archive(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectDto> {
    return projectToDto(await this.projects.archive(id, req.user.id));
  }
}
