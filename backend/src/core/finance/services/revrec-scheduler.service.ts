import { Injectable, Logger } from '@nestjs/common';
import { RevRecSchedule, RevRecStatus, RecognitionPeriod } from '../domain/revrec.interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class RevRecScheduler {
  private readonly logger = new Logger(RevRecScheduler.name);

  /**
   * Generates a linear revenue recognition schedule over a set period.
   * Hardened with Prisma.Decimal and "Penny Slop" correction.
   */
  async createSchedule(params: {
    tenant_id: string;
    company_id: string;
    contractId: string;
    total_amount: Prisma.Decimal;
    currency: string;
    start_date: Date;
    end_date: Date;
    deferredAccountId: string;
    revenueAccountId: string;
  }): Promise<RevRecSchedule> {
    const { start_date, end_date, total_amount } = params;
    
    // Calculate months difference
    const months = (end_date.getFullYear() - start_date.getFullYear()) * 12 + (end_date.getMonth() - start_date.getMonth()) + 1;
    
    // Precision linear division
    const monthlyAmount = total_amount.div(months).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

    const periods: RecognitionPeriod[] = [];
    let runningTotal = new Prisma.Decimal(0);

    for (let i = 0; i < months; i++) {
        const periodDate = new Date(start_date);
        periodDate.setMonth(start_date.getMonth() + i);

        let amount = monthlyAmount;

        // Adjust for "Penny Slop" in the final period to ensure sum exactly matches total_amount
        if (i === months - 1) {
            amount = total_amount.minus(runningTotal);
        } else {
            runningTotal = runningTotal.plus(amount);
        }

        periods.push({
            date: periodDate,
            amount: amount,
            status: 'PENDING',
        });
    }

    const schedule: RevRecSchedule = {
      id: `SCH-${params.contractId}`,
      ...params,
      status: RevRecStatus.ACTIVE,
      periods,
    };

    this.logger.log(`Created precision RevRec Schedule for Contract ${params.contractId} [Sum: ${total_amount}] [Periods: ${months}]`);
    return schedule;
  }
}
