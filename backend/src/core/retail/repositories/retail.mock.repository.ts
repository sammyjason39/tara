import { Injectable } from '@nestjs/common';
import { IRetailRepository } from './retail.repository.interface';
import { RetailStore, RetailProduct, RetailOrder, RetailShift } from '../entities/retail.entity';
import { CreateStoreDto, CreateOrderDto, OpenShiftDto, CloseShiftDto } from '../dto/retail.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailMockRepository implements IRetailRepository {
  private stores: RetailStore[] = [];
  private products: RetailProduct[] = [];
  private orders: RetailOrder[] = [];
  private shifts: RetailShift[] = [];

  constructor() {
    // Seed some data for development
    this.seedData();
  }

  private seedData() {
    const tenantId = 'tenant-1';
    const locationId = 'loc-1';

    this.stores.push({
      id: 'store-1',
      tenant_id: tenantId,
      location_id: locationId,
      name: 'Jakarta Flagship',
      type: 'flagship',
      status: 'active',
      address: 'Jl. Sudirman No. 1, Jakarta',
      timezone: 'Asia/Jakarta',
      currency: 'IDR',
      created_at: new Date(),
      updated_at: new Date(),
    });

    this.products.push(
      {
        id: 'prod-1',
        tenant_id: tenantId,
        sku: '882910',
        barcode: '882910',
        name: 'Premium Arabica 250g',
        description: 'Single origin roasted coffee beans',
        category: 'Coffee',
        base_price: 120000,
        tax_rate: 0.11,
        unit: 'bag',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'prod-2',
        tenant_id: tenantId,
        sku: '882911',
        barcode: '882911',
        name: 'Dark Roast 250g',
        description: 'Rich dark roast blend',
        category: 'Coffee',
        base_price: 110000,
        tax_rate: 0.11,
        unit: 'bag',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }
    );
  }

  async listStores(tenantId: string): Promise<RetailStore[]> {
    return this.stores.filter(s => s.tenant_id === tenantId);
  }

  async getStore(tenantId: string, storeId: string): Promise<RetailStore | null> {
    return this.stores.find(s => s.tenant_id === tenantId && s.id === storeId) || null;
  }

  async createStore(tenantId: string, locationId: string, data: CreateStoreDto): Promise<RetailStore> {
    const store: RetailStore = {
      id: uuidv4(),
      tenant_id: tenantId,
      location_id: locationId,
      ...data,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.stores.push(store);
    return store;
  }

  async listProducts(tenantId: string): Promise<RetailProduct[]> {
    return this.products.filter(p => p.tenant_id === tenantId);
  }

  async getProduct(tenantId: string, productId: string): Promise<RetailProduct | null> {
    return this.products.find(p => p.tenant_id === tenantId && p.id === productId) || null;
  }

  async listOrders(tenantId: string, storeId?: string): Promise<RetailOrder[]> {
    return this.orders.filter(o => o.tenant_id === tenantId && (!storeId || o.store_id === storeId));
  }

  async getOrder(tenantId: string, orderId: string): Promise<RetailOrder | null> {
    return this.orders.find(o => o.tenant_id === tenantId && o.id === orderId) || null;
  }

  async createOrder(tenantId: string, locationId: string, data: CreateOrderDto): Promise<RetailOrder> {
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const tax_total = subtotal * 0.11; // Mock 11% tax

    const order: RetailOrder = {
      id: uuidv4(),
      tenant_id: tenantId,
      location_id: locationId,
      store_id: data.store_id,
      terminal_id: data.terminal_id,
      cashier_id: 'user-1', // Mock cashier ID
      customer_id: data.customer_id,
      status: 'completed',
      items: data.items.map(i => ({
        product_id: i.product_id,
        sku: 'SKU-MOCK',
        name: 'Product Mock',
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_amount: i.unit_price * 0.11,
        discount_amount: 0,
        total_price: i.quantity * i.unit_price * 1.11,
      })),
      subtotal,
      tax_total,
      discount_total: 0,
      grand_total: subtotal + tax_total,
      payment_method: data.payment_method,
      payment_status: 'paid',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.orders.push(order);
    return order;
  }

  async getActiveShift(tenantId: string, storeId: string, employeeId: string): Promise<RetailShift | null> {
    return this.shifts.find(s => 
      s.tenant_id === tenantId && 
      s.store_id === storeId && 
      s.employee_id === employeeId && 
      s.status === 'open'
    ) || null;
  }

  async openShift(tenantId: string, locationId: string, employeeId: string, data: OpenShiftDto): Promise<RetailShift> {
    const shift: RetailShift = {
      id: uuidv4(),
      tenant_id: tenantId,
      location_id: locationId,
      store_id: data.store_id,
      employee_id: employeeId,
      terminal_id: data.terminal_id,
      start_time: new Date(),
      opening_cash: data.opening_cash,
      status: 'open',
    };
    this.shifts.push(shift);
    return shift;
  }

  async closeShift(tenantId: string, shiftId: string, data: CloseShiftDto): Promise<RetailShift> {
    const shift = this.shifts.find(s => s.tenant_id === tenantId && s.id === shiftId);
    if (!shift) throw new Error('Shift not found');

    shift.end_time = new Date();
    shift.closing_cash = data.closing_cash;
    shift.notes = data.notes;
    shift.status = 'closed';
    shift.expected_cash = shift.opening_cash; // Simple mock: expected = opening

    return shift;
  }
}
