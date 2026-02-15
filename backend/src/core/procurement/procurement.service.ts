import { Injectable } from '@nestjs/common';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ReleasePoDto } from './dto/release-po.dto';
import { IProcurementRepository } from './repositories/procurement.repository.interface';

@Injectable()
export class ProcurementService {
  constructor(private readonly repository: IProcurementRepository) {}

  async getSuppliers(tenantId: string) {
    return this.repository.getSuppliers(tenantId);
  }

  async createSupplier(tenantId: string, data: CreateSupplierDto) {
    return this.repository.createSupplier(tenantId, data);
  }

  async getRequisitions(tenantId: string) {
    return this.repository.getRequisitions(tenantId);
  }

  async createRequisition(tenantId: string, data: CreateRequisitionDto) {
    return this.repository.createRequisition(tenantId, data);
  }

  async approveRequesterHod(tenantId: string, requisitionId: string) {
    return this.repository.approveRequesterHod(tenantId, requisitionId);
  }

  async releasePurchaseOrder(tenantId: string, data: ReleasePoDto) {
    return this.repository.releasePurchaseOrder(tenantId, data);
  }

  async getPurchaseOrders(tenantId: string) {
    return this.repository.getPurchaseOrders(tenantId);
  }

  async getRiskSignals(tenantId: string) {
    return this.repository.getRiskSignals(tenantId);
  }

  async runRiskScan(tenantId: string) {
    return this.repository.runRiskScan(tenantId);
  }
}

