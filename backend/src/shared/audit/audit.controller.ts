import { Controller, Get, Post, Param, Query, Req, Res, UseGuards, Body, UseInterceptors } from '@nestjs/common';
import { AuditService, AuditQueryDto } from './audit.service';
import { ReportingService } from '../reporting/reporting.service';
import { Response } from 'express';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../roles';


@Controller('audit')
@UseInterceptors(TenantInterceptor)
@UseGuards(RolesGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly reportingService: ReportingService,
  ) {}


  @Get('logs')
  query(@Req() req: any, @Query() filters: AuditQueryDto) {
    return this.auditService.query(req.tenantContext.tenant_id, filters);
  }

  @Get('logs/:id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    // Note: accessing prisma directly from service for this specific bypass
    return (this.auditService as any).prisma.auditLog.findFirst({
      where: { id, tenant_id: req.tenantContext.tenant_id },
    });
  }

  @Get('verify-chain')
  async verifyChain(@Req() req: any, @Query('fromTimestamp') fromTimestamp?: string) {
    const tenant_id = req.tenantContext.tenant_id; // Shared tenant middleware
    return this.auditService.verifyChain(
      tenant_id, 
      fromTimestamp ? new Date(fromTimestamp) : undefined
    );
  }

  @Post('repair')
  @Roles(UserRole.SUPERADMIN)
  async repair(
    @Req() req: any,
    @Body() body: { reason: string; permission_by?: string }
  ) {
    const { tenant_id, user_id } = req.tenantContext;
    const result = await this.auditService.repairChain({
      tenant_id,
      actor_id: user_id || 'system',
      reason: body.reason,
      permission_by: body.permission_by,
      permission_at: body.permission_by ? new Date() : undefined,
      source_ip: req.ip,
      request_id: req.headers['x-request-id'] as string,
    });
    return result;
  }

  @Get('system/metrics')
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER)
  async getMetrics(@Req() req: any) {
    return this.auditService.getMetrics();
  }

  @Get('anchors/public')
  async getPublicAnchors() {
    return this.auditService.getPublicAnchors();
  }

  @Get('export')
  async export(
    @Req() req: any,
    @Query() filters: AuditQueryDto,
    @Query('format') format: 'pdf' | 'csv' = 'csv',
    @Res() res: Response,
  ) {
    const { data } = await this.auditService.query(req.tenantContext.tenant_id, { ...filters, limit: 1000 });
    const headers = ['Action', 'Module', 'Entity Type', 'User ID', 'Created At', 'Severity'];
    const title = `Audit Trail Report - ${req.tenantContext.tenant_id}`;

    if (format === 'pdf') {
      const buffer = await this.reportingService.generatePdf(title, headers, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=audit-report-${Date.now()}.pdf`);
      res.send(buffer);
    } else {
      const buffer = await this.reportingService.generateExcel(title, headers, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=audit-report-${Date.now()}.xlsx`);
      res.send(buffer);
    }
  }
}

