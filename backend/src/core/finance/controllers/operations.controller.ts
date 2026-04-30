import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { BudgetingService } from '../services/budgeting.service';
import { WorkflowIntegrationService } from '../services/workflow-integration.service';
import { ExpensePolicyService } from '../services/expense-policy.service';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';
import { UserRole } from '../../../shared/roles';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('finance/operations')
@UseGuards(TenantGuard, RolesGuard)
export class OperationsController {
  constructor(
    private readonly budgetingService: BudgetingService,
    private readonly workflowIntegrationService: WorkflowIntegrationService,
    private readonly expensePolicyService: ExpensePolicyService,
  ) {}

  @Get('budget/variance')
  async getBudgetVariance(
    @TenantCtx() ctx: TenantContext,
    @Query('budgetLineId') budgetLineId?: string,
    @Query('company_id') company_id?: string,
    @Query('fiscalPeriodId') fiscalPeriodId?: string,
  ) {
    if (!budgetLineId) {
      // Return a consolidated variance summary for the company/period
      // For now, return a default mock that won't crash the frontend
      return {
        varianceAmount: 0,
        variancePercentage: 0,
        message: 'Consolidated variance view pending implementation'
      };
    }
    const result = await this.budgetingService.calculateVariance(ctx.tenant_id, budgetLineId);
    return {
      ...result,
      varianceAmount: Number(result.variance), // Map for frontend compatibility
    };
  }

  @Post('workflow/submit')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async submitForApproval(
    @TenantCtx() ctx: TenantContext,
    @Body('entity_type') entity_type: string,
    @Body('entity_id') entity_id: string,
    @Body('data') data: any,
  ) {
    return this.workflowIntegrationService.submitForApproval(ctx.tenant_id, entity_type as any, entity_id, ctx.user_id || 'anonymous', data);
  }

  @Post('expense/evaluate')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async evaluateExpense(
    @TenantCtx() ctx: TenantContext,
    @Body('amount') amount: number,
    @Body('category') category: string,
  ) {
    return this.expensePolicyService.evaluateExpense(ctx.tenant_id, category, amount);
  }
}
