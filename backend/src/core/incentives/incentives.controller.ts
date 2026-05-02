import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseInterceptors, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { IncentivesService } from './incentives.service';
import { CreateIncentivePlanDto } from './dto/create-plan.dto';
import { CreateIncentiveRuleDto } from './dto/create-rule.dto';
import { UpdateIncentivePlanDto } from './dto/update-plan.dto';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { ModuleStateGuard } from '../auth/guards/module-state.guard';
import { BranchGatingGuard } from '../auth/guards/branch-gating.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RequiredModule } from '../../shared/decorators/required-module.decorator';
import { TenantContext } from '../../gateway/tenant-context.interface';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('incentives')
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("sales")
export class IncentivesController {
  constructor(private readonly incentivesService: IncentivesService) {}

  private actor_id(request: RequestWithTenant) {
    return request.tenantContext.user_id || "system";
  }

  @Post('plans')
  createPlan(@Body() dto: CreateIncentivePlanDto) {
    return this.incentivesService.createPlan(dto);
  }

  @Get('plans')
  getPlans(@Req() request: RequestWithTenant) {
    const { tenant_id, company_id } = request.tenantContext;
    return this.incentivesService.getPlans(tenant_id, company_id);
  }

  @Get('plans/:id')
  getPlanById(@Param('id') id: string) {
    return this.incentivesService.getPlanById(id);
  }

  @Patch('plans/:id/status')
  updateStatus(
    @Req() request: RequestWithTenant,
    @Param('id') id: string, 
    @Body('is_active') is_active: boolean
  ) {
    return this.incentivesService.updatePlanStatus(id, is_active, this.actor_id(request));
  }

  @Patch('plans/:id')
  updatePlan(
    @Req() request: RequestWithTenant,
    @Param('id') id: string, 
    @Body() dto: UpdateIncentivePlanDto
  ) {
    return this.incentivesService.updatePlan(id, dto, this.actor_id(request));
  }

  @Get('plans/:id/audit-logs')
  getAuditLogs(@Param('id') id: string) {
    return this.incentivesService.getAuditLogs(id);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.incentivesService.deletePlan(id);
  }

  @Post('rules')
  createRule(@Body() dto: CreateIncentiveRuleDto) {
    return this.incentivesService.createRule(dto);
  }

  @Post('plans/:id/eligibility')
  setEligibility(@Param('id') id: string, @Body() eligibility: any[]) {
    return this.incentivesService.setEligibility(id, eligibility);
  }

  @Get('plans/:id/eligible-staff')
  getEligibleStaff(@Param('id') id: string) {
    return this.incentivesService.getEligibleStaff(id);
  }

  @Post('recalculate')
  recalculate(
    @Req() request: RequestWithTenant,
    @Body() data: { start_date: string; end_date: string }
  ) {
    const { tenant_id, company_id } = request.tenantContext;
    return this.incentivesService.recalculatePeriod(
      tenant_id,
      company_id,
      new Date(data.start_date),
      new Date(data.end_date)
    );
  }

  @Get('analytics')
  getAnalytics(@Req() request: RequestWithTenant) {
    const { tenant_id, company_id } = request.tenantContext;
    return this.incentivesService.getIncentiveAnalytics(tenant_id, company_id);
  }

  @Post('process-payouts')
  processPayouts(
    @Req() request: RequestWithTenant,
    @Body() data: { start_date: string; end_date: string }
  ) {
    const { tenant_id, company_id } = request.tenantContext;
    return this.incentivesService.processPayouts(
      tenant_id,
      company_id,
      new Date(data.start_date),
      new Date(data.end_date)
    );
  }
}
