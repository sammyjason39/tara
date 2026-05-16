import { Injectable } from '@nestjs/common';
import { locations as Location, stock_movements as StockMovement, stock_levels as StockLevel, inventory_audit_cycles as AuditCycle, inventory_adjustments as InventoryAdjustment } from '@prisma/client';
import { IWarehouseRepository, WarehouseStats } from '../../../modules/warehouse/repositories/interfaces/warehouse.repository.interface';
import { IStockMovementRepository, StockReservation } from './interfaces/stock-movement.repository.interface';
import { IInventoryAuditRepository } from './interfaces/inventory-audit.repository.interface';
import { StockIntakeDto } from '../dto/stock-intake.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { CreateAdjustmentDto } from '../dto/create-adjustment.dto';
import { TenantContext } from '../../../gateway/tenant-context.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WarehouseMockRepository implements IWarehouseRepository {
  private locations: Location[] = [];
  async findAll(ctx: TenantContext) { return this.locations.filter(l => l.tenant_id === ctx.tenant_id); }
  async findById(ctx: TenantContext, id: string) { return this.locations.find(l => l.id === id && l.tenant_id === ctx.tenant_id) || null; }
  async getInventoryStats(ctx: TenantContext, location_id: string): Promise<WarehouseStats> {
    return { totalItems: 0, totalQuantity: 0, valuation: 0 };
  }
  async updateComplianceStatus(ctx: TenantContext, id: string, status: string) {
    const loc = this.locations.find(l => l.id === id && l.tenant_id === ctx.tenant_id);
    if (loc) (loc as any).status = status;
    return loc!;
  }
}

@Injectable()
export class StockMovementMockRepository implements IStockMovementRepository {
  async intake(ctx: TenantContext, data: StockIntakeDto) { return {} as any; }
  async transfer(ctx: TenantContext, data: TransferStockDto) { return []; }
  async consume(ctx: TenantContext, data: any) { return {} as any; }
  async reserve(ctx: TenantContext, data: StockReservation) {}
  async release(ctx: TenantContext, data: StockReservation) {}
  async findAll(ctx: TenantContext) { return []; }
  async getBalances(ctx: TenantContext) { return []; }
}

@Injectable()
export class InventoryAuditMockRepository implements IInventoryAuditRepository {
  async createAuditCycle(ctx: TenantContext, data: any) { return {} as any; }
  async getAuditCycles(ctx: TenantContext) { return []; }
  async finalizeAudit(ctx: TenantContext, cycleId: string) { return {} as any; }
  async createAdjustment(ctx: TenantContext, data: CreateAdjustmentDto) { return {} as any; }
  async approveAdjustment(ctx: TenantContext, id: string) { return {} as any; }
  async getAdjustments(ctx: TenantContext) { return []; }
}
