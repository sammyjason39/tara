import { locations as Location } from "@prisma/client";

export interface WarehouseStats {
  totalItems: number;
  totalQuantity: number;
  valuation: number;
  lastAuditDate?: Date;
}

export interface IWarehouseRepository {
  /**
   * Find all warehouse locations for a tenant
   */
  findAll(tenant_id: string): Promise<Location[]>;

  /**
   * Find a specific warehouse by ID
   */
  findById(tenant_id: string, id: string): Promise<Location | null>;

  /**
   * Get financial and operational stats for a specific warehouse
   */
  getInventoryStats(tenant_id: string, location_id: string): Promise<WarehouseStats>;

  /**
   * Update compliance status (e.g., for audits or safety checks)
   */
  updateComplianceStatus(tenant_id: string, id: string, status: string): Promise<Location>;

  /**
   * IoT Placeholder: Register a sensor gateway for this warehouse
   */
  registerSensorGateway?(tenant_id: string, location_id: string, gatewayId: string): Promise<void>;
}
