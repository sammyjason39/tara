import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { IWarehouseRepository } from './repositories/interfaces/warehouse.repository.interface';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IWarehouseRepository)
    private readonly warehouseRepo: IWarehouseRepository,
  ) {}

  async getBins(tenantId: string, locationId: string) {
    return (this.prisma as any).warehouseBin.findMany({
      where: {
        tenant_id: tenantId,
        location_id: locationId,
      },
      include: {
        assignments: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async createBin(tenantId: string, locationId: string, data: any) {
    return (this.prisma as any).warehouseBin.create({
      data: {
        ...data,
        tenant_id: tenantId,
        location_id: locationId,
      },
    });
  }

  async getBinStock(tenantId: string, binId: string) {
    return (this.prisma as any).stockBinAssignment.findMany({
      where: {
        tenant_id: tenantId,
        bin_id: binId,
      },
      include: {
        product: true,
      },
    });
  }

  async assignStock(tenantId: string, binId: string, data: { product_id: string; quantity: number }) {
    // Upsert assignment
    const existing = await (this.prisma as any).stockBinAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        bin_id: binId,
        product_id: data.product_id,
      },
    });

    if (existing) {
      return (this.prisma as any).stockBinAssignment.update({
        where: { id: existing.id },
        data: {
          quantity: Number(existing.quantity) + data.quantity,
        },
      });
    }

    return (this.prisma as any).stockBinAssignment.create({
      data: {
        tenant_id: tenantId,
        bin_id: binId,
        product_id: data.product_id,
        quantity: data.quantity,
      },
    });
  }
}
