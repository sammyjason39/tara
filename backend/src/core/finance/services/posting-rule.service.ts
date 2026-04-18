import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AuditService } from '../../../shared/audit/audit.service';
import { IPostingRuleRepository } from '../repositories/interfaces/posting-rule.repository.interface';
import { IChartOfAccountRepository } from '../repositories/interfaces/coa.repository.interface';
import { PostingRuleStatus, PostingSide } from '../domain/finance.constants';

@Injectable()
export class PostingRuleService {
  constructor(
    @Inject('IPostingRuleRepository')
    private readonly ruleRepo: IPostingRuleRepository,
    @Inject('IChartOfAccountRepository')
    private readonly coaRepo: IChartOfAccountRepository,
    private readonly auditService: AuditService,
  ) {}

  async listRules(tenant_id: string, company_id: string): Promise<any[]> {
    return this.ruleRepo.listRules(tenant_id, company_id);
  }

  async createRule(tenant_id: string, company_id: string, data: any, user_id: string): Promise<any> {
    // 1. Validate accounts exist
    const hasDebit = data.lines.some((l: any) => l.side === PostingSide.DEBIT);
    const hasCredit = data.lines.some((l: any) => l.side === PostingSide.CREDIT);
    if (!hasDebit || !hasCredit) {
      throw new BadRequestException('Posting rule must have at least one DEBIT and one CREDIT line');
    }

    // 2. Validation: Accounts
    for (const line of data.lines) {
      const coa = await this.coaRepo.findById(tenant_id, company_id, line.accountId);
      if (!coa) throw new BadRequestException(`Account ${line.accountId} not found for rule`);
    }

    // 3. Validation: Balanced Rule (Conceptual)
    // ERP safety: If amountExpression is literal, we check Sum(D) == Sum(C).
    // If dynamic, we assume the expression is designed to balance.
    // Real implementation would have an expression evaluator placeholder here.

    const rule = await this.ruleRepo.createRule(tenant_id, company_id, data);

    await this.auditService.log({
      tenant_id,
      user_id,
      module: 'FINANCE',
      action: 'CREATE_POSTING_RULE',
      entity_type: 'PostingRule',
      entity_id: rule.id,
      after_state: rule,
      metadata: { company_id },
    });

    return rule;
  }

  async activateRule(tenant_id: string, company_id: string, ruleId: string, user_id: string): Promise<any> {
    const rule = await this.ruleRepo.updateStatus(tenant_id, company_id, ruleId, PostingRuleStatus.ACTIVE);

    // 4. Versioning Safeguard: Deactivate other rules for same event_type
    const allRules = await this.ruleRepo.findByEventType(tenant_id, company_id, rule.event_type);
    for (const other of allRules) {
      if (other.id !== ruleId && other.status === PostingRuleStatus.ACTIVE) {
        await this.ruleRepo.update(tenant_id, company_id, other.id, {
          status: PostingRuleStatus.INACTIVE,
          effectiveTo: new Date(),
        });
        
        await this.auditService.log({
          tenant_id,
          user_id: 'SYSTEM', // System-triggered deactivation
          module: 'FINANCE',
          action: 'DEACTIVATE_POSTING_RULE',
          entity_type: 'PostingRule',
          entity_id: other.id,
          metadata: { company_id, deactivatedBy: ruleId },
        });
      }
    }

    await this.auditService.log({
      tenant_id,
      user_id,
      module: 'FINANCE',
      action: 'ACTIVATE_POSTING_RULE',
      entity_type: 'PostingRule',
      entity_id: ruleId,
      after_state: rule,
      metadata: { company_id },
    });

    return rule;
  }
}
