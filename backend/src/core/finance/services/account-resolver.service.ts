import { Injectable, Logger, Inject } from '@nestjs/common';
import { IChartOfAccountRepository } from '../repositories/interfaces/coa.repository.interface';

@Injectable()
export class AccountResolverService {
  private readonly logger = new Logger(AccountResolverService.name);

  constructor(
    @Inject('IChartOfAccountRepository')
    private readonly coaRepo: IChartOfAccountRepository,
  ) {}

  /**
   * Resolves a GL Account ID from an expression or metadata.
   * Example expression: 'payload.category.revenueAccount'
   */
  async resolve(tenant_id: string, company_id: string, expression: string, payload: any): Promise<string> {
    // 1. Check if expression is a direct account ID (simplest case)
    if (this.isUuid(expression)) {
      return expression;
    }

    // 2. Resolve from payload if it's a dynamic path
    if (expression.startsWith('payload.')) {
        const path = expression.replace('payload.', '');
        const resolvedId = this.getValueByPath(payload, path);
        if (resolvedId && this.isUuid(resolvedId)) {
            return resolvedId;
        }
    }

    // 3. Metadata resolution logic (e.g. searching COA by account code or metadata)
    // For now, we fallback to a mock resolution for demonstration
    this.logger.debug(`Resolving account for expression: ${expression}`);
    
    // Default fallback (Mock IDs for demonstration)
    if (expression.includes('revenue')) return 'ACC-REV-001';
    if (expression.includes('tax')) return 'ACC-TAX-001';
    if (expression.includes('cash')) return 'ACC-CASH-001';
    
    // Inventory Accounts
    if (expression.includes('inventory.control')) return 'ACC-INV-CTL-001';
    if (expression.includes('inventory.clearing')) return 'ACC-INV-CLR-001';
    if (expression.includes('inventory.accrued')) return 'ACC-LIAB-ACR-001';
    if (expression.includes('cogs')) return 'ACC-COGS-001';
    if (expression.includes('revaluation')) return 'ACC-INV-REV-01';

    throw new Error(`Unable to resolve account for expression: ${expression}`);
  }

  private isUuid(val: string): boolean {
    return /^[0-9a-fA-F-]{36}$/.test(val) || val.startsWith('ACC-'); // Supporting mock IDs too
  }

  private getValueByPath(obj: any, path: string): string | undefined {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
