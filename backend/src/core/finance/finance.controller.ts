import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { getFinanceExecutionMode } from './utils/finance-safety.utils';
import { ChartOfAccountService } from './services/chart-of-account.service';
import { FiscalPeriodService } from './services/fiscal-period.service';
import { PostingRuleService } from './services/posting-rule.service';
import { LedgerPostingService } from './services/ledger-posting.service';
import { JournalReversalService } from './services/journal-reversal.service';
import { CreateCOADto, UpdateCOADto } from './dto/coa.dto';
import { UpdateFiscalPeriodDto } from './dto/fiscal.dto';
import { CreatePostingRuleDto } from './dto/posting-rule.dto';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../../shared/roles';
import { TenantCtx } from '../../gateway/tenant-context.decorator';
import { TenantContext } from '../../gateway/tenant-context.interface';

@Controller('v1/finance')
@UseGuards(TenantGuard, RolesGuard)
export class FinanceController {
  constructor(
    private readonly coaService: ChartOfAccountService,
    private readonly fiscalService: FiscalPeriodService,
    private readonly ruleService: PostingRuleService,
    private readonly ledgerService: LedgerPostingService,
    private readonly reversalService: JournalReversalService,
    @Inject('IAccountBalanceRepository') private readonly balanceRepo: any,
    @Inject('IUnitOfWork') private readonly uow: any,
  ) {}

  @Get('health')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN)
  async getHealth() {
    return {
      status: 'UP',
      module: 'FINANCE CORE',
      executionMode: getFinanceExecutionMode().toUpperCase(),
      repositoryType: this.balanceRepo.constructor.name,
      unitOfWorkType: this.uow.constructor.name,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  // --- Chart of Accounts ---
  @Get('coa')
  async getCoa(@TenantCtx() ctx: TenantContext) {
    return this.coaService.getHierarchy(ctx.tenant_id, ctx.company_id);
  }

  @Post('coa')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async createCoa(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCOADto) {
    return this.coaService.createAccount(ctx.tenant_id, ctx.company_id, dto, ctx.user_id || 'SYSTEM');
  }

  @Patch('coa/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async updateCoa(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateCOADto) {
    return this.coaService.updateAccount(ctx.tenant_id, ctx.company_id, id, dto, ctx.user_id || 'SYSTEM');
  }

  @Delete('coa/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async deleteCoa(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.coaService.deleteAccount(ctx.tenant_id, ctx.company_id, id, ctx.user_id || 'SYSTEM');
  }

  // --- Fiscal Periods ---
  @Get('fiscal-years')
  async getFiscalYears(@TenantCtx() ctx: TenantContext) {
    return this.fiscalService.listYears(ctx.tenant_id, ctx.company_id);
  }

  @Post('fiscal-periods/:id/lock')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN)
  async transitionPeriod(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateFiscalPeriodDto) {
    return this.fiscalService.transitionStatus(ctx.tenant_id, ctx.company_id, id, dto.status, ctx.user_id || 'SYSTEM');
  }

  // --- Posting Rules ---
  @Get('posting-rules')
  async getRules(@TenantCtx() ctx: TenantContext) {
    return this.ruleService.listRules(ctx.tenant_id, ctx.company_id);
  }

  @Post('posting-rules')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async createRule(@TenantCtx() ctx: TenantContext, @Body() dto: CreatePostingRuleDto) {
    return this.ruleService.createRule(ctx.tenant_id, ctx.company_id, dto, ctx.user_id || 'SYSTEM');
  }

  @Post('posting-rules/:id/activate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async activateRule(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ruleService.activateRule(ctx.tenant_id, ctx.company_id, id, ctx.user_id || 'SYSTEM');
  }

  // --- Ledger Engine ---
  @Post('ledger/process-event')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN)
  async processEvent(@TenantCtx() ctx: TenantContext, @Body() envelope: any) {
    // Envelope context is now secondary to the secure TenantCtx
    const targetCompanyId = envelope.company_id || ctx.company_id;
    return this.ledgerService.processEvent(ctx.tenant_id, targetCompanyId, envelope.id || envelope.postingId);
  }

  // --- Auditable Flux & Reversals ---
  @Post('journals/:id/reverse')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN)
  async reverseJournal(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.reversalService.reverseJournal(
      ctx.tenant_id,
      ctx.company_id,
      id,
      body.reason || 'Manual reversal',
      ctx.user_id || 'SYSTEM'
    );
  }
}
