import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

export interface ResolvedMapping {
  debitAccountId: string;
  creditAccountId: string;
}

@Injectable()
export class FiscalMappingService {
  private readonly logger = new Logger(FiscalMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves Debit and Credit accounts based on Financial Intent and Tenant Industry.
   * Logic: (Intent Slug, Industry) -> Account IDs
   */
  async resolveAccountsByIntent(
    tenant_id: string,
    intent: string,
  ): Promise<ResolvedMapping> {
    this.logger.log(`Resolving accounts for intent: ${intent} (Tenant: ${tenant_id})`);

    // 1. Fetch Tenant Industry
    const company = await this.prisma.company.findUnique({
      where: { id: tenant_id },
      select: { industry: true },
    });

    const industry = company?.industry || 'retail';

    // 2. Mapping Logic (In production, this would be a DB table 'fiscal_intent_mappings')
    // We implement the "Industry Delta" logic here as per the Technical Specification.
    
    return this.getHardcodedMapping(intent, industry);
  }

  private getHardcodedMapping(intent: string, industry: string): ResolvedMapping {
    // Standard Mappings (Clipped/Default)
    const mappings: Record<string, Record<string, ResolvedMapping>> = {
      'STOCK_INTAKE': {
        'default': { debitAccountId: '1300-INVENTORY', creditAccountId: '2110-GRNI-ACCRUAL' },
        'hotel': { debitAccountId: '1310-HOTEL-SUPPLIES', creditAccountId: '2110-GRNI-ACCRUAL' },
        'poultry': { debitAccountId: '1400-BIOLOGICAL-ASSETS', creditAccountId: '2110-GRNI-ACCRUAL' },
      },
      'STOCK_CONSUME': {
        'default': { debitAccountId: '5100-COGS', creditAccountId: '1300-INVENTORY' },
        'hotel': { debitAccountId: '5200-HOUSEKEEPING-EXP', creditAccountId: '1310-HOTEL-SUPPLIES' },
        'poultry': { debitAccountId: '5300-FEED-CONSUMPTION', creditAccountId: '1300-INVENTORY' },
      },
      'WASTAGE_DETECTED': {
        'default': { debitAccountId: '5190-INVENTORY-SHRINK', creditAccountId: '1300-INVENTORY' },
      },
      'INTERNAL_TRANSFER': {
        'default': { debitAccountId: '1300-INVENTORY', creditAccountId: '1300-INVENTORY' },
      }
    };

    const intentMap = mappings[intent];
    if (!intentMap) {
      throw new Error(`Financial Intent '${intent}' is not registered in FiscalMappingService.`);
    }

    return intentMap[industry] || intentMap['default'];
  }
}
