import { Injectable } from '@nestjs/common';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { StockIntakeDto } from './dto/stock-intake.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { IInventoryRepository } from './repositories/inventory.repository.interface';

@Injectable()
export class InventoryService {
  constructor(private readonly repository: IInventoryRepository) {}

  async getDashboard(tenantId: string) {
    return this.repository.getDashboard(tenantId);
  }

  async getItems(tenantId: string) {
    return this.repository.getItems(tenantId);
  }

  async createItem(tenantId: string, data: CreateItemDto) {
    return this.repository.createItem(tenantId, data);
  }

  async getBalances(tenantId: string, locationId?: string) {
    return this.repository.getBalances(tenantId, locationId);
  }

  async getMovements(tenantId: string, itemId?: string) {
    return this.repository.getMovements(tenantId, itemId);
  }

  async intakeStock(tenantId: string, data: StockIntakeDto) {
    return this.repository.intakeStock(tenantId, data);
  }

  async transferStock(tenantId: string, data: TransferStockDto) {
    return this.repository.transferStock(tenantId, data);
  }

  async getAdjustments(tenantId: string) {
    return this.repository.getAdjustments(tenantId);
  }

  async createAdjustment(tenantId: string, data: CreateAdjustmentDto) {
    return this.repository.createAdjustment(tenantId, data);
  }

  async approveAdjustment(tenantId: string, adjustmentId: string, approvedBy: string) {
    return this.repository.approveAdjustment(tenantId, adjustmentId, approvedBy);
  }

  async getAlerts(tenantId: string) {
    return this.repository.getAlerts(tenantId);
  }

  async setAlertStatus(
    tenantId: string,
    alertId: string,
    status: 'open' | 'acknowledged' | 'resolved',
  ) {
    return this.repository.setAlertStatus(tenantId, alertId, status);
  }
}

