import { RetailStore, RetailProduct, RetailOrder, RetailShift } from '../entities/retail.entity';
import { CreateStoreDto, CreateOrderDto, OpenShiftDto, CloseShiftDto } from '../dto/retail.dto';

export abstract class IRetailRepository {
  // Stores
  abstract listStores(tenantId: string): Promise<RetailStore[]>;
  abstract getStore(tenantId: string, storeId: string): Promise<RetailStore | null>;
  abstract createStore(tenantId: string, locationId: string, data: CreateStoreDto): Promise<RetailStore>;
  
  // Products
  abstract listProducts(tenantId: string): Promise<RetailProduct[]>;
  abstract getProduct(tenantId: string, productId: string): Promise<RetailProduct | null>;

  // Orders
  abstract listOrders(tenantId: string, storeId?: string): Promise<RetailOrder[]>;
  abstract getOrder(tenantId: string, orderId: string): Promise<RetailOrder | null>;
  abstract createOrder(tenantId: string, locationId: string, data: CreateOrderDto): Promise<RetailOrder>;

  // Shifts
  abstract getActiveShift(tenantId: string, storeId: string, employeeId: string): Promise<RetailShift | null>;
  abstract openShift(tenantId: string, locationId: string, employeeId: string, data: OpenShiftDto): Promise<RetailShift>;
  abstract closeShift(tenantId: string, shiftId: string, data: CloseShiftDto): Promise<RetailShift>;
}
