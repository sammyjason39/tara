import { Module } from "@nestjs/common";
import { AsyncRejectionService } from "./async-rejection.service";

/**
 * Provides the shared {@link AsyncRejectionService} correctness primitive
 * (BUG-13) to the five core department modules (IT, Procurement, Sales,
 * Marketing, Payment).
 *
 * `LoggerService` is registered globally via `LoggerModule` (`@Global`), so this
 * module only needs to provide and export the service. Each core module imports
 * `AsyncRejectionModule` to supervise its webhooks, OAuth callbacks, social sync,
 * and scheduled jobs so no initiated promise escapes without a rejection handler.
 */
@Module({
  providers: [AsyncRejectionService],
  exports: [AsyncRejectionService],
})
export class AsyncRejectionModule {}
