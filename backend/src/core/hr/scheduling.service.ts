import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { LoggerService } from "../../shared/logger/logger.service";

/**
 * SchedulingService
 * Handles Global Scheduling & Attendance logic.
 * Ensures transactional integrity and cross-module context.
 */
@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrRepository: IHRRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly loggerService: LoggerService,
  ) {}

  async createWorkSchedule(tenant_id: string, data: any, user_id: string) {
    // 0. Validate Location Ownership
    const location = await this.prisma.locations.findFirst({
      where: { id: data.location_id, tenant_id: tenant_id },
    });
    if (!location) {
      throw new Error(`Location ${data.location_id} does not belong to tenant ${tenant_id}`);
    }

    const event_reference_id = `EVT-HR-SCHED-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const schedule = await this.hrRepository.createWorkSchedule(tenant_id, data, tx);

      // 1. Audit Logging
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "CREATE",
        entity_type: "WORK_SCHEDULE",
        entity_id: schedule.id,
        after_state: schedule,
        event_reference_id,
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        event_type: "hr.schedule.created.v1",
        tenant_id,
        entity_id: schedule.id,
        entity_type: "WORK_SCHEDULE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { name: schedule.name, location_id: schedule.location_id },
      }, tx);

      return schedule;
    });
  }

  async createWorkShift(tenant_id: string, data: any, user_id: string) {
    const event_reference_id = `EVT-HR-SHIFT-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      // Logic: Ensure schedule exists and is not approved (unless forced)
      const schedule = await this.hrRepository.getWorkSchedules(tenant_id, data.location_id);
      const targetSchedule = schedule.find(s => s.id === data.scheduleId);
      
      if (targetSchedule && targetSchedule.status === "APPROVED") {
        throw new Error("Cannot add shifts to an approved schedule.");
      }

      const shift = await this.hrRepository.createWorkShift(tenant_id, data, tx);

      // 1. Audit Logging
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "CREATE",
        entity_type: "WORK_SHIFT",
        entity_id: shift.id,
        after_state: shift,
        event_reference_id,
      }, tx);

      return shift;
    });
  }

  async approveSchedule(tenant_id: string, scheduleId: string, user_id: string) {
    const event_reference_id = `EVT-HR-SCHED-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const schedule = await this.hrRepository.approveWorkSchedule(tenant_id, scheduleId, user_id, tx);

      // 1. Audit Logging
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "APPROVE",
        entity_type: "WORK_SCHEDULE",
        entity_id: scheduleId,
        after_state: schedule,
        event_reference_id,
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        event_type: "hr.schedule.approved.v1",
        tenant_id,
        entity_id: scheduleId,
        entity_type: "WORK_SCHEDULE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { scheduleId },
      }, tx);

      // 3. System Alert: Notify all employees in this schedule
      const shifts = await this.hrRepository.getWorkShifts(tenant_id, scheduleId);
      const employeeIds = [...new Set(shifts.map(s => s.employee_id))];

      for (const empId of employeeIds) {
        await this.eventBus.publish({
          event_type: "HR.SHIFT_ASSIGNED",
          tenant_id,
          entity_id: empId,
          entity_type: "EMPLOYEE",
          source_module: "HR",
          user_id,
          event_reference_id,
          payload: { scheduleId, employee_id: empId },
        }, tx);
      }

      return schedule;
    });
  }

  async getWorkSchedules(tenant_id: string, location_id?: string) {
    return this.hrRepository.getWorkSchedules(tenant_id, location_id);
  }

  async getWorkShifts(tenant_id: string, scheduleId?: string, employee_id?: string) {
    return this.hrRepository.getWorkShifts(tenant_id, scheduleId, employee_id);
  }
}
