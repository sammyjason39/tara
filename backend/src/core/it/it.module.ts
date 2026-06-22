import { Module } from "@nestjs/common";
import { useDbPersistence } from "../../shared/persistence.mode";
import { ITController } from "./it.controller";
import { ITService } from "./it.service";
import { ITDbRepository } from "./repositories/it.db.repository";
import { IITRepository } from "./repositories/it.repository.interface";
import { ITMockRepository } from "./repositories/it.mock.repository";
import { PrismaService } from "../../persistence/prisma.service";
import { ScopeModule } from "../../shared/scope/scope.module";
import { AtomicOperationModule } from "../shared/atomic";
import { AsyncRejectionModule } from "../shared/async";

import { ITEventHandler } from "./it-event.handler";
import { WebhookService } from "./webhook.service";

@Module({
  imports: [ScopeModule, AtomicOperationModule, AsyncRejectionModule],
  controllers: [ITController],
  providers: [
    ITService,
    ITEventHandler,
    WebhookService,
    PrismaService,
    {
      provide: IITRepository,
      useClass: useDbPersistence() ? ITDbRepository : ITMockRepository,
    },
  ],
  exports: [ITService],
})
export class ITModule {}
