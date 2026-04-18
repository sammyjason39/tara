import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { 
  JobRequisition, 
  Candidate, 
  Interview, 
  TalentLead 
} from "./entities/hr.entity";
import { Prisma } from "@prisma/client";
import { CreateRequisitionDto } from "./dto";

@Injectable()
export class HrRecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrRepository: IHRRepository,
    private readonly auditService: AuditService,
  ) {}

  async getRequisitions(tenant_id: string, status?: string): Promise<JobRequisition[]> {
    return this.hrRepository.getRequisitions(tenant_id, status);
  }

  async createRequisition(tenant_id: string, data: CreateRequisitionDto, user_id?: string): Promise<JobRequisition> {
    const event_reference_id = `EVT-HR-REQ-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const requisition = await this.hrRepository.createRequisition(tenant_id, data, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CREATE_REQUISITION", entity_type: "REQUISITION", entity_id: requisition.id, after_state: requisition, event_reference_id,
      }, tx);
      return requisition;
    });
  }

  async getCandidates(tenant_id: string, status?: string): Promise<Candidate[]> {
    return this.hrRepository.getCandidates(tenant_id, status);
  }

  async createCandidate(tenant_id: string, data: any, user_id?: string): Promise<Candidate> {
    return this.hrRepository.createCandidate(tenant_id, data);
  }

  async hireCandidate(tenant_id: string, candidateId: string, data: any, user_id?: string) {
    return this.hrRepository.hireCandidate(tenant_id, candidateId, data);
  }

  async getInterviews(tenant_id: string, candidateId?: string): Promise<Interview[]> {
    return this.hrRepository.getInterviews(tenant_id, candidateId);
  }

  async scheduleInterview(tenant_id: string, data: any, user_id?: string): Promise<Interview> {
    return this.hrRepository.scheduleInterview(tenant_id, data);
  }

  async getTalentLeads(tenant_id: string, status?: string): Promise<TalentLead[]> {
    return this.hrRepository.getTalentLeads(tenant_id, status);
  }

  async convertLeadToCandidate(tenant_id: string, lead_id: string, requisitionId: string, user_id?: string): Promise<Candidate> {
    return this.hrRepository.createCandidate(tenant_id, { lead_id, requisitionId });
  }
}
