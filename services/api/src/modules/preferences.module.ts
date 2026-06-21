import { Module } from "@nestjs/common";
import { PreferencesController } from "../api/v1/controller/preferences.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../db/database.module";
import { UserPreferencesRepository } from "../db/repository/user-preferences.repository";
import { PreferencesService } from "../service/preferences.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PreferencesController],
  providers: [UserPreferencesRepository, PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
