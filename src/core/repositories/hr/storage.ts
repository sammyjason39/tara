const isBrowser = typeof window !== "undefined";

/**
 * ============================================================
 * ZENVIX STORAGE ENGINE (LOCKED - FINAL)
 *
 * Dual Mode Persistence:
 *
 * Browser:
 *   - Uses localStorage
 *
 * Node.js Backend:
 *   - Uses real File System persistence inside /.db/
 *
 * Critical Fix:
 *   - NO async init
 *   - NO lazy require/import
 *   - Directory is guaranteed before any save/load
 *
 * This is the permanent correct implementation.
 * ============================================================
 */

/* ============================================================
   NODE FILE SYSTEM (BACKEND SAFE)
   ============================================================ */

import fs from "node:fs";
import path from "node:path";

/**
 * Database folder root (.db/)
 * Created immediately when backend starts.
 */
const DB_DIR = path.resolve(process.cwd(), ".db");

/**
 * Ensure DB directory exists (Node only)
 */
if (!isBrowser) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  console.log("📂 Storage Engine: Node.js Persistence Enabled (.db/)");
}

/**
 * Resolve safe file path for any storage key
 */
function getFilePath(key: string): string | null {
  if (isBrowser) return null;

  // Safe filename conversion
  const safeName = key.replace(/[^a-z0-9-]/gi, "_");

  return path.resolve(DB_DIR, `${safeName}.json`);
}

/* ============================================================
   LOAD
   ============================================================ */

export function loadFromStorage<T>(key: string, fallback: T): T {
  /**
   * Browser Strategy → localStorage
   */
  if (isBrowser) {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Node Strategy → File System
   */
  const file = getFilePath(key);
  if (!file) return fallback;

  if (!fs.existsSync(file)) {
    return fallback;
  }

  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Storage Read Error [${key}]:`, e);
    return fallback;
  }
}

/* ============================================================
   SAVE
   ============================================================ */

export function saveToStorage<T>(key: string, value: T) {
  /**
   * Browser Strategy → localStorage
   */
  if (isBrowser) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return;
  }

  /**
   * Node Strategy → File System
   */
  const file = getFilePath(key);
  if (!file) return;

  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
  } catch (e) {
    console.error(`Storage Write Error [${key}]:`, e);
  }
}

/* ============================================================
   ENSURE SEED
   ============================================================ */

export function ensureSeed<T>(key: string, seed: T): T {
  const existing = loadFromStorage<T | null>(key, null);

  if (existing !== null) return existing;

  saveToStorage(key, seed);
  return seed;
}

/* ============================================================
   ID GENERATOR
   ============================================================ */

export function nextId(prefix: string): string {
  const key = `id-counter:${prefix}`;

  const current = loadFromStorage<number>(key, 0) + 1;
  saveToStorage(key, current);

  return `${prefix}-${current}-${Date.now()}`;
}
