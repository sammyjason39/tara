import { Injectable } from '@nestjs/common';
import { GeneralLedgerProjection } from '../domain/finance.interfaces';

@Injectable()
export class GeneralLedgerProjectionMockRepository {
  private projections: GeneralLedgerProjection[] = [];

  async save(projection: GeneralLedgerProjection): Promise<void> {
    this.projections.push(projection);
  }

  async findByAccount(tenant_id: string, company_id: string, accountId: string): Promise<GeneralLedgerProjection[]> {
    return this.projections.filter(p => p.tenant_id === tenant_id && p.accountId === accountId);
  }
}
