// Session Persistence for Stock Opname

const STORAGE_KEY_PREFIX = 'opname_session_';

export interface OpnameSession {
  cycleId: string;
  locationId: string;
  entries: ScanEntry[];
  unresolvedBarcodes: string[];
  anomalies: string[];
  newItems: any[];
  createdAt: number;
  lastUpdated: number;
}

export interface ScanEntry {
  id?: string;
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
  serials?: string[];
}

function getSessionKey(tenantId: string, locationId: string): string {
  return `${STORAGE_KEY_PREFIX}${tenantId}:${locationId}`;
}

export function saveOpnameSession(session: OpnameSession): void {
  try {
    const key = getSessionKey(session.tenantId || 'unknown', session.locationId);
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save opname session:', error);
  }
}

export function loadOpnameSession(tenantId: string, locationId: string): OpnameSession | null {
  try {
    const key = getSessionKey(tenantId, locationId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Verify required fields exist
    if (!session.cycleId || !session.locationId) return null;
    return session;
  } catch (error) {
    console.error('Failed to load opname session:', error);
    return null;
  }
}

export function clearOpnameSession(tenantId: string, locationId: string): void {
  try {
    const key = getSessionKey(tenantId, locationId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear opname session:', error);
  }
}
