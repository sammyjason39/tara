import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ingest a bank statement and its transactions
   */
  async ingestStatement(tenant_id: string, data: {
    bank_account_id: string;
    gl_account_id?: string;
    statement_date: string;
    opening_balance: number;
    closing_balance: number;
    transactions: Array<{
      date: string;
      description: string;
      amount: number;
      reference?: string;
    }>;
  }) {
    return this.prisma.$transaction(async (db) => {
      // 1. Create statement header
      const statement = await db.finance_bank_statements.create({
        data: {
          tenant_id,
          bank_account_id: data.bank_account_id,
          gl_account_id: data.gl_account_id,
          statement_date: new Date(data.statement_date),
          opening_balance: data.opening_balance,
          closing_balance: data.closing_balance,
          status: 'DRAFT',
        }
      });

      // 2. Create transactions
      const transactions = await Promise.all(
        data.transactions.map(tx => 
          db.finance_bank_transactions.create({
            data: {
              tenant_id,
              statement_id: statement.id,
              transaction_date: new Date(tx.date),
              description: tx.description,
              amount: tx.amount,
              reference: tx.reference,
              status: 'UNMATCHED'
            }
          })
        )
      );

      return { statement, transactionsCount: transactions.length };
    });
  }

  /**
   * Finalize a reconciliation statement
   */
  async finalizeReconciliation(tenant_id: string, statementId: string) {
    const statement = await this.prisma.finance_bank_statements.findUniqueOrThrow({
      where: { id: statementId, tenant_id },
      include: { finance_bank_transactions: true }
    });

    if (statement.status === 'FINALIZED') {
      throw new BadRequestException('Statement is already finalized');
    }

    // 1. Verify all transactions are MATCHED
    const unmatched = statement.finance_bank_transactions.filter(tx => tx.status !== 'MATCHED');
    if (unmatched.length > 0) {
      throw new BadRequestException(`Cannot finalize statement. ${unmatched.length} transactions are not MATCHED.`);
    }

    // 2. Verify closing balance (theoretical vs actual)
    const txSum = statement.finance_bank_transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const theoreticalClosing = Number(statement.opening_balance) + txSum;
    
    // Allow small rounding difference? 
    if (Math.abs(theoreticalClosing - Number(statement.closing_balance)) > 0.01) {
      throw new BadRequestException(`Balance mismatch: Theoretical closing balance is ${theoreticalClosing}, but statement says ${statement.closing_balance}`);
    }

    // 3. Update status
    return this.prisma.finance_bank_statements.update({
      where: { id: statementId },
      data: { status: 'FINALIZED' }
    });
  }

  /**
   * Get ledger lines that could be matched
   */
  async getUnmatchedLedgerLines(tenant_id: string, glAccountId: string) {
    return this.prisma.finance_journal_entries.findMany({
      where: {
        tenant_id,
        status: 'POSTED',
        finance_journal_lines: {
          some: {
            account_id: glAccountId,
          }
        },
        // Not linked to any match yet
        finance_recon_matches: {
          none: {}
        }
      },
      include: {
        finance_journal_lines: {
          where: { account_id: glAccountId }
        }
      },
      orderBy: { posting_date: 'desc' }
    });
  }
}
