import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdjustmentDto } from '../dto/create-adjustment.dto';
import { CreateItemDto } from '../dto/create-item.dto';
import { StockIntakeDto } from '../dto/stock-intake.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { InventoryAlert } from '../entities/inventory-alert.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockAdjustment } from '../entities/stock-adjustment.entity';
import { StockBalance } from '../entities/stock-balance.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { IInventoryRepository, InventoryDashboard } from './inventory.repository.interface';

@Injectable()
export class InventoryMockRepository extends IInventoryRepository {
  private readonly items: InventoryItem[] = [];
  private readonly balances: StockBalance[] = [];
  private readonly movements: StockMovement[] = [];
  private readonly adjustments: StockAdjustment[] = [];
  private readonly alerts: InventoryAlert[] = [];

  constructor() {
    super();
    this.seedTenant('tenant-001', 'location-001');
    this.seedTenant('tenant-002', 'location-002');
  }

  private seedTenant(tenantId: string, locationId: string): void {
    const itemA: InventoryItem = {
      id: `${tenantId}-itm-1`,
      tenantId,
      sku: 'RM-STEEL-001',
      name: 'Steel Sheet Grade A',
      category: 'raw_material',
      uom: 'sheet',
      barcode: `BC-${tenantId}-RM-STEEL-001`,
      qrCode: `QR-${tenantId}-RM-STEEL-001`,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const itemB: InventoryItem = {
      id: `${tenantId}-itm-2`,
      tenantId,
      sku: 'CONS-GLOVE-010',
      name: 'Safety Gloves',
      category: 'consumable',
      uom: 'box',
      barcode: `BC-${tenantId}-CONS-GLOVE-010`,
      qrCode: `QR-${tenantId}-CONS-GLOVE-010`,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(itemA, itemB);

    this.balances.push(
      {
        id: `${tenantId}-bal-1`,
        tenantId,
        itemId: itemA.id,
        locationId,
        departmentId: 'production',
        quantity: 200,
        reservedQuantity: 40,
        avgUnitCost: 850000,
        reorderPoint: 120,
        safetyStock: 90,
        updatedAt: new Date(),
      },
      {
        id: `${tenantId}-bal-2`,
        tenantId,
        itemId: itemB.id,
        locationId,
        departmentId: 'hse',
        quantity: 30,
        reservedQuantity: 2,
        avgUnitCost: 120000,
        reorderPoint: 50,
        safetyStock: 30,
        updatedAt: new Date(),
      },
    );

    this.alerts.push({
      id: `${tenantId}-alert-1`,
      tenantId,
      alertType: 'low_stock',
      severity: 'medium',
      status: 'open',
      entityId: `${tenantId}-bal-2`,
      message: 'Safety Gloves below reorder point.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async getDashboard(tenantId: string): Promise<InventoryDashboard> {
    const tenantItems = this.items.filter((item) => item.tenantId === tenantId);
    const tenantBalances = this.balances.filter((item) => item.tenantId === tenantId);
    const tenantAlerts = this.alerts.filter((item) => item.tenantId === tenantId && item.status === 'open');
    const tenantAdjustments = this.adjustments.filter(
      (item) => item.tenantId === tenantId && item.status === 'pending',
    );
    return {
      totalItems: tenantItems.length,
      totalOnHand: tenantBalances.reduce((sum, item) => sum + item.quantity, 0),
      totalValuation: tenantBalances.reduce((sum, item) => sum + item.quantity * item.avgUnitCost, 0),
      lowStockAlerts: tenantAlerts.filter((item) => item.alertType === 'low_stock').length,
      pendingAdjustments: tenantAdjustments.length,
    };
  }

  async getItems(tenantId: string): Promise<InventoryItem[]> {
    return this.items.filter((item) => item.tenantId === tenantId);
  }

  async createItem(tenantId: string, data: CreateItemDto): Promise<InventoryItem> {
    const created: InventoryItem = {
      id: `${tenantId}-itm-${this.items.length + 1}`,
      tenantId,
      sku: data.sku.toUpperCase(),
      name: data.name,
      category: data.category,
      uom: data.uom.toLowerCase(),
      barcode: `BC-${tenantId}-${data.sku.toUpperCase()}`,
      qrCode: `QR-${tenantId}-${data.sku.toUpperCase()}`,
      active: data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(created);
    return created;
  }

  async getBalances(tenantId: string, locationId?: string): Promise<StockBalance[]> {
    const scoped = this.balances.filter((item) => item.tenantId === tenantId);
    return locationId ? scoped.filter((item) => item.locationId === locationId) : scoped;
  }

  async getMovements(tenantId: string, itemId?: string): Promise<StockMovement[]> {
    const scoped = this.movements.filter((item) => item.tenantId === tenantId);
    return itemId ? scoped.filter((item) => item.itemId === itemId) : scoped;
  }

  async intakeStock(tenantId: string, data: StockIntakeDto): Promise<StockMovement> {
    const balance = this.findOrCreateBalance(tenantId, data.itemId, data.locationId, data.departmentId, data.unitCost);
    balance.quantity += data.quantity;
    balance.avgUnitCost = data.unitCost;
    balance.updatedAt = new Date();
    const movement: StockMovement = {
      id: `${tenantId}-mov-${this.movements.length + 1}`,
      tenantId,
      itemId: data.itemId,
      movementType: 'intake',
      quantity: data.quantity,
      unitCost: data.unitCost,
      reason: data.reason,
      destinationLocationId: data.locationId,
      destinationDepartmentId: data.departmentId,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      createdBy: data.createdBy || 'system',
      createdAt: new Date(),
    };
    this.movements.push(movement);
    return movement;
  }

  async transferStock(tenantId: string, data: TransferStockDto): Promise<StockMovement[]> {
    const source = this.balances.find(
      (item) =>
        item.tenantId === tenantId &&
        item.itemId === data.itemId &&
        item.locationId === data.fromLocationId &&
        (item.departmentId || '') === (data.fromDepartmentId || ''),
    );
    if (!source) throw new NotFoundException('Source stock balance not found.');
    if (source.quantity < data.quantity) throw new BadRequestException('Insufficient stock for transfer.');

    source.quantity -= data.quantity;
    source.updatedAt = new Date();

    const destination = this.findOrCreateBalance(
      tenantId,
      data.itemId,
      data.toLocationId,
      data.toDepartmentId,
      source.avgUnitCost,
    );
    destination.quantity += data.quantity;
    destination.updatedAt = new Date();

    const outMovement: StockMovement = {
      id: `${tenantId}-mov-${this.movements.length + 1}`,
      tenantId,
      itemId: data.itemId,
      movementType: 'transfer_out',
      quantity: data.quantity,
      unitCost: source.avgUnitCost,
      reason: data.reason,
      sourceLocationId: data.fromLocationId,
      sourceDepartmentId: data.fromDepartmentId,
      destinationLocationId: data.toLocationId,
      destinationDepartmentId: data.toDepartmentId,
      createdBy: data.createdBy || 'system',
      createdAt: new Date(),
    };
    const inMovement: StockMovement = {
      ...outMovement,
      id: `${tenantId}-mov-${this.movements.length + 2}`,
      movementType: 'transfer_in',
    };
    this.movements.push(outMovement, inMovement);
    return [outMovement, inMovement];
  }

  async getAdjustments(tenantId: string): Promise<StockAdjustment[]> {
    return this.adjustments.filter((item) => item.tenantId === tenantId);
  }

  async createAdjustment(tenantId: string, data: CreateAdjustmentDto): Promise<StockAdjustment> {
    const created: StockAdjustment = {
      id: `${tenantId}-adj-${this.adjustments.length + 1}`,
      tenantId,
      itemId: data.itemId,
      locationId: data.locationId,
      departmentId: data.departmentId,
      requestedDelta: data.requestedDelta,
      reason: data.reason,
      status: 'pending',
      requestedBy: data.requestedBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adjustments.push(created);
    return created;
  }

  async approveAdjustment(
    tenantId: string,
    adjustmentId: string,
    approvedBy: string,
  ): Promise<StockAdjustment> {
    const adjustment = this.adjustments.find(
      (item) => item.tenantId === tenantId && item.id === adjustmentId,
    );
    if (!adjustment) throw new NotFoundException('Adjustment not found.');
    if (adjustment.status !== 'pending') return adjustment;

    const balance = this.findOrCreateBalance(
      tenantId,
      adjustment.itemId,
      adjustment.locationId,
      adjustment.departmentId,
      0,
    );
    balance.quantity = Math.max(balance.quantity + adjustment.requestedDelta, 0);
    balance.updatedAt = new Date();

    adjustment.status = 'approved';
    adjustment.approvedBy = approvedBy;
    adjustment.approvedAt = new Date();
    adjustment.updatedAt = new Date();
    return adjustment;
  }

  async getAlerts(tenantId: string): Promise<InventoryAlert[]> {
    return this.alerts.filter((item) => item.tenantId === tenantId);
  }

  async setAlertStatus(
    tenantId: string,
    alertId: string,
    status: InventoryAlert['status'],
  ): Promise<InventoryAlert> {
    const alert = this.alerts.find((item) => item.tenantId === tenantId && item.id === alertId);
    if (!alert) throw new NotFoundException('Alert not found.');
    alert.status = status;
    alert.updatedAt = new Date();
    return alert;
  }

  private findOrCreateBalance(
    tenantId: string,
    itemId: string,
    locationId: string,
    departmentId: string | undefined,
    unitCost: number,
  ): StockBalance {
    const existing = this.balances.find(
      (item) =>
        item.tenantId === tenantId &&
        item.itemId === itemId &&
        item.locationId === locationId &&
        (item.departmentId || '') === (departmentId || ''),
    );
    if (existing) return existing;

    const created: StockBalance = {
      id: `${tenantId}-bal-${this.balances.length + 1}`,
      tenantId,
      itemId,
      locationId,
      departmentId,
      quantity: 0,
      reservedQuantity: 0,
      avgUnitCost: unitCost,
      reorderPoint: 50,
      safetyStock: 20,
      updatedAt: new Date(),
    };
    this.balances.push(created);
    return created;
  }
}

