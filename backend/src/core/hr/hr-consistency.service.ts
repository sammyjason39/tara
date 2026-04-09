import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

/**
 * HRConsistencyService
 * Phase 3 — Cross-Module Consistency Check
 * 
 * Ensures HR and Finance remain in sync.
 * Validates HR payroll against Finance ledger.
 */
@Injectable()
export class HRConsistencyService {
  private readonly logger = new Logger(HRConsistencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compares HR payroll run total with Finance ledger entries for a period.
   */
  async validatePayrollConsistency(tenantId: string, period: string) {
    try {
      // 1. Fetch HR Payroll Total for the period
      const hrPayroll = await this.prisma.payrollRun.findFirst({
        where: { tenantId, name: period, status: 'PROCESSED' },
      });

      if (!hrPayroll) return;

      // 2. Fetch Finance Ledger Totals for 'PAYROLL' category
      // Mocking ledger access via context snapshot or generic query
      const ledgerEntry = await this.prisma.hrContextSnapshot.findFirst({
        where: { 
          tenantId, 
          metricType: 'FINANCE_PAYROLL_REF',
          aggregatedValues: { path: ['period'], equals: period }
        },
      });

      if (!ledgerEntry) {
        this.logger.warn(`[AI_CONSISTENCY] No Finance ledger reference found for period ${period}.`);
        return;
      }

      const ledgerTotal = (ledgerEntry.aggregatedValues as any).totalAmount;
      const hrTotal = Number(hrPayroll.totalNetPay);
      const discrepancy = Math.abs(hrTotal - ledgerTotal);

      // 3. Alert if threshold exceeded (e.g. > 1.00 currency unit)
      if (discrepancy > 1.0) {
        this.logger.error(`[AI_CONSISTENCY] CRITICAL: Payroll discrepancy detected for tenant ${tenantId}. HR: ${hrTotal}, Ledger: ${ledgerTotal}.`);
        
        await this.prisma.hrSystemAlert.create({
          data: {
            tenantId,
            type: 'CONSISTENCY',
            severity: 'CRITICAL',
            message: `Cross-module payroll discrepancy detected. HR total (${hrTotal}) does not match Ledger entries (${ledgerTotal}).`,
            metadata: { hrTotal, ledgerTotal, discrepancy, period },
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to validate payroll consistency:', error.stack);
    }
  }
}
