import { Controller, Post, Body, UseGuards, Get, Query, Delete, Param, BadRequestException } from '@nestjs/common';
import { MatchingService } from '../services/matching.service';
import { BankReconciliationService } from '../services/bank-reconciliation.service';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../shared/roles';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';

@Controller('v1/finance/reconciliation')
@UseGuards(TenantGuard, RolesGuard)
export class ReconciliationController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly reconService: BankReconciliationService
  ) {}

  /**
   * Upload bank statement (JSON/CSV format)
   */
  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async uploadStatement(
    @TenantCtx() ctx: TenantContext,
    @Body() body: any
  ) {
    if (!body.bank_account_id || !body.transactions) {
      throw new BadRequestException('Invalid statement data');
    }
    return this.reconService.ingestStatement(ctx.tenant_id, body);
  }

  /**
   * Automatically match bank transactions
   */
  @Post('auto-match')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async autoMatch(
    @TenantCtx() ctx: TenantContext,
    @Body() body: { statementId?: string }
  ) {
    return this.matchingService.autoMatch(ctx.tenant_id, body.statementId);
  }

  /**
   * Manually link a bank transaction to one or more journal entries
   */
  @Post('manual-match')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async linkManual(
    @TenantCtx() ctx: TenantContext,
    @Body() body: { bankTxId: string; journalIds: string[] }
  ) {
    return this.matchingService.linkManual(ctx.tenant_id, body.bankTxId, body.journalIds);
  }

  /**
   * Unlink a match
   */
  @Delete('match/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async unlink(
    @TenantCtx() ctx: TenantContext,
    @Param('id') matchId: string
  ) {
    return this.matchingService.unlink(ctx.tenant_id, matchId);
  }

  /**
   * Finalize a statement
   */
  @Post('finalize')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async finalize(
    @TenantCtx() ctx: TenantContext,
    @Body() body: { statementId: string }
  ) {
    return this.reconService.finalizeReconciliation(ctx.tenant_id, body.statementId);
  }

  /**
   * Get ledger entries for manual matching
   */
  @Get('unmatched-ledger')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getUnmatchedLedger(
    @TenantCtx() ctx: TenantContext,
    @Query('glAccountId') glAccountId: string
  ) {
    return this.reconService.getUnmatchedLedgerLines(ctx.tenant_id, glAccountId);
  }
}
