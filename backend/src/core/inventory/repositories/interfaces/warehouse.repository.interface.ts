import { locations as Location } from "@prisma/client";

export interface WarehouseStats {
  totalItems: number;
  totalQuantity: number;
  valuation: number;
  lastAuditDate?: Date;
}

export abstract class IWarehouseRepository {
  /**
   * Find all warehouse locations for a tenant
   */
  abstract findAll(tenant_id: string): Promise<Location[]>;

  /**
   * Find a specific warehouse by ID
   */
  abstract findById(tenant_id: string, id: string): Promise<Location | null>;

  /**
   * Get financial and operational stats for a specific warehouse
   */
  abstract getInventoryStats(tenant_id: string, location_id: string): Promise<WarehouseStats>;

  /**
   * Update compliance status (e.g., for audits or safety checks)
   */
  abstract updateComplianceStatus(tenant_id: string, id: string, status: string): Promise<Location>;

  /**
   * IoT Placeholder: Register a sensor gateway for this warehouse
   */
  abstract registerSensorGateway?(tenant_id: string, location_id: string, gatewayId: string): Promise<void>;
}
