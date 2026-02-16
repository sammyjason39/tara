import { Injectable, NotFoundException } from '@nestjs/common';
import { IRetailRepository } from './repositories/retail.repository.interface';
import { RetailStore, RetailProduct, RetailOrder, RetailShift } from './entities/retail.entity';
import { CreateStoreDto, CreateOrderDto, OpenShiftDto, CloseShiftDto } from './dto/retail.dto';

@Injectable()
export class RetailService {
  constructor(private readonly retailRepository: IRetailRepository) {}

  // Stores
  async listStores(tenantId: string): Promise<RetailStore[]> {
    return this.retailRepository.listStores(tenantId);
  }

  async createStore(tenantId: string, locationId: string, data: CreateStoreDto): Promise<RetailStore> {
    return this.retailRepository.createStore(tenantId, locationId, data);
  }

  // Products
  async listProducts(tenantId: string): Promise<RetailProduct[]> {
    return this.retailRepository.listProducts(tenantId);
  }

  // Orders
  async listOrders(tenantId: string, storeId?: string): Promise<RetailOrder[]> {
    return this.retailRepository.listOrders(tenantId, storeId);
  }

  async createOrder(tenantId: string, locationId: string, data: CreateOrderDto): Promise<RetailOrder> {
    // Business Logic: Check if shift is open for the store/terminal/employee
    // For now, simple order creation
    return this.retailRepository.createOrder(tenantId, locationId, data);
  }

  // Shifts
  async getActiveShift(tenantId: string, storeId: string, employeeId: string): Promise<RetailShift | null> {
    return this.retailRepository.getActiveShift(tenantId, storeId, employeeId);
  }

  async openShift(tenantId: string, locationId: string, employeeId: string, data: OpenShiftDto): Promise<RetailShift> {
    // Check if already has an active shift
    const active = await this.retailRepository.getActiveShift(tenantId, data.store_id, employeeId);
    if (active) {
      throw new Error('Shift already active for this employee and store.');
    }
    return this.retailRepository.openShift(tenantId, locationId, employeeId, data);
  }

  async closeShift(tenantId: string, shiftId: string, data: CloseShiftDto): Promise<RetailShift> {
    return this.retailRepository.closeShift(tenantId, shiftId, data);
  }
}
