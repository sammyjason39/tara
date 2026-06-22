import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheInvalidationHelper } from './cache-invalidation.helper';

describe('CacheInvalidationHelper', () => {
  let helper: CacheInvalidationHelper;
  let mockCacheManager: { clear: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCacheManager = {
      clear: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true),
    };
    helper = new CacheInvalidationHelper(mockCacheManager as any);
  });

  describe('invalidateAll', () => {
    it('should call clear() on the cache manager', async () => {
      await helper.invalidateAll();
      expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
    });

    it('should not throw when cache manager fails', async () => {
      mockCacheManager.clear.mockRejectedValue(new Error('Cache unavailable'));
      await expect(helper.invalidateAll()).resolves.toBeUndefined();
    });
  });

  describe('invalidateKey', () => {
    it('should call del() with the specified key', async () => {
      await helper.invalidateKey('/inventory/items');
      expect(mockCacheManager.del).toHaveBeenCalledWith('/inventory/items');
    });

    it('should not throw when cache manager fails', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Cache unavailable'));
      await expect(helper.invalidateKey('any-key')).resolves.toBeUndefined();
    });
  });

  describe('invalidateKeys', () => {
    it('should call del() for each key provided', async () => {
      const keys = ['/inventory/items', '/inventory/balances', '/inventory/movements'];
      await helper.invalidateKeys(keys);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.del).toHaveBeenCalledWith('/inventory/items');
      expect(mockCacheManager.del).toHaveBeenCalledWith('/inventory/balances');
      expect(mockCacheManager.del).toHaveBeenCalledWith('/inventory/movements');
    });

    it('should handle empty keys array', async () => {
      await helper.invalidateKeys([]);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });
});
