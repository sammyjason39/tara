import { IArCreditMemo } from '../../domain/ar.interfaces';

export interface IArCreditMemoRepository {
  create(tenant_id: string, company_id: string, data: any): Promise<IArCreditMemo>;
  findAll(tenant_id: string, company_id: string, customer_id?: string): Promise<IArCreditMemo[]>;
}
