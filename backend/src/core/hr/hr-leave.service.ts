import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { NotificationService } from "../../shared/comms/notification.service";
import { 
  LeaveRequest 
} from "./entities/hr.entity";
import { Prisma } from "@prisma/client";
import { CreateLeaveRequestDto } from "./dto";

@Injectable()
export class HrLeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrRepository: IHRRepository,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async getLeaveRequests(tenant_id: string, location_id?: string, status?: string, employee_id?: string): Promise<LeaveRequest[]> {
    return this.hrRepository.getLeaveRequests(tenant_id, location_id, status, employee_id);
  }

  async getGlobalLeaveRequests(status?: string, employee_id?: string): Promise<LeaveRequest[]> {
    return this.hrRepository.getGlobalLeaveRequests(status, employee_id);
  }

  async createLeaveRequest(tenant_id: string, data: CreateLeaveRequestDto, user_id?: string): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-REQ-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const leaveRequest = await this.hrRepository.createLeaveRequest(tenant_id, data, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CREATE_LEAVE_REQUEST", entity_type: "LEAVE_REQUEST", entity_id: leaveRequest.id, after_state: leaveRequest, event_reference_id, metadata: { total_days: data.total_days },
      }, tx);
      return leaveRequest;
    });
  }

  async approveLeaveRequest(tenant_id: string, request_id: string, reviewerId: string, notes?: string, user_id?: string): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const leaveRequest = await this.hrRepository.approveLeaveRequest(tenant_id, request_id, reviewerId, notes, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "APPROVE_LEAVE_REQUEST", entity_type: "LEAVE_REQUEST", entity_id: request_id, after_state: leaveRequest, event_reference_id,
      }, tx);
      return leaveRequest;
    });
  }

  async rejectLeaveRequest(tenant_id: string, request_id: string, reviewerId: string, notes: string, user_id?: string): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-REJ-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const leaveRequest = await this.hrRepository.rejectLeaveRequest(tenant_id, request_id, reviewerId, notes, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "REJECT_LEAVE_REQUEST", entity_type: "LEAVE_REQUEST", entity_id: request_id, after_state: leaveRequest, event_reference_id,
      }, tx);
      return leaveRequest;
    });
  }
}
