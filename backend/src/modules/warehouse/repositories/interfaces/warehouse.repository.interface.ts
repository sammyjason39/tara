import { locations as Location } from "@prisma/client";
import { TenantContext } from "../../../../gateway/tenant-context.interface";

export interface WarehouseStats {
  totalItems: number;
  totalQuantity: number;
  valuation: number;
  lastAuditDate?: Date;
}

export abstract class IWarehouseRepository {
  /**
   * Find all warehouse locations for a tenant/company
   */
  abstract findAll(ctx: TenantContext): Promise<Location[]>;

  /**
   * Find a specific warehouse by ID
   */
  abstract findById(ctx: TenantContext, id: string): Promise<Location | null>;

  /**
   * Get financial and operational stats for a specific warehouse
   */
  abstract getInventoryStats(ctx: TenantContext, location_id: string): Promise<WarehouseStats>;

  /**
   * Update compliance status
   */
  abstract updateComplianceStatus(ctx: TenantContext, id: string, status: string): Promise<Location>;

  /**
   * IoT Placeholder: Register a sensor gateway
   */
  abstract registerSensorGateway?(ctx: TenantContext, location_id: string, gatewayId: string): Promise<void>;
}
