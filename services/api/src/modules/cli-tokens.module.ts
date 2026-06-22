import { Module } from "@nestjs/common";
import { CliTokensController } from "../api/v1/controller/cli-tokens.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../db/database.module";
import { CliTokensRepository } from "../db/repository/cli-tokens.repository";
import { CliTokensService } from "../service/cli-tokens.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CliTokensController],
  providers: [CliTokensRepository, CliTokensService],
  exports: [CliTokensService, CliTokensRepository],
})
export class CliTokensModule {}
