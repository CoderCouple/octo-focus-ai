import { Module } from "@nestjs/common";
import { MeController } from "../api/v1/controller/me.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../db/database.module";
import { MeService } from "../service/me.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
