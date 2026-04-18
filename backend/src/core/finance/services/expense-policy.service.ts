import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExpensePolicyService {
  private readonly logger = new Logger(ExpensePolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates an expense against the applicable policy.
   * Returns 'APPROVED', 'WARNING', or 'REJECTED'.
   */
  async evaluateExpense(tenant_id: string, category: string, amount: number) {
    const policy = await this.prisma.finance_expense_policies.findFirst({
      where: { tenant_id: tenant_id, category, status: 'ACTIVE' }
    });

    if (!policy) {
      this.logger.warn(`No expense policy found for category ${category}. Assuming permissive.`);
      return { status: 'PERMISSIVE', policyId: null };
    }

    const value = new Decimal(amount);

    if (value.gt(policy.hard_limit)) {
      return { status: 'REJECTED', policyId: policy.id, reason: 'EXCEEDS_HARD_LIMIT' };
    }

    if (value.gt(policy.soft_limit)) {
      return { status: 'WARNING', policyId: policy.id, reason: 'EXCEEDS_SOFT_LIMIT' };
    }

    return { status: 'APPROVED', policyId: policy.id };
  }
}
