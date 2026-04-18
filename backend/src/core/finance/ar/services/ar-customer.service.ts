import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IArCustomerRepository } from '../repositories/interfaces/ar-customer.repository.interface';
import { CreateCustomerDto } from '../dto/ar.dto';
import { IArCustomer } from '../domain/ar.interfaces';

@Injectable()
export class ArCustomerService {
  constructor(
    @Inject('IArCustomerRepository')
    private readonly customerRepo: IArCustomerRepository,
  ) {}

  async createCustomer(tenant_id: string, company_id: string, dto: CreateCustomerDto): Promise<IArCustomer> {
    return this.customerRepo.create(tenant_id, company_id, dto);
  }

  async getCustomer(tenant_id: string, company_id: string, id: string): Promise<IArCustomer> {
    const customer = await this.customerRepo.findById(tenant_id, company_id, id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async listCustomers(tenant_id: string, company_id: string): Promise<IArCustomer[]> {
    return this.customerRepo.findAll(tenant_id, company_id);
  }
}
