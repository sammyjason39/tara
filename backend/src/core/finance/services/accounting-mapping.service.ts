import { Injectable, Logger } from '@nestjs/common';
import { SubledgerEntryType } from '../entities/finance-subledger.entity';

export interface AccountMapping {
  debitAccountId: string;
  creditAccountId: string;
}

@Injectable()
export class AccountingMappingService {
  private readonly logger = new Logger(AccountingMappingService.name);

  /**
   * Resolves the standard Debit and Credit accounts for a given subledger entry.
   * In a production system, this would query a Mapping Repository based on 
   * (tenant_id, company_id, entryType, referenceType).
   */
  async resolveAccounts(
    tenant_id: string,
    company_id: string,
    entryType: SubledgerEntryType,
    referenceType: string
  ): Promise<AccountMapping> {
    this.logger.log(`Resolving accounts for ${entryType} / ${referenceType}`);

    // Mock implementation of account mapping logic
    switch (entryType) {
      // AR
      case SubledgerEntryType.AR_REVENUE:
        return { debitAccountId: '1100-AR-CONTROL', creditAccountId: '4100-SALES-REVENUE' };
      case SubledgerEntryType.AR_PAYMENT:
        return { debitAccountId: '1010-CASH-ON-HAND', creditAccountId: '2150-UNALLOCATED-PAYMENTS' };
      case SubledgerEntryType.AR_ALLOCATION:
        return { debitAccountId: '2150-UNALLOCATED-PAYMENTS', creditAccountId: '1100-AR-CONTROL' };
      case SubledgerEntryType.AR_CREDIT_BALANCE:
        return { debitAccountId: '2150-UNALLOCATED-PAYMENTS', creditAccountId: '2160-CUSTOMER-CREDITS' };

      // AP
      case SubledgerEntryType.AP_EXPENSE:
        return { debitAccountId: '6100-OP-EXPENSE', creditAccountId: '2100-AP-CONTROL' };
      case SubledgerEntryType.AP_PAYMENT:
        return { debitAccountId: '2100-AP-CONTROL', creditAccountId: '1010-CASH-ON-HAND' };
      case SubledgerEntryType.AP_ALLOCATION:
        return { debitAccountId: '2100-AP-CONTROL', creditAccountId: '2100-AP-CONTROL' }; // Net-zero subledger move

      // Cash
      case SubledgerEntryType.CASH_RECEIPT:
        return { debitAccountId: '1010-CASH-AT-BANK', creditAccountId: '1010-CASH-ON-HAND' };
      case SubledgerEntryType.CASH_DISBURSEMENT:
        return { debitAccountId: '1010-CASH-ON-HAND', creditAccountId: '1010-CASH-AT-BANK' };
      case SubledgerEntryType.CASH_ADJUSTMENT:
        return { debitAccountId: '1010-CASH-AT-BANK', creditAccountId: '6900-BANK-FEES-ADJ' };

      // Assets
      case SubledgerEntryType.ASSET_ACQUISITION:
        return { debitAccountId: '1500-FIXED-ASSETS', creditAccountId: '2100-AP-CONTROL' };
      case SubledgerEntryType.ASSET_DEPRECIATION:
        return { debitAccountId: '6500-DEPR-EXPENSE', creditAccountId: '1590-ACCUM-DEPR' };

      // Inventory
      case SubledgerEntryType.INV_ISSUE:
        return { debitAccountId: '5100-COGS', creditAccountId: '1300-INVENTORY' };
      case SubledgerEntryType.INV_RECEIPT:
        return { debitAccountId: '1300-INVENTORY', creditAccountId: '2110-GRNI-ACCRUAL' };

      default:
        throw new Error(`No accounting mapping found for entryType: ${entryType}`);
    }
  }
}
