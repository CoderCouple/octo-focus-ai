import { Module } from "@nestjs/common";
import { SharesController } from "../api/v1/controller/shares.controller";
import { AuthModule } from "../auth/auth.module";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { PermissionsService } from "../common/permissions.service";
import { DatabaseModule } from "../db/database.module";
import { ResourceSharesRepository } from "../db/repository/resource-shares.repository";
import { ShareLinksRepository } from "../db/repository/share-links.repository";
import { ShareLinksService } from "../service/share-links.service";
import { SharesService } from "../service/shares.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SharesController],
  providers: [
    ResourceSharesRepository,
    ShareLinksRepository,
    SharesService,
    ShareLinksService,
    PermissionsService,
    EmailService,
    ChangeEventsService,
  ],
  exports: [
    SharesService,
    ShareLinksService,
    ResourceSharesRepository,
    ShareLinksRepository,
  ],
})
export class SharingModule {}
