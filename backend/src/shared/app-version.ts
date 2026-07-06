import { readFileSync } from 'fs';
import { join } from 'path';

let cachedVersion: string | null = null;

/** Read app version from VERSION file (repo root or backend cwd). */
export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;

  const candidates = [
    join(process.cwd(), 'VERSION'),
    join(process.cwd(), '..', 'VERSION'),
    join(__dirname, '..', '..', '..', 'VERSION'),
  ];

  for (const filePath of candidates) {
    try {
      cachedVersion = readFileSync(filePath, 'utf8').trim();
      return cachedVersion;
    } catch {
      // try next path
    }
  }

  cachedVersion = process.env.APP_VERSION || '2.0.0';
  return cachedVersion;
}
