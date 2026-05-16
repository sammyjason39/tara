import { Injectable, Inject } from '@nestjs/common';
import { Prisma, locations as Location } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IWarehouseRepository, WarehouseStats } from './interfaces/warehouse.repository.interface';
import { MultiTenancyUtil } from '../../../shared/utils/multi-tenancy.util';
import { TenantContext } from '../../../gateway/tenant-context.interface';

@Injectable()
export class WarehouseDbRepository implements IWarehouseRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    return (this.prisma as Prisma.TransactionClient);
  }

  async findAll(ctx: TenantContext): Promise<Location[]> {
    return this.db.locations.findMany({
      where: MultiTenancyUtil.getScope(ctx)
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<Location | null> {
    return this.db.locations.findFirst({
      where: MultiTenancyUtil.getScope(ctx, { id })
    });
  }

  async getInventoryStats(ctx: TenantContext, location_id: string): Promise<WarehouseStats> {
    const stockLevels = await this.db.stock_levels.findMany({
      where: MultiTenancyUtil.getScope(ctx, { location_id }),
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

  async updateComplianceStatus(ctx: TenantContext, id: string, status: string): Promise<Location> {
    const location = await this.db.locations.findFirst({ 
      where: MultiTenancyUtil.getScope(ctx, { id }) 
    });
    if (!location) throw new Error(`Location ${id} not found`);
    return location;
  }

  async registerSensorGateway(ctx: TenantContext, location_id: string, gatewayId: string): Promise<void> {
    console.log(`[IoT] Registering gateway ${gatewayId} for location ${location_id} (Context: ${JSON.stringify(ctx)})`);
  }
}
