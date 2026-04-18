import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportingEngineService } from '../services/reporting-engine.service';
import { ConsolidationReportService } from '../services/consolidation-report.service';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';

@Controller('v1/finance/reporting')
@UseGuards(TenantGuard, RolesGuard)
export class ReportingController {
  constructor(
    private readonly reportingEngineService: ReportingEngineService,
    private readonly consolidationReportService: ConsolidationReportService,
  ) {}

  @Get('trends')
  async getTrendReport(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('periodIds') periodIds: string[],
    @Query('metric') metric: 'REVENUE' | 'NET_PROFIT' | 'EXPENSE' = 'REVENUE',
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    return this.reportingEngineService.getTrendReport(ctx.tenant_id, targetCompanyId, periodIds, metric);
  }

  @Get('consolidated')
  async getConsolidatedReport(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('fiscalPeriodId') fiscalPeriodId: string,
    @Query('type') type: 'PROFIT_LOSS' | 'BALANCE_SHEET',
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    return this.consolidationReportService.getConsolidatedReport(ctx.tenant_id, targetCompanyId, type, fiscalPeriodId);
  }
}
