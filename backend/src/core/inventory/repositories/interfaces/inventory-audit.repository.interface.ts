import { inventory_audit_cycles as AuditCycle, inventory_adjustments as InventoryAdjustment } from "@prisma/client";
import { CreateAdjustmentDto } from "../../dto/create-adjustment.dto";

export interface IInventoryAuditRepository {
  /**
   * Initialize a new stock-take cycle
   */
  createAuditCycle(tenant_id: string, data: any): Promise<AuditCycle>;

  /**
   * List all audit cycles
   */
  getAuditCycles(tenant_id: string): Promise<AuditCycle[]>;

  /**
   * Close a cycle and trigger reconciliation
   */
  finalizeAudit(tenant_id: string, cycleId: string, performedBy: string): Promise<AuditCycle>;

  /**
   * Create a quantity adjustment request
   */
  createAdjustment(tenant_id: string, data: CreateAdjustmentDto, tx?: any): Promise<InventoryAdjustment>;

  /**
   * Approve an adjustment and update stock levels
   */
  approveAdjustment(tenant_id: string, id: string, approvedBy: string): Promise<InventoryAdjustment>;

  /**
   * Historical query for adjustments
   */
  getAdjustments(tenant_id: string, filters?: any): Promise<InventoryAdjustment[]>;
}
