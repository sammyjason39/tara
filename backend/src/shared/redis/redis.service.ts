import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/**
 * RedisService
 * Provides atomic operations for sequences, caching, and rate limiting.
 * Includes a fallback for development environments without a Redis instance.
 * Type 'any' used for client to avoid compilation errors if 'redis' package is not installed.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: any = null;
  private isConnected = false;
  private memoryCache: Map<string, number> = new Map();

  async onModuleInit() {
    // In Production/Stage, we connect to a real Redis
    // For DEV_MOCK_MODE or when no URL is provided, we use the memory fallback
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      try {
        // @ts-ignore - Module may be missing in dev environments; using dynamic import to avoid hard dependency
        const { createClient } = await import('redis');
        this.client = createClient({ url: redisUrl });
        this.client.on('error', (err: any) => {
          console.warn('Redis Client Error, failing back to memory:', err.message);
          this.isConnected = false;
        });
        await this.client.connect();
        this.isConnected = true;
      } catch (err) {
        console.warn('Could not load or connect to Redis, using in-memory fallback.');
        this.isConnected = false;
      }
    }
  }

  async onModuleDestroy() {
    if (this.isConnected && this.client) {
      await this.client.disconnect();
    }
  }

  /**
   * Atomic increment for a key
   */
  async incr(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      return await this.client.incr(key);
    }

    // Memory Fallback (Atomic within this process)
    const current = this.memoryCache.get(key) || 0;
    const next = current + 1;
    this.memoryCache.set(key, next);
    return next;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.set(key, value, {
        EX: ttlSeconds,
      });
      return;
    }
    this.memoryCache.set(key, parseInt(value));
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      return await this.client.get(key);
    }
    const val = this.memoryCache.get(key);
    return val !== undefined ? val.toString() : null;
  }
}
