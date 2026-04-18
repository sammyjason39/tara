import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { Request } from 'express';

@Controller('sync')
@UseGuards(TenantGuard)
export class SyncController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('snapshot')
  async getSnapshot(@Req() req: Request) {
    const tenant_id = req.headers['x-tenant-id'] as string;
    
    // Fetch all master data needed for frontend PGLite bootstrap
    const [itemMaster, staff, locations, stockLevels, prices, company] = await Promise.all([
      this.prisma.item_masters.findMany({ where: { tenant_id: tenant_id, status: 'active' } }),
      this.prisma.employees.findMany({ where: { tenant_id: tenant_id, status: 'active' } }),
      this.prisma.locations.findMany({ where: { tenant_id: tenant_id } }),
      this.prisma.stock_levels.findMany({ where: { tenant_id: tenant_id } }),
      this.prisma.price_versions.findMany({ where: { tenant_id: tenant_id, is_current: true } }),
      this.prisma.companies.findUnique({ where: { id: tenant_id } }),
    ]);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        itemMaster,
        staff,
        locations,
        stockLevels,
        prices,
      },
    };
  }

  @Get('delta')
  async getDelta(@Req() req: Request) {
    const tenant_id = req.headers['x-tenant-id'] as string;
    const since = req.query.since as string;
    const anchorDate = since ? new Date(since) : new Date(0);

    const [itemMaster, staff, stockLevels] = await Promise.all([
      this.prisma.item_masters.findMany({ 
        where: { tenant_id: tenant_id, updated_at: { gt: anchorDate } } 
      }),
      this.prisma.employees.findMany({ 
        where: { tenant_id: tenant_id, updated_at: { gt: anchorDate } } 
      }),
      this.prisma.stock_levels.findMany({ 
        where: { tenant_id: tenant_id, updated_at: { gt: anchorDate } } 
      }),
    ]);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        itemMaster,
        staff,
        stockLevels,
      },
    };
  }
}
