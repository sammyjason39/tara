import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { 
  Payroll, 
  Compensation 
} from "./entities/hr.entity";
import { Prisma } from "@prisma/client";

@Injectable()
export class HrPayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrRepository: IHRRepository,
    private readonly auditService: AuditService,
  ) {}

  async getPayroll(tenant_id: string, location_id?: string, employee_id?: string, period?: string): Promise<Payroll[]> {
    return this.hrRepository.getPayroll(tenant_id, location_id, employee_id, period);
  }

  async getGlobalPayroll(employee_id: string, period?: string): Promise<Payroll[]> {
    return this.hrRepository.getGlobalPayroll(employee_id, period);
  }

  async calculatePayroll(tenant_id: string, employee_id: string, period: string, user_id?: string): Promise<Payroll> {
    const event_reference_id = `EVT-HR-PAYROLL-CALC-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const payroll = await this.hrRepository.calculatePayroll(tenant_id, employee_id, period, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CALCULATE_PAYROLL", entity_type: "PAYROLL", entity_id: payroll.id, after_state: payroll, event_reference_id, metadata: { period },
      }, tx);
      return payroll;
    });
  }

  async getCompensation(tenant_id: string, employee_id: string): Promise<Compensation> {
    return this.hrRepository.getCompensation(tenant_id, employee_id) as any;
  }

  async updateCompensation(tenant_id: string, employee_id: string, data: any, user_id?: string): Promise<Compensation> {
    const event_reference_id = `EVT-HR-COMP-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const compensation = await this.hrRepository.updateCompensation(tenant_id, employee_id, data, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "UPDATE_COMPENSATION", entity_type: "COMPENSATION", entity_id: employee_id, after_state: compensation, event_reference_id,
      }, tx);
      return compensation;
    });
  }

  async getCompensationAnalytics(tenant_id: string): Promise<any> {
    return this.hrRepository.getCompensationAnalytics(tenant_id);
  }
}
