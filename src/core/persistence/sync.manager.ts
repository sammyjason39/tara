import { db } from "./pglite.client";
import { apiRequest } from "@/core/api/apiClient";
import { SessionContext } from "@/core/security/session";

export type SyncStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  payload: any;
  attempts: number;
  status: SyncStatus;
}

/**
 * SyncManager
 * Handles background synchronization of local data to the cloud.
 */
class SyncManager {
  private isProcessing = false;
  private maxAttempts = 5;
  private currentSession: SessionContext | null = null;

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    // Listen for local changes
    window.addEventListener("LOCAL_DATA_CHANGED", () => {
      this.flushQueue();
    });

    // Listen for connectivity restoration
    window.addEventListener("online", () => {
      console.log("[SyncManager] Back online, flushing queue...");
      this.flushQueue();
    });
  }

  public setSession(session: SessionContext | null) {
    this.currentSession = session;
  }

  /**
   * Iterates through the sync queue and pushes pending data to the backend.
   */
  public async flushQueue() {
    if (this.isProcessing || !navigator.onLine || !this.currentSession) return;

    this.isProcessing = true;
    this.emitSyncEvent("SYNC_START");

    try {
      const pendingItemsResult = await db.query<SyncQueueItem>(
        "SELECT * FROM sync_queue WHERE status = 'PENDING' OR (status = 'FAILED' AND attempts < $1) ORDER BY created_at ASC",
        [this.maxAttempts]
      );

      const pendingItems = Array.isArray(pendingItemsResult) ? pendingItemsResult : [];
      console.log(`[SyncManager] Found ${pendingItems.length} items to sync.`);

      for (const item of pendingItems) {
        await this.processItem(item, this.currentSession);
      }
    } catch (error) {
      console.error("[SyncManager] Queue processing failed:", error);
    } finally {
      this.isProcessing = false;
      this.emitSyncEvent("SYNC_END");
    }
  }

  private async processItem(item: SyncQueueItem, session: SessionContext) {
    const now = new Date().toISOString();
    
    // Update status to PROCESSING
    await db.query("UPDATE sync_queue SET status = 'PROCESSING', updated_at = $1 WHERE id = $2", [now, item.id]);

    try {
      const endpoint = this.getEndpoint(item.entity_type);
      await apiRequest(endpoint, "POST", session, item.payload);

      // Mark as COMPLETED
      await db.query("UPDATE sync_queue SET status = 'COMPLETED', updated_at = $1 WHERE id = $2", [now, item.id]);
      console.log(`[SyncManager] Synced ${item.entity_type}: ${item.id}`);

    } catch (error: any) {
      console.error(`[SyncManager] Failed to sync ${item.id}:`, error);
      
      const nextAttempts = item.attempts + 1;
      await db.query(
        "UPDATE sync_queue SET status = 'FAILED', attempts = $1, error = $2, updated_at = $3 WHERE id = $4",
        [nextAttempts, error.message, now, item.id]
      );
    }
  }

  private getEndpoint(entityType: string): string {
    switch (entityType) {
      case "SALE":
        return "/retail/orders";
      default:
        throw new Error(`[SyncManager] Unsupported entity type for sync: ${entityType}`);
    }
  }

  /**
   * Fetches incremental updates from the cloud and applies them locally.
   */
  public async pullDelta(session: SessionContext) {
    if (!navigator.onLine || !session) return;

    try {
      // 1. Get last sync anchor
      const anchorResult = await db.query<any>(
        "SELECT last_sync FROM sync_anchors WHERE entity_type = 'GLOBAL' AND tenant_id = $1",
        [session.tenantId]
      );
      
      const lastSync = (anchorResult as any)[0]?.last_sync || new Date(0).toISOString();

      // 2. Fetch delta from backend
      const delta = await apiRequest<any>(`/sync/delta?since=${encodeURIComponent(lastSync)}`, "GET", session);
      
      if (!delta) return;

      // 3. Apply delta to local PGLite
      await this.applyDelta(delta);

      // 4. Update anchor
      const now = new Date().toISOString();
      await db.query(`
        INSERT INTO sync_anchors (id, tenant_id, entity_type, last_sync) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (tenant_id, entity_type) 
        DO UPDATE SET last_sync = EXCLUDED.last_sync`,
        [`anchor-${Date.now()}`, session.tenantId, 'GLOBAL', now]
      );

      console.log(`[SyncManager] Delta pull complete at ${now}`);

    } catch (error) {
      console.error("[SyncManager] Delta pull failed:", error);
    }
  }

  private async applyDelta(data: any) {
    // Utility to upsert records into PGLite
    if (data.itemMaster) {
        for (const item of data.itemMaster) {
            await db.query(`
                INSERT INTO item_master (id, tenant_id, code, name, price, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET 
                name = EXCLUDED.name, price = EXCLUDED.price, updated_at = EXCLUDED.updated_at`,
                [item.id, item.tenantId, item.code, item.name, item.price, item.updatedAt]
            );
        }
    }
  }

  private emitSyncEvent(type: "SYNC_START" | "SYNC_END") {
    window.dispatchEvent(new CustomEvent(type));
  }
}

export const syncManager = new SyncManager();
export default syncManager;
