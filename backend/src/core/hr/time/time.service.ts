import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { EVENT_NAMES } from '../events/event-names';
import { PrismaService } from '../../../persistence/prisma.service';
import { IHRRepository } from '../repositories/hr.repository.interface';
import { LeaveRequest } from '../entities/leave-request.entity';
import { Attendance } from '../entities/attendance.entity';
import { LeaveType } from '../dto/create-leave-request.dto';

@Injectable()
export class TimeAndAttendanceService {
  private readonly logger = new Logger(TimeAndAttendanceService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly hrRepository: IHRRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ──────────────────────────────────────────────
  // LEAVE MANAGEMENT
  // ──────────────────────────────────────────────

  async requestLeave(tenantId: string, employeeId: string, dto: { type: string, startDate: Date, endDate: Date, reason?: string, totalDays?: number }): Promise<LeaveRequest> {
    const eventReferenceId = `EVT-HR-LEAVE-REQ-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Leave requested by employee ${employeeId}`);
      
      const request = await this.hrRepository.createLeaveRequest(tenantId, {
        employeeId,
        leaveType: dto.type as LeaveType,
        startDate: dto.startDate.toISOString(),
        endDate: dto.endDate.toISOString(),
        reason: dto.reason || 'No reason provided',
        totalDays: dto.totalDays || 1,
      }, tx);

      await this.eventBus.publish({
        eventType: EVENT_NAMES.LEAVE_REQUESTED,
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        eventReferenceId,
        payload: { leaveId: request.id, leaveType: request.leaveType, startDate: request.startDate, endDate: request.endDate },
      }, tx);

      return request;
    });
  }

  async approveLeave(tenantId: string, leaveId: string, approverId: string, notes?: string): Promise<void> {
    const eventReferenceId = `EVT-HR-LEAVE-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Leave ${leaveId} approved by ${approverId}`);
      
      await this.hrRepository.approveLeaveRequest(tenantId, leaveId, approverId, notes, tx);

      await this.eventBus.publish({
        eventType: EVENT_NAMES.LEAVE_APPROVED,
        tenantId,
        entityId: leaveId,
        entityType: "LEAVE_REQUEST",
        sourceModule: "HR",
        eventReferenceId,
        payload: { approverId },
      }, tx);
    });
  }

  // ──────────────────────────────────────────────
  // ATTENDANCE TRACKING
  // ──────────────────────────────────────────────

  async clockIn(tenantId: string, employeeId: string, locationId: string): Promise<Attendance> {
    const eventReferenceId = `EVT-HR-ATT-IN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Employee ${employeeId} clocked in`);

      const record = await this.hrRepository.clockIn(tenantId, employeeId, locationId, undefined, undefined, undefined, tx);

      await this.eventBus.publish({
        eventType: EVENT_NAMES.CLOCK_IN,
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        eventReferenceId,
        payload: { recordId: record.id, clockInTime: record.clockIn },
      }, tx);

      return record;
    });
  }

  async clockOut(tenantId: string, employeeId: string): Promise<void> {
    const eventReferenceId = `EVT-HR-ATT-OUT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Employee ${employeeId} clocked out`);
      
      await this.hrRepository.clockOut(tenantId, employeeId, tx);

      await this.eventBus.publish({
        eventType: EVENT_NAMES.CLOCK_OUT,
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        eventReferenceId,
        payload: { clockOutTime: new Date() },
      }, tx);
    });
  }

  // ──────────────────────────────────────────────
  // SHIFT MANAGEMENT
  // ──────────────────────────────────────────────

  async assignShift(tenantId: string, employeeId: string, shiftId: string, locationId: string, date: string): Promise<void> {
    const eventReferenceId = `EVT-HR-SHIFT-ASN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Assigning shift ${shiftId} to employee ${employeeId} at ${locationId} for date ${date}`);
      
      await this.hrRepository.assignShift(tenantId, employeeId, shiftId, locationId, date, tx);

      await this.eventBus.publish({
        eventType: EVENT_NAMES.SHIFT_ASSIGNED,
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        eventReferenceId,
        payload: { shiftId, locationId, date },
      }, tx);
    });
  }
}
