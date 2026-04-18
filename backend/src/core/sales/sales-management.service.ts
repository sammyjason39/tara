import { Injectable } from "@nestjs/common";
import { ISalesRepository } from "./repositories/sales.repository.interface";
import { SalesAnalytics } from "./entities/sales.entity";

@Injectable()
export class SalesManagementService {
  constructor(
    private readonly salesRepository: ISalesRepository,
  ) {}

  async getSalesAnalytics(tenant_id: string, period?: string): Promise<SalesAnalytics> {
    return this.salesRepository.getSalesAnalytics(tenant_id, period);
  }

  async getForecast(tenant_id: string, user_id?: string): Promise<any> {
    return this.salesRepository.getForecast(tenant_id, user_id);
  }

  async getPipelineVelocity(tenant_id: string): Promise<any> {
    return this.salesRepository.getPipelineVelocity(tenant_id);
  }

  async getSLAPerformance(tenant_id: string): Promise<any> {
    return this.salesRepository.getSLAPerformance(tenant_id);
  }
}
