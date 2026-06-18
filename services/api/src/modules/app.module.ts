import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../db/database.module";
import { HealthController } from "../routes/health.controller";
import { MeController } from "../routes/me.controller";
import { ProjectsController } from "../routes/projects.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HealthController, MeController, ProjectsController],
})
export class AppModule {}
