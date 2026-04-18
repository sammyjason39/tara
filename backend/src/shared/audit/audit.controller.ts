import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { AuditService, AuditQueryDto } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  query(@Req() req: any, @Query() filters: AuditQueryDto) {
    return this.auditService.query(req.tenant_id, filters);
  }

  @Get('logs/:id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    // Note: accessing prisma directly from service for this specific bypass
    return (this.auditService as any).prisma.auditLog.findFirst({
      where: { id, tenant_id: req.tenant_id },
    });
  }

  @Get('verify-chain')
  async verifyChain(@Req() req: any, @Query('fromTimestamp') fromTimestamp?: string) {
    const tenant_id = req.tenant_id; // Shared tenant middleware
    return this.auditService.verifyChain(
      tenant_id, 
      fromTimestamp ? new Date(fromTimestamp) : undefined
    );
  }

  @Get('system/metrics')
  async getMetrics(@Req() req: any) {
    // In production, restrict to SUPERADMIN/Auditor
    return this.auditService.getMetrics();
  }

  @Get('anchors/public')
  async getPublicAnchors() {
    return this.auditService.getPublicAnchors();
  }
}
