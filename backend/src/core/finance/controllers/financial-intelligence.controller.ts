import { Controller, Get, Query, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { CashflowService } from '../services/cashflow.service';
import { InsightService } from '../services/insight.service';
import { ForecastService } from '../services/forecast.service';
import { RecommendationService } from '../services/recommendation.service';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';

@Controller('v1/finance/intelligence')
@UseGuards(TenantGuard, RolesGuard)
export class FinancialIntelligenceController {
  constructor(
    private readonly cashflowService: CashflowService,
    private readonly insightService: InsightService,
    private readonly forecastService: ForecastService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get('recommendations')
  async getRecommendations(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('snapshotId') snapshotId?: string,
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    const correlation_id = `rec-${Date.now()}`;

    return this.recommendationService.getRecommendations({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      correlation_id,
      user_id: ctx.user_id || 'anonymous',
    });
  }

  @Get('cashflow')
  async getCashflow(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('snapshotId') snapshotId?: string,
    @Query('days') days?: string,
    @Query('minimumSafeCash') minimumSafeCash?: string,
    @Query('avgDelayDays') avgDelayDays?: string,
    @Query('timezone') timezone?: string,
    @Query('revenueMultiplier') revMult?: string,
    @Query('expenseMultiplier') expMult?: string,
    @Query('scenarioDelayDays') sceneDelay?: string,
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    const correlation_id = `cfo-${Date.now()}`;

    const scenario = (revMult || expMult || sceneDelay) ? {
      revenueMultiplier: revMult ? parseFloat(revMult) : undefined,
      expenseMultiplier: expMult ? parseFloat(expMult) : undefined,
      delayDays: sceneDelay ? parseInt(sceneDelay, 10) : undefined,
    } : undefined;

    return this.cashflowService.getCashflow({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      days: days ? parseInt(days, 10) : 30,
      minimumSafeCash: minimumSafeCash ? parseFloat(minimumSafeCash) : 0,
      avgDelayDays: avgDelayDays ? parseInt(avgDelayDays, 10) : 7,
      timezone: timezone || 'UTC',
      scenario,
      correlation_id,
      user_id: ctx.user_id || 'anonymous',
    });
  }

  @Get('insights')
  async getInsights(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('snapshotId') snapshotId?: string,
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    const correlation_id = `insight-${Date.now()}`;

    return this.insightService.getInsights({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      correlation_id,
      user_id: ctx.user_id || 'anonymous',
    });
  }

  @Get('forecast')
  async getForecast(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('snapshotId') snapshotId?: string,
    @Query('horizonDays') horizonDays?: string,
    @Query('revenueMultiplier') revMult?: string,
    @Query('expenseMultiplier') expMult?: string,
  ) {
    const targetCompanyId = company_id || ctx.company_id;

    return this.forecastService.getForecast({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      horizonDays: horizonDays ? parseInt(horizonDays, 10) : 90,
      scenario: (revMult || expMult) ? {
        revenueMultiplier: revMult ? parseFloat(revMult) : undefined,
        expenseMultiplier: expMult ? parseFloat(expMult) : undefined,
      } : undefined
    });
  }

  @Get('predictive-insights')
  async getPredictiveInsights(
    @TenantCtx() ctx: TenantContext,
    @Query('company_id') company_id: string,
    @Query('snapshotId') snapshotId?: string,
    @Query('horizonDays') horizonDays?: string,
  ) {
    const targetCompanyId = company_id || ctx.company_id;
    const correlation_id = `predict-${Date.now()}`;

    const forecast = await this.forecastService.getForecast({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      horizonDays: horizonDays ? parseInt(horizonDays, 10) : 90,
    });

    return this.insightService.getInsights({
      tenant_id: ctx.tenant_id,
      company_id: targetCompanyId,
      snapshotId,
      correlation_id,
      user_id: ctx.user_id || 'anonymous',
      forecast,
    });
  }

  @Get('insights/snapshot/:id')
  async getSnapshot(@Param('id') id: string) {
    const snapshot = await this.insightService.getSnapshotById(id);
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    const verification = await this.insightService.verifyInsightSnapshot(id);
    return { snapshot, verification };
  }
}

