import { CompanyGroup, CompanyGroupMember } from '../../domain/finance.interfaces';

export interface ICompanyGroupRepository {
  findById(tenant_id: string, id: string): Promise<CompanyGroup | null>;
  findByName(tenant_id: string, name: string): Promise<CompanyGroup | null>;
  listGroups(tenant_id: string): Promise<CompanyGroup[]>;
  createGroup(tenant_id: string, data: Partial<CompanyGroup>): Promise<CompanyGroup>;
  
  addMember(groupId: string, company_id: string, ownershipPercentage: number): Promise<CompanyGroupMember>;
  findMembers(groupId: string): Promise<CompanyGroupMember[]>;
  findGroupsByCompany(company_id: string): Promise<CompanyGroupMember[]>;
  findSubGroups(parentGroupId: string): Promise<CompanyGroup[]>;
}
