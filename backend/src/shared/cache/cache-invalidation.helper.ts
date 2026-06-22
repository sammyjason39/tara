import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

/**
 * CacheInvalidationHelper
 *
 * Provides cache invalidation utilities for write operations (POST/PUT/PATCH/DELETE).
 *
 * Usage in controllers:
 * ```typescript
 * @Controller('inventory')
 * export class InventoryController {
 *   constructor(private readonly cacheHelper: CacheInvalidationHelper) {}
 *
 *   @Post()
 *   async create(@Body() dto: CreateItemDto) {
 *     const result = await this.service.create(dto);
 *     await this.cacheHelper.invalidateAll();
 *     return result;
 *   }
 *
 *   @Put(':id')
 *   async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
 *     const result = await this.service.update(id, dto);
 *     await this.cacheHelper.invalidateAll();
 *     return result;
 *   }
 * }
 * ```
 *
 * Invalidation strategy:
 * - On any write operation (POST/PUT/PATCH/DELETE), call `invalidateAll()` to
 *   reset the entire cache store. This ensures stale data is never served after
 *   mutations.
 * - For targeted invalidation when you know the specific cache key, use
 *   `invalidateKey(key)`.
 *
 * Validates: Requirements 12.2, 12.3
 */
@Injectable()
export class CacheInvalidationHelper {
  private readonly logger = new Logger(CacheInvalidationHelper.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Invalidate all cached entries.
   * Should be called after any write operation (POST/PUT/PATCH/DELETE) to ensure
   * subsequent GET requests return fresh data.
   *
   * Gracefully handles cache service unavailability — logs a warning and continues
   * rather than failing the write operation.
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (error) {
      // Cache invalidation failure should not block write operations.
      // Stale data will expire naturally based on TTL.
      this.logger.warn(
        `Cache invalidation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Invalidate a specific cache key.
   * Use when you know the exact cache key to remove (e.g., a specific endpoint path).
   *
   * @param key - The cache key to invalidate
   */
  async invalidateKey(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(
        `Cache key invalidation failed for "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Invalidate multiple cache keys at once.
   * Useful when a write operation affects multiple cached endpoints.
   *
   * @param keys - Array of cache keys to invalidate
   */
  async invalidateKeys(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.invalidateKey(key)));
  }
}
