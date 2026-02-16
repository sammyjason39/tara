const isBrowser = typeof window !== "undefined";

// Node.js File System Support (Dynamic Import to avoid Browser Crash)
let fs: any;
let path: any;
if (!isBrowser) {
  try {
    fs = require("fs");
    path = require("path");
    
    // Ensure .db directory exists
    const dbDir = path.resolve(process.cwd(), ".db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (e) {
    console.warn("Storage: Failed to load Node 'fs' module. Persistence disabled in SSR.");
  }
}

function getFilePath(key: string) {
  if (isBrowser) return null;
  // Sanitize key to be safe filename
  const safeName = key.replace(/[^a-z0-9-]/gi, "_");
  return path.resolve(process.cwd(), ".db", `${safeName}.json`);
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  // 1. Browser Strategy
  if (isBrowser) {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  // 2. Node.js Strategy
  if (fs) {
    const file = getFilePath(key);
    if (file && fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, "utf-8");
        return JSON.parse(raw) as T;
      } catch (e) {
        console.error(`Storage Read Error [${key}]:`, e);
      }
    }
  }

  return fallback;
}

export function saveToStorage<T>(key: string, value: T) {
  // 1. Browser Strategy
  if (isBrowser) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return;
  }

  // 2. Node.js Strategy
  if (fs) {
    const file = getFilePath(key);
    if (file) {
      try {
        fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
      } catch (e) {
        console.error(`Storage Write Error [${key}]:`, e);
      }
    }
  }
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
