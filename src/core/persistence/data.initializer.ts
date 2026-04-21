import { db } from "./pglite.client";
import { apiRequest } from "@/core/api/apiClient";
import { SessionContext } from "@/core/security/session";

/**
 * DataInitializer
 * Handles baseline synchronization to ensure PGLite has initial data.
 */
class DataInitializer {
  /**
   * Bootstraps the local database with baseline data from the cloud.
   */
  public async bootstrap(session: SessionContext) {
    if (!session?.tenantId) return;

    try {
      console.log("[DataInitializer] Initializing full snapshot sync...");
      await this.syncSnapshot(session);
    } catch (error) {
      console.error("[DataInitializer] Bootstrap failed:", error);
    }
  }

  private async syncSnapshot(session: SessionContext) {
    try {
      const result = await apiRequest<any>('/sync/snapshot', 'GET', session);
      
      if (!result) throw new Error("Received empty snapshot");

      const { itemMaster, staff, locations, stockLevels, prices, company } = result;

      console.log(`[DataInitializer] Received snapshot: 
        Items: ${itemMaster?.length || 0}, 
        Staff: ${staff?.length || 0}, 
        Locations: ${locations?.length || 0}, 
        Stock: ${stockLevels?.length || 0},
        Prices: ${prices?.length || 0}`);

      // Perform bulk upserts
      await db.transaction(async (tx) => {
        // 1. Sync Products
        if (itemMaster) {
          for (const p of itemMaster) {
            await tx.query(
              `INSERT INTO products (id, tenant_id, name, sku, barcode, description, unit, base_price, tax_rate, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO UPDATE SET 
                 name = EXCLUDED.name, 
                 sku = EXCLUDED.sku, 
                 barcode = EXCLUDED.barcode, 
                 base_price = EXCLUDED.base_price`,
              [p.id, session.tenantId, p.name, p.sku, p.barcode, p.description || "", p.unit || "PCS", p.base_price || 0, p.tax_rate || 0.11, p.status || "active"]
            );
          }
        }

        // 2. Sync Staff
        if (staff) {
          for (const s of staff) {
            await tx.query(
              `INSERT INTO staff (id, tenant_id, first_name, last_name, email, position, location_id, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET 
                 first_name = EXCLUDED.first_name, 
                 last_name = EXCLUDED.last_name, 
                 position = EXCLUDED.position`,
              [s.id, session.tenantId, s.first_name, s.last_name, s.email, s.position, s.location_id, s.status]
            );
          }
        }

        // 3. Sync Locations
        if (locations) {
          for (const l of locations) {
            await tx.query(
              `INSERT INTO locations (id, tenant_id, name, code, type, status)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id) DO UPDATE SET 
                 name = EXCLUDED.name, 
                 code = EXCLUDED.code`,
              [l.id, session.tenantId, l.name, l.code, l.type, l.status]
            );
          }
        }

        // 4. Sync Stock Levels
        if (stockLevels) {
          for (const sl of stockLevels) {
            await tx.query(
              `INSERT INTO stock_levels (id, tenant_id, location_id, product_id, on_hand, reserved, available, min_buffer, max_capacity)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET 
                 on_hand = EXCLUDED.on_hand, 
                 available = EXCLUDED.available`,
              [sl.id, session.tenantId, sl.location_id, sl.product_id, sl.on_hand, sl.reserved, sl.available, sl.min_buffer, sl.max_capacity]
            );
          }
        }

        // 5. Sync Prices
        if (prices) {
          for (const pr of prices) {
            await tx.query(
              `INSERT INTO product_prices (id, tenant_id, sku_id, price, is_current)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (id) DO UPDATE SET 
                 price = EXCLUDED.price, 
                 is_current = EXCLUDED.is_current`,
              [pr.id, session.tenantId, pr.sku_id, pr.price, pr.is_current]
            );
          }
        }

        // 6. Sync Company Profile
        if (company) {
          await tx.query(
            `INSERT INTO companies (id, name, legal_entity, work_email, phone, address, timezone, logo_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET 
               name = EXCLUDED.name, 
               legal_entity = EXCLUDED.legal_entity, 
               work_email = EXCLUDED.work_email,
               logo_url = EXCLUDED.logo_url`,
            [company.id, company.name, company.legalEntity, company.workEmail, company.phone, company.address, company.timezone || "UTC", company.logoUrl, company.status]
          );
        }
      });

      console.log("[DataInitializer] Snapshot sync complete.");
    } catch (error) {
      console.error("[DataInitializer] Snapshot sync failed:", error);
    }
  }
}

export const dataInitializer = new DataInitializer();
export default dataInitializer;
