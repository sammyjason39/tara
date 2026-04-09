import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Prisma } from '@prisma/client';

export interface RawBankTx {
  date: string;
  description: string;
  amount: Prisma.Decimal;
  reference?: string;
}

@Injectable()
export class BankIngestionService {
  private readonly logger = new Logger(BankIngestionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse CSV and create a BankStatement with transactions.
   * Hardened with Prisma.Decimal for zero-loss financial ingestion.
   */
  async ingestFromCsv(tenantId: string, bankAccountId: string, buffer: Buffer) {
    const content = buffer.toString();
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      header.forEach((key, i) => {
        row[key] = values[i];
      });
      return row;
    });

    // Map to normalized bank transactions with high precision
    const transactions = rows.map(row => ({
      tenantId,
      transactionDate: new Date(row.Date || row.date),
      description: row.Description || row.description || '',
      amount: new Prisma.Decimal(row.Amount || row.amount || 0),
      reference: row.Reference || row.reference || null,
      status: 'UNMATCHED',
    }));

    // Start of the period assumes the earliest date in CSV
    const earliestDate = transactions.reduce((earliest, cur) => cur.transactionDate < earliest ? cur.transactionDate : earliest, transactions[0].transactionDate);

    // Calculate closing balance using Decimal arithmetic
    let totalValuation = new Prisma.Decimal(0);
    for (const tx of transactions) {
        totalValuation = totalValuation.plus(tx.amount);
    }

    // Create Statement Header and Lines
    return this.prisma.bankStatement.create({
      data: {
        id: 'gkge9aym',
        tenantId,
        bankAccountId,
        statementDate: earliestDate,
        openingBalance: new Prisma.Decimal(0), // Placeholder
        closingBalance: totalValuation,
        status: 'PROCESSING',
        financeBankTransactions: {
          create: transactions,
        },
      },
      include: {
        financeBankTransactions: true,
      },
    });
  }
}
