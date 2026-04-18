import { Injectable, Inject } from '@nestjs/common';
import { Prisma, locations as Location } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IWarehouseRepository, WarehouseStats } from './interfaces/warehouse.repository.interface';

@Injectable()
export class WarehouseDbRepository implements IWarehouseRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    return (this.prisma as Prisma.TransactionClient);
  }

  async findAll(tenant_id: string): Promise<Location[]> {
    return this.db.locations.findMany({
      where: { tenant_id: tenant_id }
    });
  }

  async findById(tenant_id: string, id: string): Promise<Location | null> {
    return this.db.locations.findFirst({
      where: { id, tenant_id: tenant_id }
    });
  }

  async getInventoryStats(tenant_id: string, location_id: string): Promise<WarehouseStats> {
    const stockLevels = await this.db.stock_levels.findMany({
      where: { tenant_id: tenant_id, location_id: location_id },
      include: { item_masters: true }
    });

    const totalItems = new Set(stockLevels.map(sl => sl.product_id)).size;
    const totalQuantity = stockLevels.reduce((sum, sl) => sum + Number(sl.on_hand), 0);
    const valuation = stockLevels.reduce((sum, sl) => {
      const price = Number(sl.item_masters?.base_price || 0);
      return sum + (Number(sl.on_hand) * price);
    }, 0);

    return {
      totalItems,
      totalQuantity,
      valuation,
    };
  }

  async updateComplianceStatus(tenant_id: string, id: string, status: string): Promise<Location> {
    // Note: status field does not exist on location model in current schema.
    // Placeholder for future compliance logic.
    console.warn(`[Inventory] updateComplianceStatus called for location ${id} but 'status' field is missing in schema.`);
    const location = await this.db.locations.findFirst({ where: { id, tenant_id: tenant_id } });
    if (!location) throw new Error(`Location ${id} not found`);
    return location;
  }

  async registerSensorGateway(tenant_id: string, location_id: string, gatewayId: string): Promise<void> {
    // Placeholder for IoT Gateway registration logic
    console.log(`[IoT] Registering gateway ${gatewayId} for location ${location_id} (Tenant: ${tenant_id})`);
  }
}
