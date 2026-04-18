import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

@Injectable()
export class TaxExportService {
  private readonly logger = new Logger(TaxExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a tax report for a specific period and branch.
   */
  async generateTaxReport(tenant_id: string, branch_id: string, fiscalPeriodId: string) {
    const transactions = await this.prisma.finance_transaction_taxes.findMany({
      where: { 
          tenant_id,
          // In a real system, we would join with Invoice/Bill to check branch_id
      },
      orderBy: { created_at: 'desc' }
    });

    const reportData = transactions.map((t: any) => ({
      transaction_id: t.transaction_id,
      type: t.transactionType,
      baseAmount: t.baseAmount,
      tax_amount: t.tax_amount,
      date: t.created_at
    }));

    return {
      tenant_id,
      branch_id,
      fiscalPeriodId,
      generatedAt: new Date(),
      data: reportData,
      totalTax: reportData.reduce((sum: number, r: any) => sum + Number(r.tax_amount), 0)
    };
  }

  /**
   * Mock Export to CSV (Simulated)
   */
  async exportToCSV(tenant_id: string, branch_id: string, fiscalPeriodId: string) {
    const report = await this.generateTaxReport(tenant_id, branch_id, fiscalPeriodId);
    let csv = 'TransactionID,Type,BaseAmount,TaxAmount,Date\n';
    report.data.forEach((r: any) => {
      csv += `${r.transaction_id},${r.type},${r.baseAmount},${r.tax_amount},${r.date.toISOString()}\n`;
    });
    return csv;
  }
}
