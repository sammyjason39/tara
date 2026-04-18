import { FinancePostingRule } from '../../domain/finance.interfaces';
import { PostingRuleStatus } from '../../domain/finance.constants';

export interface IPostingRuleRepository {
  findRule(tenant_id: string, company_id: string, event_type: string): Promise<FinancePostingRule | null>;
  listRules(tenant_id: string, company_id: string): Promise<FinancePostingRule[]>;
  createRule(tenant_id: string, company_id: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule>;
  updateStatus(tenant_id: string, company_id: string, ruleId: string, status: PostingRuleStatus): Promise<FinancePostingRule>;
  findByEventType(tenant_id: string, company_id: string, event_type: string): Promise<FinancePostingRule[]>;
  update(tenant_id: string, company_id: string, ruleId: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule>;
}
