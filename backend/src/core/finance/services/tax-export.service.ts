import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

@Injectable()
export class TaxExportService {
  private readonly logger = new Logger(TaxExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a tax report for a specific period and branch.
   */
  async generateTaxReport(tenantId: string, branchId: string, fiscalPeriodId: string) {
    const transactions = await this.prisma.transactionTax.findMany({
      where: { 
          tenantId,
          // In a real system, we would join with Invoice/Bill to check branchId
      },
      orderBy: { createdAt: 'desc' }
    });

    const reportData = transactions.map((t: any) => ({
      transactionId: t.transactionId,
      type: t.transactionType,
      baseAmount: t.baseAmount,
      taxAmount: t.taxAmount,
      date: t.createdAt
    }));

    return {
      tenantId,
      branchId,
      fiscalPeriodId,
      generatedAt: new Date(),
      data: reportData,
      totalTax: reportData.reduce((sum: number, r: any) => sum + Number(r.taxAmount), 0)
    };
  }

  /**
   * Mock Export to CSV (Simulated)
   */
  async exportToCSV(tenantId: string, branchId: string, fiscalPeriodId: string) {
    const report = await this.generateTaxReport(tenantId, branchId, fiscalPeriodId);
    let csv = 'TransactionID,Type,BaseAmount,TaxAmount,Date\n';
    report.data.forEach((r: any) => {
      csv += `${r.transactionId},${r.type},${r.baseAmount},${r.taxAmount},${r.date.toISOString()}\n`;
    });
    return csv;
  }
}
