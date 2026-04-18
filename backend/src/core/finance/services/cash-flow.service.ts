import { Injectable, Logger } from '@nestjs/common';
import { IAccountStatementProjectionRepository } from '../repositories/interfaces/account-statement-projection.repository.interface';
import { AccountStatementProjection } from '../domain/finance.interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(
    private readonly statementRepo: IAccountStatementProjectionRepository,
  ) {}

  async generate(tenant_id: string, company_id: string, periodId: string): Promise<any> {
    const cashAccounts = ['1001', '1002'];
    let totalInflow = new Prisma.Decimal(0);
    let totalOutflow = new Prisma.Decimal(0);
    const activities = {
      OPERATING: new Prisma.Decimal(0),
      INVESTING: new Prisma.Decimal(0),
      FINANCING: new Prisma.Decimal(0),
      UNCLASSIFIED: new Prisma.Decimal(0),
    };

    for (const accId of cashAccounts) {
      const entries = await this.statementRepo.findByAccount(tenant_id, company_id, accId);
      for (const entry of entries) {
        const amount = entry.signedAmount || new Prisma.Decimal(0);
        if (amount.gt(0)) totalInflow = totalInflow.plus(amount);
        else totalOutflow = totalOutflow.plus(amount.abs());

        if (entry.description.includes('SALARY')) activities.OPERATING = activities.OPERATING.plus(amount);
        else if (entry.description.includes('ASSET')) activities.INVESTING = activities.INVESTING.plus(amount);
        else if (entry.description.includes('LOAN')) activities.FINANCING = activities.FINANCING.plus(amount);
        else activities.UNCLASSIFIED = activities.UNCLASSIFIED.plus(amount);
      }
    }

    return { totalInflow, totalOutflow, activities };
  }
}
