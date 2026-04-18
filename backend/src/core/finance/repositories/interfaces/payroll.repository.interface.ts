import { PayrollRecord } from '../../domain/finance.interfaces';

export interface IPayrollRepository {
  findById(tenant_id: string, company_id: string, id: string): Promise<PayrollRecord | null>;
  findAll(tenant_id: string, company_id: string, period?: string): Promise<PayrollRecord[]>;
}
