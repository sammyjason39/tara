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

  async requestLeave(tenant_id: string, employee_id: string, dto: { type: string, start_date: Date, end_date: Date, reason?: string, total_days?: number }): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-REQ-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Leave requested by employee ${employee_id}`);
      
      const employee = await this.hrRepository.getEmployeeById(tenant_id, employee_id);
      if (!employee) throw new Error("Employee not found");

      const request = await this.hrRepository.createLeaveRequest(tenant_id, {
        employee_id,
        department_id: employee.department_id,
        leave_type: dto.type as LeaveType,
        start_date: dto.start_date.toISOString(),
        end_date: dto.end_date.toISOString(),
        reason: dto.reason || 'No reason provided',
        total_days: dto.total_days || 1,
      }, tx);

      await this.eventBus.publish({
        event_type: EVENT_NAMES.LEAVE_REQUESTED,
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        event_reference_id,
        payload: { leave_id: request.id, leave_type: request.leave_type, start_date: request.start_date, end_date: request.end_date },
      }, tx);

      return request;
    });
  }

  async approveLeave(tenant_id: string, leaveId: string, approverId: string, notes?: string): Promise<void> {
    const event_reference_id = `EVT-HR-LEAVE-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Leave ${leaveId} approved by ${approverId}`);
      
      await this.hrRepository.approveLeaveRequest(tenant_id, leaveId, approverId, notes, tx);

      await this.eventBus.publish({
        event_type: EVENT_NAMES.LEAVE_APPROVED,
        tenant_id,
        entity_id: leaveId,
        entity_type: "LEAVE_REQUEST",
        source_module: "HR",
        event_reference_id,
        payload: { approverId },
      }, tx);
    });
  }

  // ──────────────────────────────────────────────
  // ATTENDANCE TRACKING
  // ──────────────────────────────────────────────

  async clock_in(tenant_id: string, employee_id: string, location_id: string): Promise<Attendance> {
    const event_reference_id = `EVT-HR-ATT-IN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Employee ${employee_id} clocked in`);

      const record = await this.hrRepository.clock_in(tenant_id, employee_id, location_id, undefined, undefined, undefined, tx);

      await this.eventBus.publish({
        event_type: EVENT_NAMES.CLOCK_IN,
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        event_reference_id,
        payload: { record_id: record.id, clock_in_time: record.clock_in },
      }, tx);

      return record;
    });
  }

  async clock_out(tenant_id: string, employee_id: string): Promise<void> {
    const event_reference_id = `EVT-HR-ATT-OUT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Employee ${employee_id} clocked out`);
      
      await this.hrRepository.clock_out(tenant_id, employee_id, tx);

      await this.eventBus.publish({
        event_type: EVENT_NAMES.CLOCK_OUT,
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        event_reference_id,
        payload: { clock_out_time: new Date() },
      }, tx);
    });
  }

  // ──────────────────────────────────────────────
  // SHIFT MANAGEMENT
  // ──────────────────────────────────────────────

  async assignShift(tenant_id: string, employee_id: string, shift_id: string, location_id: string, date: string): Promise<void> {
    const event_reference_id = `EVT-HR-SHIFT-ASN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      this.logger.log(`Assigning shift ${shift_id} to employee ${employee_id} at ${location_id} for date ${date}`);
      
      await this.hrRepository.assignShift(tenant_id, employee_id, shift_id, location_id, date, tx);

      await this.eventBus.publish({
        event_type: EVENT_NAMES.SHIFT_ASSIGNED,
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        event_reference_id,
        payload: { shift_id, location_id, date },
      }, tx);
    });
  }
}
