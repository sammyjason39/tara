import { GeneralLedgerProjection } from '../../domain/finance.interfaces';
import { Prisma } from '@prisma/client';

export interface IGeneralLedgerProjectionRepository {
  append(data: Partial<GeneralLedgerProjection>): Promise<void>;
  reset(tenant_id: string, company_id: string): Promise<void>;
  findHistory(tenant_id: string, company_id: string, accountId: string, fromSeq: number, toSeq: number): Promise<GeneralLedgerProjection[]>;
  getLatestRunningBalance(tenant_id: string, company_id: string, accountId: string): Promise<Prisma.Decimal>;
}
