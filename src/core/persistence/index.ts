// src/core/persistence/index.ts

/**
 * ============================================================
 */

export const nextId = (prefix?: string) => {
  const id = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${id}` : id;
};

/**
 * Mock storage helpers used by some legacy repositories
 */
export const saveToStorage = (key: string, data: any) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(data));
  }
};

export const loadFromStorage = <T>(
  key: string,
  defaultValue: T | null = null,
): T | null => {
  if (typeof window === "undefined") return defaultValue;
  const data = window.localStorage.getItem(key);
  return data ? (JSON.parse(data) as T) : defaultValue;
};

export const ensureSeed = <T>(key: string, initialData: T[]): T[] => {
  if (typeof window === "undefined") return initialData;
  const existing = window.localStorage.getItem(key);
  if (existing) return JSON.parse(existing) as T[];
  window.localStorage.setItem(key, JSON.stringify(initialData));
  return initialData;
};
