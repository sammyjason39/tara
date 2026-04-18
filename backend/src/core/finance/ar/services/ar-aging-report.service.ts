import { Injectable, Inject } from '@nestjs/common';
import { IArInvoiceRepository } from '../repositories/interfaces/ar-invoice.repository.interface';
import { ArInvoiceStatus } from '../domain/ar.constants';

@Injectable()
export class ArAgingReportService {
  constructor(
    @Inject('IArInvoiceRepository')
    private readonly invoiceRepo: IArInvoiceRepository,
  ) {}

  async getAgingReport(tenant_id: string, company_id: string) {
    const invoices = await this.invoiceRepo.findAll(tenant_id, company_id);
    const now = new Date();

    const report = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
      totalOutstanding: 0,
    };

    invoices.forEach(inv => {
      if (inv.status === ArInvoiceStatus.PAID || inv.status === ArInvoiceStatus.VOID || inv.status === ArInvoiceStatus.DRAFT) {
        return;
      }

      const dueDate = inv.dueDate || inv.created_at;
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(inv.outstandingAmount);

      report.totalOutstanding += amount;

      if (diffDays <= 30) report['0-30'] += amount;
      else if (diffDays <= 60) report['31-60'] += amount;
      else if (diffDays <= 90) report['61-90'] += amount;
      else report['90+'] += amount;
    });

    return report;
  }
}
