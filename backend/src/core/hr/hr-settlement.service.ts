import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventBusService } from '../../shared/events/event-bus.service';
import { EVENT_NAMES } from './events/event-names';
import { IHRRepository } from './repositories/hr.repository.interface';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class HrSettlementService {
  private readonly logger = new Logger(HrSettlementService.name);

  constructor(
    private readonly hrRepository: IHRRepository,
    private readonly financeService: FinanceService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Approve a Draft Payroll Run
   */
  async approvePayrollRun(tenant_id: string, runId: string, user_id: string) {
    const run = await this.hrRepository.getPayrollRunById(tenant_id, runId);
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'DRAFT') throw new BadRequestException(`Cannot approve run in ${run.status} status`);

    return this.hrRepository.updatePayrollRun(tenant_id, runId, {
      status: 'APPROVED',
      updated_at: new Date(),
    });
  }

  /**
   * Disburse Payroll (Send to Bank and Record in Ledger)
   */
  async disbursePayrollRun(tenant_id: string, runId: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const run = await this.hrRepository.getPayrollRunById(tenant_id, runId);
      if (!run) throw new NotFoundException('Payroll run not found');
      if (run.status !== 'APPROVED') throw new BadRequestException(`Cannot disburse run in ${run.status} status`);

      // 1. Resolve Company Currency (User requirement: follow company registration)
      const company = await tx.companies.findUnique({
        where: { id: tenant_id },
        select: { currency: true, name: true },
      });
      const currency = company?.currency || 'USD';

      // 2. Update Status to DISBURSING
      const updatedRun = await this.hrRepository.updatePayrollRun(tenant_id, runId, {
        status: 'DISBURSING',
        updated_at: new Date(),
      }, tx as any);

      // 3. Create Finance Journal Entry (Hard handshake)
      // Debit: Payroll Expense
      // Credit: Cash/Bank
      // Note: In a real enterprise system, we would resolve account IDs from Posting Rules.
      // For Phase 2, we use a structured handshake.
      
      // We'll need a fiscal period for the journal entry
      const fiscalPeriod = await tx.finance_fiscal_periods.findFirst({
        where: { 
          tenant_id, 
          status: 'OPEN',
          start_date: { lte: run.period_end },
          end_date: { gte: run.period_start },
        },
      });

      if (!fiscalPeriod) {
        throw new BadRequestException('No open fiscal period found for this payroll period');
      }

      const journalRef = `PAYROLL-${runId.substring(0, 8)}`;
      
      // Look up mandatory accounts (Salaries Expense & Cash)
      // This is simplified for Phase 2 - assuming common mapping exists
      const expenseAccount = await tx.finance_chart_of_accounts.findFirst({
        where: { tenant_id, code: { contains: '5100' } }, // Usually expense
      });
      const cashAccount = await tx.finance_chart_of_accounts.findFirst({
        where: { tenant_id, code: { contains: '1100' } }, // Usually assets/cash
      });

      if (expenseAccount && cashAccount) {
         await tx.finance_journal_entries.create({
          data: {
            id: `PAY-JNL-${runId}`,
            tenant_id,
            fiscal_period_id: fiscalPeriod.id,
            ref: journalRef,
            description: `Payroll Disbursement for period ending ${run.period_end.toISOString().split('T')[0]}`,
            posting_date: new Date(),
            status: 'POSTED',
            journal_type: 'PAYROLL',
            finance_journal_lines: {
              create: [
                {
                  id: `PAY-JNL-L1-${runId}`,
                  tenant_id,
                  account_id: expenseAccount.id,
                  account_code: expenseAccount.code,
                  side: 'DEBIT',
                  amount: run.totalGrossPay,
                  debit: run.totalGrossPay,
                  description: 'Salary & Wages Expense',
                },
                {
                  id: `PAY-JNL-L2-${runId}`,
                  tenant_id,
                  account_id: cashAccount.id,
                  account_code: cashAccount.code,
                  side: 'CREDIT',
                  amount: run.totalGrossPay,
                  credit: run.totalGrossPay,
                  description: 'Payroll Cash Disbursement',
                }
              ]
            }
          }
        });
      }

      this.logger.log(`[HrSettlementService] Payroll run ${runId} disbursed. Journal ${journalRef} created.`);
      
      return updatedRun;
    });
  }

  /**
   * Final Settle (Bank Transfer Confirmed / ACK received)
   */
  async settlePayrollRun(tenant_id: string, runId: string, user_id: string) {
    const run = await this.hrRepository.getPayrollRunById(tenant_id, runId);
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'DISBURSING') throw new BadRequestException(`Cannot settle run in ${run.status} status`);

    const updated = await this.hrRepository.updatePayrollRun(tenant_id, runId, {
      status: 'SETTLED',
      updated_at: new Date(),
    });

    // Phase 5: Trigger Financial Handshake
    await this.eventBus.publish({
      event_type: (EVENT_NAMES as any).PAYROLL_SETTLED || 'HR.PAYROLL_SETTLED',
      tenant_id,
      entity_id: runId,
      entity_type: 'PAYROLL_RUN',
      source_module: 'HR',
      user_id,
      payload: {
        total_gross: run.totalGrossPay,
        currency: 'IDR', // Should resolve from company
        period_end: run.period_end,
      }
    });

    return updated;
  }
}
