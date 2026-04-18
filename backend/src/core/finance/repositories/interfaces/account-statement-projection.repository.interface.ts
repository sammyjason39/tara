import { AccountStatementProjection } from '../../domain/finance.interfaces';

export interface IAccountStatementProjectionRepository {
  append(data: Partial<AccountStatementProjection>): Promise<void>;
  reset(tenant_id: string, company_id: string): Promise<void>;
  findStatement(tenant_id: string, company_id: string, accountId: string, fromSeq: number, toSeq: number): Promise<AccountStatementProjection[]>;
  findByAccount(tenant_id: string, company_id: string, accountId: string): Promise<AccountStatementProjection[]>;
}
