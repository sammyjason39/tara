import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheInvalidationHelper } from './cache-invalidation.helper';

/**
 * AppCacheModule
 *
 * Global cache module providing in-memory caching for all controllers and services.
 *
 * TTL Strategy:
 * ─────────────────────────────────────────────────────────────────────────────
 * - 30s (default)  → Transactional/frequently-changing data (inventory levels,
 *                    orders, tickets, POS transactions, audit logs, IoT data)
 * - 300s (5 min)   → Reference/configuration data (license info, mail accounts,
 *                    system settings, static lookups)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Use `@CacheTTL(300)` decorator on endpoints serving reference data to override
 * the default 30s TTL.
 *
 * Cache invalidation is handled via the `CacheInvalidationHelper` which should
 * be injected into controllers that perform write operations (POST/PUT/PATCH/DELETE).
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 */
@Global()
@Module({
  imports: [
    NestCacheModule.register({
      ttl: 30000,   // Default 30s for transactional data (in milliseconds)
      max: 1000,    // Maximum number of cache entries
      isGlobal: true,
    }),
  ],
  providers: [CacheInvalidationHelper],
  exports: [NestCacheModule, CacheInvalidationHelper],
})
export class AppCacheModule {}
