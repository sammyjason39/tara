import { IntercompanyEliminationRule } from '../../domain/finance.interfaces';

export interface IIntercompanyEliminationRepository {
  listRules(tenant_id: string): Promise<IntercompanyEliminationRule[]>;
  findByCompanies(tenant_id: string, companyA: string, companyB: string): Promise<IntercompanyEliminationRule | null>;
  createRule(tenant_id: string, data: Partial<IntercompanyEliminationRule>): Promise<IntercompanyEliminationRule>;
  updateRule(tenant_id: string, id: string, data: Partial<IntercompanyEliminationRule>): Promise<IntercompanyEliminationRule>;
  deleteRule(tenant_id: string, id: string): Promise<void>;
}
