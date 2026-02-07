const isBrowser = typeof window !== "undefined";

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureSeed<T>(key: string, seed: T): T {
  const existing = loadFromStorage<T | null>(key, null);
  if (existing) return existing;
  saveToStorage(key, seed);
  return seed;
}

export function nextId(prefix: string): string {
  const key = `id-counter:${prefix}`;
  const current = loadFromStorage<number>(key, 0) + 1;
  saveToStorage(key, current);
  return `${prefix}-${current}`;
}
