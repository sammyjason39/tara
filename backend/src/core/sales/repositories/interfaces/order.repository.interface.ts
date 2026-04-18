import { SalesOrder } from "../../entities/sales-order.entity";

export interface SalesOrderFilters {
  status?: string;
  opportunityId?: string;
  customerName?: string;
}

export interface ISalesOrderRepository {
  /**
   * Find orders for a tenant with optional filters
   */
  findAll(tenant_id: string, filters?: SalesOrderFilters): Promise<SalesOrder[]>;

  /**
   * Get specific order by ID
   */
  findById(tenant_id: string, id: string): Promise<SalesOrder | null>;

  /**
   * Create a new order from a Won deal or Ecommerce intent
   */
  create(tenant_id: string, data: Partial<SalesOrder>, tx?: any): Promise<SalesOrder>;

  /**
   * Update order status (Draft -> Processing -> Shipped -> Delivered)
   */
  updateStatus(tenant_id: string, id: string, status: string): Promise<SalesOrder>;

  /**
   * Link to financial documents
   */
  linkInvoice(tenant_id: string, id: string, invoiceId: string): Promise<SalesOrder>;

  /**
   * Hardened Inventory Sync: Set the fulfillment location (Branch/Warehouse)
   */
  setFulfillmentLocation(tenant_id: string, id: string, location_id: string): Promise<SalesOrder>;
}
