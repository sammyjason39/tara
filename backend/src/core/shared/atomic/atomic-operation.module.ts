import { Module } from "@nestjs/common";
import { PersistenceModule } from "../../../persistence/persistence.module";
import { AtomicOperationService } from "./atomic-operation.service";

/**
 * Provides the shared {@link AtomicOperationService} correctness primitive to the
 * five core department modules (IT, Procurement, Sales, Marketing, Payment).
 *
 * `AuditService` (AuditModule) and `EventBusService` (EventsModule) are registered
 * globally, so this module only needs `PersistenceModule` for `PrismaService`.
 * Each core module imports `AtomicOperationModule` to wrap its multi-write
 * operations in a single Atomic_Operation.
 */
@Module({
  imports: [PersistenceModule],
  providers: [AtomicOperationService],
  exports: [AtomicOperationService],
})
export class AtomicOperationModule {}
