import { IArCustomer } from '../../domain/ar.interfaces';

export interface IArCustomerRepository {
  findById(tenant_id: string, company_id: string, id: string): Promise<IArCustomer | null>;
  findAll(tenant_id: string, company_id: string): Promise<IArCustomer[]>;
  create(tenant_id: string, company_id: string, data: any): Promise<IArCustomer>;
  update(tenant_id: string, company_id: string, id: string, data: any): Promise<IArCustomer>;
}
