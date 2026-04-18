import { Injectable } from '@nestjs/common';
import { locations as Location, stock_movements as StockMovement, stock_levels as StockLevel, inventory_audit_cycles as AuditCycle, inventory_adjustments as InventoryAdjustment } from '@prisma/client';
import { IWarehouseRepository, WarehouseStats } from './interfaces/warehouse.repository.interface';
import { IStockMovementRepository, StockReservation } from './interfaces/stock-movement.repository.interface';
import { IInventoryAuditRepository } from './interfaces/inventory-audit.repository.interface';
import { StockIntakeDto } from '../dto/stock-intake.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { CreateAdjustmentDto } from '../dto/create-adjustment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WarehouseMockRepository implements IWarehouseRepository {
  private locations: Location[] = [];
  async findAll(tenant_id: string) { return this.locations.filter(l => l.tenant_id === tenant_id); }
  async findById(tenant_id: string, id: string) { return this.locations.find(l => l.id === id && l.tenant_id === tenant_id) || null; }
  async getInventoryStats(tenant_id: string, location_id: string): Promise<WarehouseStats> {
    return { totalItems: 0, totalQuantity: 0, valuation: 0 };
  }
  async updateComplianceStatus(tenant_id: string, id: string, status: string) {
    const loc = this.locations.find(l => l.id === id);
    if (loc) (loc as any).status = status;
    return loc!;
  }
}

@Injectable()
export class StockMovementMockRepository implements IStockMovementRepository {
  async intake(tenant_id: string, data: StockIntakeDto) { return {} as any; }
  async transfer(tenant_id: string, data: TransferStockDto) { return []; }
  async consume(tenant_id: string, data: any) { return {} as any; }
  async reserve(tenant_id: string, data: StockReservation) {}
  async release(tenant_id: string, data: StockReservation) {}
  async findAll(tenant_id: string) { return []; }
  async getBalances(tenant_id: string) { return []; }
}

@Injectable()
export class InventoryAuditMockRepository implements IInventoryAuditRepository {
  async createAuditCycle(tenant_id: string, data: any) { return {} as any; }
  async getAuditCycles(tenant_id: string) { return []; }
  async finalizeAudit(tenant_id: string, cycleId: string) { return {} as any; }
  async createAdjustment(tenant_id: string, data: CreateAdjustmentDto) { return {} as any; }
  async approveAdjustment(tenant_id: string, id: string) { return {} as any; }
  async getAdjustments(tenant_id: string) { return []; }
}
