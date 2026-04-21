import { db } from "../../../core/persistence/pglite.client";
import { v4 as uuidv4 } from "uuid";

export interface LocalSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface LocalSale {
  tenantId: string;
  storeId: string;
  cashierId?: string;
  customerId?: string;
  items: LocalSaleItem[];
  totalAmount: number;
}

/**
 * Retail PGLite Repository
 * Handles local-first persistence for the Retail module.
 */
export class RetailPGLiteRepository {
  /**
   * Records a retail sale to the local PGLite instance.
   * Emits LOCAL_DATA_CHANGED for the sync engine.
   */
  public async createSale(sale: LocalSale): Promise<string> {
    const saleId = uuidv4();
    const now = new Date().toISOString();

    try {
      // Begin transaction (implicitly handled by PGLite .exec if needed, but we use queries)
      // We'll use a single block for safety if PGLite supports it, or just sequential queries for now
      
      // 1. Insert Sales Record
      await db.query(
        `INSERT INTO retail_sales (id, tenant_id, store_id, cashier_id, customer_id, total_amount, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          saleId,
          sale.tenantId,
          sale.storeId,
          sale.cashierId || null,
          sale.customerId || null,
          sale.totalAmount,
          'paid',
          now,
          now
        ]
      );

      // 2. Insert Sale Items
      for (const item of sale.items) {
        await db.query(
          `INSERT INTO retail_sale_items (id, sale_id, product_id, quantity, unit_price, total_price, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            saleId,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            sale.tenantId
          ]
        );

        // 3. Update Local Stock Level (Subtract)
        await db.query(
          `UPDATE stock_levels 
           SET on_hand = on_hand - $1, 
               available = available - $1, 
               updated_at = $2
           WHERE product_id = $3 AND tenant_id = $4`,
          [item.quantity, now, item.productId, sale.tenantId]
        );
      }

      // 4. Push to Sync Queue
      await db.query(
        `INSERT INTO sync_queue (id, entity_type, payload, status)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), "SALE", JSON.stringify(sale), "PENDING"]
      );

      // Notify Sync Engine
      this.emitDataChanged("retail_sales", saleId);

      return saleId;
    } catch (error) {
      console.error("[RetailPGLiteRepository] Failed to create local sale:", error);
      throw error;
    }
  }

  /**
   * Fetches local products for POS
   */
  public async getProducts(tenantId: string): Promise<any[]> {
    return db.query("SELECT * FROM products WHERE tenant_id = $1 AND status = 'active'", [tenantId]);
  }

  /**
   * Fetches local stock levels
   */
  public async getStockLevels(tenantId: string, locationId: string): Promise<any[]> {
    return db.query("SELECT * FROM stock_levels WHERE tenant_id = $1 AND location_id = $2", [tenantId, locationId]);
  }

  /**
   * Emits a global event to notify the sync engine of local changes
   */
  private emitDataChanged(tableName: string, entityId: string) {
    console.log(`[PGLite] Change detected in ${tableName}: ${entityId}`);
    const event = new CustomEvent("LOCAL_DATA_CHANGED", {
      detail: {
        table: tableName,
        id: entityId,
        timestamp: new Date().toISOString(),
      },
    });
    window.dispatchEvent(event);
  }
}

export const retailLocalRepo = new RetailPGLiteRepository();
