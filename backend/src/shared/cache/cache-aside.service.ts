import { Injectable } from '@nestjs/common';

/**
 * Simple cache-aside service. In production, this would use Redis.
 * For now, uses an in-memory Map with TTL support.
 */
@Injectable()
export class CacheAsideService {
  private cache = new Map<string, { value: any; expires: number }>();

  static LEAVE_BALANCE_TTL = 300_000;
  static EMPLOYEE_PROFILE_TTL = 300_000;

  static leaveBalnceKey(employeeId: string) { return `leave_balance:${employeeId}`; }
  static leaveBalanceKey(employeeId: string, year?: number) { return `leave_balance:${employeeId}:${year || 'current'}`; }
  static employeeProfileKey(employeeId: string) { return `employee_profile:${employeeId}`; }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: any, ttlMs: number = 300_000): Promise<void> {
    this.cache.set(key, { value, expires: Date.now() + ttlMs });
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number = 300_000): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
