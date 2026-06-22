/**
 * Cache Module Exports
 *
 * TTL Strategy:
 * ─────────────────────────────────────────────────────────────────────────────
 * | Data Type               | TTL      | Examples                             |
 * |-------------------------|----------|--------------------------------------|
 * | Transactional (default) | 30s      | Inventory, orders, tickets, POS,     |
 * |                         |          | audit logs, IoT readings             |
 * | Reference/Configuration | 300s     | License info, mail accounts,         |
 * |                         |          | system settings, static lookups      |
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 * - Apply `@UseInterceptors(CacheInterceptor)` on GET endpoints for automatic caching
 * - Use `@CacheTTL(300)` to override TTL for reference data endpoints
 * - Inject `CacheInvalidationHelper` in controllers for write operation invalidation
 * - Import `CacheInterceptor` and `CacheTTL` from `@nestjs/cache-manager`
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 */

export { AppCacheModule } from './cache.module';
export { CacheInvalidationHelper } from './cache-invalidation.helper';

// Re-export commonly used cache decorators/interceptors for convenience
export { CacheInterceptor, CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
