import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService, TaraEvent } from '../services/event-bus.service';
import { TaraAttendanceService } from '../services/tara-attendance.service';

/**
 * Absensi Agent (Attendance Monitoring Agent)
 * 
 * Autonomous service for TARA HR System that handles:
 * - Real-time attendance monitoring
 * - Event emission for attendance actions (clock-in, clock-out, tardiness)
 * - Integration with Clock_Confirmation_Agent
 * - Scheduled tasks for attendance status updates
 * 
 * Requirements:
 * - 2.1: Record exact clock-in timestamp in WIB
 * - 2.2: Record exact clock-out timestamp in WIB
 * - 2.3: Flag tardy employees when clock-in after threshold
 * - 2.4: Trigger Late_Report_Agent when tardiness detected
 * - 2.5: Maintain real-time attendance status for all employees
 * - 2.7: Integrate with Clock_Confirmation_Agent for confirmation messages
 * 
 * Design: Task 11.3 - Implement Absensi Agent as autonomous service
 */
@Injectable()
export class AbsensiAgent {
  private readonly logger = new Logger(AbsensiAgent.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly attendanceService: TaraAttendanceService,
  ) {
    this.logger.log('Absensi Agent initialized');
  }

  /**
   * Process clock-in event
   * 
   * Called when an employee clocks in. This method:
   * 1. Validates the clock-in via TaraAttendanceService
   * 2. Emits attendance.clock_in event to Event Bus
   * 3. Emits attendance.tardiness_detected if employee is late
   * 4. Triggers Clock_Confirmation_Agent via event
   * 
   * Requirements: 2.1, 2.3, 2.4, 2.7
   * 
   * @param employeeId - Employee UUID
   * @param timestamp - Clock-in timestamp (WIB)
   * @param gpsLatitude - GPS latitude
   * @param gpsLongitude - GPS longitude
   * @param biometricVerified - Whether biometric auth was successful
   * @param attendanceSource - Source: 'phone' or 'aws_device'
   * @returns Created attendance record
   */
  async processClockIn(
    employeeId: string,
    timestamp: Date,
    gpsLatitude: number,
    gpsLongitude: number,
    biometricVerified: boolean,
    attendanceSource: 'phone' | 'aws_device' = 'phone',
    selfiePhoto?: string,
  ): Promise<any> {
    this.logger.log(
      `Processing clock-in for employee ${employeeId} at ${timestamp.toISOString()}`,
    );

    try {
      // Step 1: Record clock-in via TaraAttendanceService
      // This service handles geo-fence validation, tardiness calculation, and event emission
      const attendanceRecord = await this.attendanceService.recordClockIn(
        employeeId,
        timestamp,
        gpsLatitude,
        gpsLongitude,
        biometricVerified,
        attendanceSource,
        selfiePhoto,
      );

      // Step 2: Emit event to trigger Clock_Confirmation_Agent
      // Requirement 2.7: Integrate with Clock_Confirmation_Agent
      await this.triggerClockConfirmation(
        employeeId,
        'clock_in',
        timestamp,
        attendanceRecord,
      );

      this.logger.log(
        `Clock-in processed successfully for employee ${employeeId}. Tardy: ${attendanceRecord.is_tardy}`,
      );

      return attendanceRecord;
    } catch (error) {
      this.logger.error(
        `Failed to process clock-in for employee ${employeeId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process clock-out event
   * 
   * Called when an employee clocks out. This method:
   * 1. Validates the clock-out via TaraAttendanceService
   * 2. Emits attendance.clock_out event to Event Bus
   * 3. Triggers Clock_Confirmation_Agent via event
   * 
   * Requirements: 2.2, 2.7
   * 
   * @param employeeId - Employee UUID
   * @param timestamp - Clock-out timestamp (WIB)
   * @param gpsLatitude - GPS latitude
   * @param gpsLongitude - GPS longitude
   * @param attendanceSource - Source: 'phone' or 'aws_device'
   * @returns Updated attendance record
   */
  async processClockOut(
    employeeId: string,
    timestamp: Date,
    gpsLatitude: number,
    gpsLongitude: number,
    attendanceSource: 'phone' | 'aws_device' = 'phone',
    selfiePhoto?: string,
  ): Promise<any> {
    this.logger.log(
      `Processing clock-out for employee ${employeeId} at ${timestamp.toISOString()}`,
    );

    try {
      // Step 1: Record clock-out via TaraAttendanceService
      const attendanceRecord = await this.attendanceService.recordClockOut(
        employeeId,
        timestamp,
        gpsLatitude,
        gpsLongitude,
        attendanceSource,
        selfiePhoto,
      );

      // Step 2: Emit event to trigger Clock_Confirmation_Agent
      // Requirement 2.7: Integrate with Clock_Confirmation_Agent
      await this.triggerClockConfirmation(
        employeeId,
        'clock_out',
        timestamp,
        attendanceRecord,
      );

      this.logger.log(
        `Clock-out processed successfully for employee ${employeeId}`,
      );

      return attendanceRecord;
    } catch (error) {
      this.logger.error(
        `Failed to process clock-out for employee ${employeeId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Trigger Clock Confirmation Agent
   * 
   * Emits an event to trigger the Clock_Confirmation_Agent to send
   * a private confirmation notification to the employee
   * 
   * Requirements: 2.7, 3.1, 3.2
   * 
   * @param employeeId - Employee UUID
   * @param actionType - Type of action: 'clock_in' or 'clock_out'
   * @param timestamp - Action timestamp
   * @param attendanceRecord - The attendance record
   */
  private async triggerClockConfirmation(
    employeeId: string,
    actionType: 'clock_in' | 'clock_out',
    timestamp: Date,
    attendanceRecord: any,
  ): Promise<void> {
    try {
      // Get employee details for confirmation message
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      });

      if (!employee) {
        this.logger.warn(
          `Cannot send clock confirmation: Employee ${employeeId} not found`,
        );
        return;
      }

      // Emit event to trigger Clock_Confirmation_Agent
      const confirmationEvent: TaraEvent = {
        event_id: undefined, // Will be generated by EventBusService
        event_type: 'attendance.confirmation_required',
        event_version: '1.0',
        event_timestamp: timestamp,
        actor: {
          id: 'absensi_agent',
          type: 'agent',
        },
        entity: {
          id: attendanceRecord.id,
          type: 'attendance',
        },
        payload: {
          employee_id: employeeId,
          employee_name: employee.full_name,
          action_type: actionType,
          timestamp: timestamp.toISOString(),
          is_tardy: attendanceRecord.is_tardy || false,
          tardiness_minutes: attendanceRecord.tardiness_minutes || 0,
          attendance_date: attendanceRecord.attendance_date?.toISOString(),
        },
        metadata: {
          confirmation_type: 'private_notification',
          recipient_id: employeeId,
        },
      };

      await this.eventBusService.emit(confirmationEvent);

      this.logger.log(
        `Clock confirmation event triggered for employee ${employee.full_name} (${actionType})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger clock confirmation for employee ${employeeId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - confirmation failure should not block attendance recording
    }
  }

  /**
   * Get real-time attendance status for all employees
   * 
   * Provides dashboard view of current attendance status.
   * Shows who has clocked in, who is tardy, who hasn't clocked in yet.
   * 
   * Requirement 2.5: Maintain real-time attendance status for all employees
   * 
   * @param date - Date to check (defaults to today)
   * @returns Attendance status summary
   */
  async getRealtimeAttendanceStatus(date?: Date): Promise<{
    date: string;
    total_employees: number;
    clocked_in: number;
    clocked_out: number;
    tardy: number;
    absent: number;
    attendance_records: any[];
  }> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    this.logger.log(
      `Fetching real-time attendance status for ${targetDate.toDateString()}`,
    );

    try {
      // Get all active employees
      const activeEmployees = await this.prisma.employee.findMany({
        where: {
          employment_status: 'active',
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          department_id: true,
        },
      });

      // Get attendance records for the date
      const attendanceRecords = await this.attendanceService.getRealtimeAttendanceStatus(
        targetDate,
      );

      // Calculate statistics
      const totalEmployees = activeEmployees.length;
      const clockedIn = attendanceRecords.filter(
        (r) => r.clock_in_time !== null,
      ).length;
      const clockedOut = attendanceRecords.filter(
        (r) => r.clock_out_time !== null,
      ).length;
      const tardy = attendanceRecords.filter((r) => r.is_tardy === true).length;
      const absent = totalEmployees - clockedIn;

      return {
        date: targetDate.toISOString(),
        total_employees: totalEmployees,
        clocked_in: clockedIn,
        clocked_out: clockedOut,
        tardy: tardy,
        absent: absent,
        attendance_records: attendanceRecords,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch real-time attendance status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Scheduled task: Update attendance status cache
   * 
   * Runs every 5 minutes during working hours to refresh attendance status
   * This helps maintain real-time visibility of attendance data
   * 
   * Requirement 2.5: Maintain real-time attendance status
   */
  @Cron('*/5 7-18 * * 1-5') // Every 5 minutes, 7 AM to 6 PM, Monday to Friday
  async updateAttendanceStatusCache(): Promise<void> {
    this.logger.debug('Running scheduled attendance status update');

    try {
      const status = await this.getRealtimeAttendanceStatus();

      // Log summary for monitoring
      this.logger.log(
        `Attendance Status Update: ${status.clocked_in}/${status.total_employees} clocked in, ` +
          `${status.tardy} tardy, ${status.absent} absent`,
      );

      // Emit event for monitoring/dashboard updates
      const statusEvent: TaraEvent = {
        event_id: undefined,
        event_type: 'attendance.status_updated',
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: 'absensi_agent',
          type: 'agent',
        },
        entity: {
          id: status.date,
          type: 'attendance_summary',
        },
        payload: {
          date: status.date,
          total_employees: status.total_employees,
          clocked_in: status.clocked_in,
          clocked_out: status.clocked_out,
          tardy: status.tardy,
          absent: status.absent,
        },
      };

      await this.eventBusService.emit(statusEvent);
    } catch (error) {
      this.logger.error(
        `Failed to update attendance status cache: ${error.message}`,
        error.stack,
      );
      // Don't throw - this is a background task
    }
  }

  /**
   * Scheduled task: Check for missing clock-outs
   * 
   * Runs at 6 PM daily to identify employees who clocked in but forgot to clock out
   * Emits events for follow-up by HR team
   * 
   * Requirement 2.5: Maintain real-time attendance status
   */
  @Cron('0 18 * * 1-5') // 6 PM, Monday to Friday
  async checkMissingClockOuts(): Promise<void> {
    this.logger.log('Running scheduled check for missing clock-outs');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find attendance records with clock-in but no clock-out
      const missingClockOuts = await this.prisma.attendance.findMany({
        where: {
          attendance_date: today,
          clock_in_time: {
            not: null,
          },
          clock_out_time: null,
          employee: {
            employment_status: 'active',
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      });

      if (missingClockOuts.length > 0) {
        this.logger.warn(
          `Found ${missingClockOuts.length} employees with missing clock-outs`,
        );

        // Emit event for HR team notification
        const missingClockOutEvent: TaraEvent = {
          event_id: undefined,
          event_type: 'attendance.missing_clock_out_detected',
          event_version: '1.0',
          event_timestamp: new Date(),
          actor: {
            id: 'absensi_agent',
            type: 'agent',
          },
          entity: {
            id: today.toISOString(),
            type: 'attendance_summary',
          },
          payload: {
            date: today.toISOString(),
            count: missingClockOuts.length,
            employees: missingClockOuts.map((r) => ({
              employee_id: r.employee.id,
              employee_name: r.employee.full_name,
              clock_in_time: r.clock_in_time?.toISOString(),
            })),
          },
        };

        await this.eventBusService.emit(missingClockOutEvent);
      } else {
        this.logger.log('No missing clock-outs found');
      }
    } catch (error) {
      this.logger.error(
        `Failed to check missing clock-outs: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Scheduled task: Generate daily attendance summary
   * 
   * Runs at 7 PM daily to generate end-of-day attendance summary
   * Provides data for Late_Report_Agent and Weekly_Checkin_Agent
   * 
   * Requirement 2.8: Provide attendance data to Weekly_Checkin_Agent
   */
  @Cron('0 19 * * 1-5') // 7 PM, Monday to Friday
  async generateDailyAttendanceSummary(): Promise<void> {
    this.logger.log('Generating daily attendance summary');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const status = await this.getRealtimeAttendanceStatus(today);

      // Emit daily summary event
      const summaryEvent: TaraEvent = {
        event_id: undefined,
        event_type: 'attendance.daily_summary',
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: 'absensi_agent',
          type: 'agent',
        },
        entity: {
          id: status.date,
          type: 'attendance_summary',
        },
        payload: {
          date: status.date,
          summary: {
            total_employees: status.total_employees,
            clocked_in: status.clocked_in,
            clocked_out: status.clocked_out,
            tardy: status.tardy,
            absent: status.absent,
          },
          records: status.attendance_records,
        },
        metadata: {
          summary_type: 'daily',
          for_agents: ['late_report_agent', 'weekly_checkin_agent'],
        },
      };

      await this.eventBusService.emit(summaryEvent);

      this.logger.log(
        `Daily attendance summary generated: ${status.clocked_in}/${status.total_employees} attended, ` +
          `${status.tardy} tardy`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate daily attendance summary: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get attendance statistics for a date range
   * 
   * Useful for generating weekly/monthly reports
   * 
   * @param startDate - Start date
   * @param endDate - End date
   * @param employeeId - Optional employee filter
   * @returns Attendance statistics
   */
  async getAttendanceStatistics(
    startDate: Date,
    endDate: Date,
    employeeId?: string,
  ): Promise<{
    period: { start: string; end: string };
    total_days: number;
    present_days: number;
    tardy_days: number;
    absent_days: number;
    attendance_rate: number;
    punctuality_rate: number;
  }> {
    this.logger.log(
      `Fetching attendance statistics from ${startDate.toDateString()} to ${endDate.toDateString()}`,
    );

    try {
      const where: any = {
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (employeeId) {
        where.employee_id = employeeId;
      }

      const attendanceRecords = await this.prisma.attendance.findMany({
        where,
      });

      // Calculate working days in period (excluding weekends)
      const totalDays = this.calculateWorkingDays(startDate, endDate);
      const presentDays = attendanceRecords.filter(
        (r) => r.clock_in_time !== null,
      ).length;
      const tardyDays = attendanceRecords.filter((r) => r.is_tardy === true)
        .length;
      const absentDays = totalDays - presentDays;

      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      const punctualityRate =
        presentDays > 0 ? ((presentDays - tardyDays) / presentDays) * 100 : 0;

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        total_days: totalDays,
        present_days: presentDays,
        tardy_days: tardyDays,
        absent_days: absentDays,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        punctuality_rate: Math.round(punctualityRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate attendance statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate working days (excluding weekends) in a date range
   * 
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Number of working days
   */
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Get agent health status
   * 
   * Provides health check information for monitoring dashboard
   * 
   * @returns Agent health status
   */
  async getHealthStatus(): Promise<{
    agent_name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_check: string;
    metrics: {
      total_clock_ins_today: number;
      total_clock_outs_today: number;
      tardy_today: number;
      events_emitted_today: number;
    };
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendanceRecords = await this.prisma.attendance.findMany({
        where: {
          attendance_date: today,
        },
      });

      const clockIns = attendanceRecords.filter((r) => r.clock_in_time !== null)
        .length;
      const clockOuts = attendanceRecords.filter(
        (r) => r.clock_out_time !== null,
      ).length;
      const tardy = attendanceRecords.filter((r) => r.is_tardy === true).length;

      // Count events emitted today
      const eventsToday = await this.prisma.eventBusLog.count({
        where: {
          event_timestamp: {
            gte: today,
          },
          actor_id: 'absensi_agent',
        },
      });

      return {
        agent_name: 'Absensi_Agent',
        status: 'healthy',
        last_check: new Date().toISOString(),
        metrics: {
          total_clock_ins_today: clockIns,
          total_clock_outs_today: clockOuts,
          tardy_today: tardy,
          events_emitted_today: eventsToday,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get health status: ${error.message}`,
        error.stack,
      );

      return {
        agent_name: 'Absensi_Agent',
        status: 'unhealthy',
        last_check: new Date().toISOString(),
        metrics: {
          total_clock_ins_today: 0,
          total_clock_outs_today: 0,
          tardy_today: 0,
          events_emitted_today: 0,
        },
      };
    }
  }
}
