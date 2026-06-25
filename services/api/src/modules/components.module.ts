import { Module } from "@nestjs/common";
import { ComponentsController } from "../api/v1/controller/components.controller";
import { AuthModule } from "../auth/auth.module";
import { LlmService } from "../common/llm.service";
import { ComponentGenerationService } from "../service/component-generation.service";

@Module({
  imports: [AuthModule],
  controllers: [ComponentsController],
  providers: [LlmService, ComponentGenerationService],
})
export class ComponentsModule {}
