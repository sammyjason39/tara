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

  async createWorkSchedule(tenantId: string, data: any, userId: string) {
    // 0. Validate Location Ownership
    const location = await this.prisma.location.findFirst({
      where: { id: data.locationId, tenantId },
    });
    if (!location) {
      throw new Error(`Location ${data.locationId} does not belong to tenant ${tenantId}`);
    }

    const eventReferenceId = `EVT-HR-SCHED-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const schedule = await this.hrRepository.createWorkSchedule(tenantId, data, tx);

      // 1. Audit Logging
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "CREATE",
        entityType: "WORK_SCHEDULE",
        entityId: schedule.id,
        afterState: schedule,
        eventReferenceId,
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        eventType: "hr.schedule.created.v1",
        tenantId,
        entityId: schedule.id,
        entityType: "WORK_SCHEDULE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { name: schedule.name, locationId: schedule.locationId },
      }, tx);

      return schedule;
    });
  }

  async createWorkShift(tenantId: string, data: any, userId: string) {
    const eventReferenceId = `EVT-HR-SHIFT-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      // Logic: Ensure schedule exists and is not approved (unless forced)
      const schedule = await this.hrRepository.getWorkSchedules(tenantId, data.locationId);
      const targetSchedule = schedule.find(s => s.id === data.scheduleId);
      
      if (targetSchedule && targetSchedule.status === "APPROVED") {
        throw new Error("Cannot add shifts to an approved schedule.");
      }

      const shift = await this.hrRepository.createWorkShift(tenantId, data, tx);

      // 1. Audit Logging
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "CREATE",
        entityType: "WORK_SHIFT",
        entityId: shift.id,
        afterState: shift,
        eventReferenceId,
      }, tx);

      return shift;
    });
  }

  async approveSchedule(tenantId: string, scheduleId: string, userId: string) {
    const eventReferenceId = `EVT-HR-SCHED-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const schedule = await this.hrRepository.approveWorkSchedule(tenantId, scheduleId, userId, tx);

      // 1. Audit Logging
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "APPROVE",
        entityType: "WORK_SCHEDULE",
        entityId: scheduleId,
        afterState: schedule,
        eventReferenceId,
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        eventType: "hr.schedule.approved.v1",
        tenantId,
        entityId: scheduleId,
        entityType: "WORK_SCHEDULE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { scheduleId },
      }, tx);

      // 3. System Alert: Notify all employees in this schedule
      const shifts = await this.hrRepository.getWorkShifts(tenantId, scheduleId);
      const employeeIds = [...new Set(shifts.map(s => s.employeeId))];

      for (const empId of employeeIds) {
        await this.eventBus.publish({
          eventType: "HR.SHIFT_ASSIGNED",
          tenantId,
          entityId: empId,
          entityType: "EMPLOYEE",
          sourceModule: "HR",
          userId,
          eventReferenceId,
          payload: { scheduleId, employeeId: empId },
        }, tx);
      }

      return schedule;
    });
  }

  async getWorkSchedules(tenantId: string, locationId?: string) {
    return this.hrRepository.getWorkSchedules(tenantId, locationId);
  }

  async getWorkShifts(tenantId: string, scheduleId?: string, employeeId?: string) {
    return this.hrRepository.getWorkShifts(tenantId, scheduleId, employeeId);
  }
}
