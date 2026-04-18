import { SalesLead } from "../../entities/sales-lead.entity";
import { SalesOpportunity } from "../../entities/sales-opportunity.entity";
import { CreateLeadDto } from "../../dto/create-lead.dto";
import { UpdateLeadStatusDto } from "../../dto/update-lead-status.dto";
import { CreateOpportunityDto } from "../../dto/create-opportunity.dto";
import { MoveOpportunityStageDto } from "../../dto/move-opportunity-stage.dto";
import { CloseOpportunityDto } from "../../dto/close-opportunity.dto";
import { SalesOrder } from "../../entities/sales-order.entity";

export interface ILeadRepository {
  findAllLeads(tenant_id: string, status?: string): Promise<SalesLead[]>;
  findLeadById(tenant_id: string, id: string): Promise<SalesLead | null>;
  createLead(tenant_id: string, dto: CreateLeadDto, tx?: any): Promise<SalesLead>;
  updateStatus(tenant_id: string, id: string, dto: UpdateLeadStatusDto): Promise<SalesLead>;
  convert(tenant_id: string, lead_id: string, actor_id: string): Promise<SalesOpportunity>;
  runSlaSweep(tenant_id: string, actor_id: string): Promise<any[]>;
}

export interface IOpportunityRepository {
  findAllOpportunities(tenant_id: string, stage?: string): Promise<SalesOpportunity[]>;
  findOpportunityById(tenant_id: string, id: string): Promise<SalesOpportunity | null>;
  createOpportunity(tenant_id: string, dto: CreateOpportunityDto, tx?: any): Promise<SalesOpportunity>;
  moveStage(tenant_id: string, id: string, dto: MoveOpportunityStageDto): Promise<SalesOpportunity>;
  close(tenant_id: string, id: string, dto: CloseOpportunityDto): Promise<SalesOpportunity | SalesOrder>;
}
