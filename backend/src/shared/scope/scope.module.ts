import { Module } from "@nestjs/common";
import { TenantScopeResolver } from "./tenant-scope.resolver";

/**
 * ScopeModule
 *
 * Provides the single shared {@link TenantScopeResolver} used across the five
 * core operational modules (IT, Procurement, Sales, Marketing, Payment). Import
 * this module wherever a controller/service needs to resolve a validated
 * {@link TenantScope} from a verified `TenantContext`.
 *
 * `PrismaService` is provided globally via `PersistenceModule`, so no explicit
 * Prisma provider wiring is needed here.
 */
@Module({
  providers: [TenantScopeResolver],
  exports: [TenantScopeResolver],
})
export class ScopeModule {}
