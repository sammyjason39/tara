import { Controller, Get, Post, Param, Query, Body, Logger, UseGuards, NotFoundException } from '@nestjs/common';
import { AuditCertificationService } from '../services/audit-certification.service';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';
import { UserRole } from '../../../shared/roles';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('v1/finance/reports/certified')
@UseGuards(TenantGuard, RolesGuard)
export class CertifiedReportingController {
  private readonly logger = new Logger(CertifiedReportingController.name);

  constructor(
    private readonly auditCertificationService: AuditCertificationService,
  ) {}

  @Post('seal/:snapshotId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN)
  async sealPeriod(
    @TenantCtx() ctx: TenantContext,
    @Param('snapshotId') snapshotId: string,
    @Body('fiscalPeriodId') fiscalPeriodId: string,
    @Query('company_id') company_id: string,
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    const correlation_id = `seal-${Date.now()}`;

    return this.auditCertificationService.sealPeriod({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      fiscalPeriodId,
      user_id: ctx.user_id || 'anonymous',
      correlation_id
    });
  }

  @Get('certification/:id')
  async getCertification(@Param('id') id: string) {
    return this.auditCertificationService.getCertification(id);
  }

  @Get('verify/:id')
  async verifyCertification(@Param('id') id: string) {
    const certification = await this.auditCertificationService.getCertification(id);
    if (!certification) throw new NotFoundException('Certification not found');

    const verification = await this.auditCertificationService.verifyCertification(id);
    return { certification, verification };
  }
}

