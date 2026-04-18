import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { 
  Attendance 
} from "./entities/hr.entity";
import { Prisma } from "@prisma/client";

@Injectable()
export class HrAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrRepository: IHRRepository,
    private readonly auditService: AuditService,
  ) {}

  async getAttendance(tenant_id: string, location_id?: string, employee_id?: string, start_date?: string, end_date?: string): Promise<{ data: Attendance[]; total: number }> {
    return this.hrRepository.getAttendance(tenant_id, location_id, employee_id, start_date, end_date);
  }

  async getGlobalAttendance(employee_id?: string, start_date?: string, end_date?: string): Promise<{ data: Attendance[]; total: number }> {
    return this.hrRepository.getGlobalAttendance(employee_id, start_date, end_date);
  }

  async clock_in(tenant_id: string, employee_id: string, location_id: string, user_id?: string): Promise<Attendance> {
    const event_reference_id = `EVT-HR-ATT-IN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const attendance = await this.hrRepository.clock_in(tenant_id, employee_id, location_id, undefined, undefined, undefined, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CLOCK_IN", entity_type: "ATTENDANCE", entity_id: attendance.id, after_state: attendance, event_reference_id,
      }, tx);
      return attendance;
    });
  }

  async clock_out(tenant_id: string, employee_id: string, user_id?: string): Promise<Attendance> {
    const event_reference_id = `EVT-HR-ATT-OUT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const attendance = await this.hrRepository.clock_out(tenant_id, employee_id, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CLOCK_OUT", entity_type: "ATTENDANCE", entity_id: attendance.id, after_state: attendance, event_reference_id,
      }, tx);
      return attendance;
    });
  }
}
