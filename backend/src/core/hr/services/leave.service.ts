import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from './event-bus.service';
import { NotificationService } from './notification.service';
import { LeaveRequestAgent } from '../agents/leave-request.agent';
import { CacheAsideService } from '../../../shared/cache/cache-aside.service';
import {
  assertValidLeaveDays,
  formatLeaveDays,
  toLeaveDays,
} from '../../../shared/utils/leave-days.util';

/**
 * LeaveService for TARA HR System
 * 
 * Handles leave request submission with:
 * - Total days calculation excluding weekends and public holidays
 * - Leave balance validation
 * - Event emission for leave request lifecycle
 * - Integration with Leave Request Agent for autonomous processing
 * 
 * Requirements: 1.1, 1.5, 1.7, 1.8
 * Task: 12.1, 12.4
 */
@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly leaveRequestAgent: LeaveRequestAgent,
    private readonly cacheAside: CacheAsideService,
  ) {}

  /**
   * Submit a leave request with balance validation and total days calculation
   * 
   * Requirements:
   * - 1.1: Validate leave request against employee's leave balance within 5 minutes
   * - 1.5: Reject request if it exceeds employee's leave balance
   * - 1.7: Record submission timestamp, requested dates, leave type, and reason
   * 
   * @param employee_id - ID of the employee submitting the request
   * @param leave_type - Type of leave (annual, sick, emergency)
   * @param start_date - Start date of leave period
   * @param end_date - End date of leave period
   * @param reason - Reason for leave request
   * @returns Created leave request with pending status
   * @throws BadRequestException if balance is insufficient or dates are invalid
   */
  async submitLeaveRequest(data: {
    employee_id: string;
    leave_type: string;
    start_date: Date;
    end_date: Date;
    reason?: string;
    half_day?: boolean;
    total_days?: number;
  }): Promise<any> {
    const { employee_id, leave_type, start_date, end_date, reason, half_day, total_days: totalDaysOverride } = data;

    this.logger.log(
      `Processing leave request submission for employee ${employee_id}: ${leave_type} from ${start_date.toISOString()} to ${end_date.toISOString()}`,
    );

    // Validate dates
    if (start_date > end_date) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    // Calculate total days excluding weekends and public holidays
    let total_days: number;
    if (totalDaysOverride !== undefined) {
      total_days = toLeaveDays(totalDaysOverride);
      try {
        assertValidLeaveDays(total_days);
      } catch (err: any) {
        throw new BadRequestException(err.message);
      }
    } else if (
      half_day &&
      start_date.toDateString() === end_date.toDateString()
    ) {
      total_days = await this.calculateTotalDays(start_date, end_date, {
        half_day: true,
      });
    } else {
      total_days = await this.calculateTotalDays(start_date, end_date);
    }

    if (total_days <= 0) {
      throw new BadRequestException(
        'Leave request must span at least one working day (weekends and public holidays excluded)',
      );
    }

    this.logger.log(`Calculated total working days: ${total_days}`);

    // Validate against employee's current leave balance
    const currentYear = new Date().getFullYear();
    const leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employee_id_year: {
          employee_id,
          year: currentYear,
        },
      },
    });

    // Edge case: No balance record found
    if (!leaveBalance) {
      this.logger.error(
        `No leave balance record found for employee ${employee_id} in year ${currentYear}`,
      );

      // Send rejection notification with balance information
      await this.sendBalanceRejectionNotification(
        employee_id,
        total_days,
        null, // No balance record exists
      );

      throw new BadRequestException(
        `No leave balance found for employee ${employee_id} in year ${currentYear}. Please contact HR to set up your leave entitlement.`,
      );
    }

    const remaining = toLeaveDays(leaveBalance.remaining_days);

    // Edge case: Zero days remaining
    if (remaining <= 0) {
      this.logger.warn(
        `Employee ${employee_id} has zero remaining leave days`,
      );

      // Send rejection notification with balance information
      await this.sendBalanceRejectionNotification(
        employee_id,
        total_days,
        leaveBalance,
      );

      throw new BadRequestException(
        `You have no remaining leave days. Requested: ${formatLeaveDays(total_days)} days, Available: 0 days. Total entitlement: ${formatLeaveDays(leaveBalance.total_entitlement)} days, Used: ${formatLeaveDays(leaveBalance.used_days)} days.`,
      );
    }

    // Check if employee has sufficient balance
    if (remaining < total_days) {
      this.logger.warn(
        `Insufficient leave balance for employee ${employee_id}: requested ${total_days} days, available ${remaining} days`,
      );

      // Send rejection notification with balance information
      await this.sendBalanceRejectionNotification(
        employee_id,
        total_days,
        leaveBalance,
      );

      throw new BadRequestException(
        `Insufficient leave balance. Requested: ${formatLeaveDays(total_days)} days, Available: ${formatLeaveDays(remaining)} days. Total entitlement: ${formatLeaveDays(leaveBalance.total_entitlement)} days, Used: ${formatLeaveDays(leaveBalance.used_days)} days.`,
      );
    }

    // Create leave request with status='pending' and record submission timestamp
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        employee_id,
        leave_type,
        start_date,
        end_date,
        total_days,
        reason: reason || null,
        status: 'pending',
        submitted_at: new Date(), // Record submission timestamp
      },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            full_name: true,
            email: true,
            department_id: true,
          },
        },
      },
    });

    this.logger.log(
      `Leave request created successfully: ID ${leaveRequest.id}, Status: ${leaveRequest.status}`,
    );

    // Emit event to Event Bus for Leave Request Agent processing
    try {
      await this.eventBusService.emit({
        event_type: 'leave.request.submitted',
        event_version: '1.0',
        actor: {
          id: employee_id,
          type: 'employee',
        },
        entity: {
          id: leaveRequest.id,
          type: 'leave_request',
        },
        payload: {
          employee_id: leaveRequest.employee_id,
          employee_name: leaveRequest.employee.full_name,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date.toISOString(),
          end_date: leaveRequest.end_date.toISOString(),
          total_days: leaveRequest.total_days,
          reason: leaveRequest.reason,
          status: leaveRequest.status,
          submitted_at: leaveRequest.submitted_at.toISOString(),
          remaining_balance: toLeaveDays(leaveBalance.remaining_days) - total_days,
        },
        metadata: {
          department_id: leaveRequest.employee.department_id,
          current_balance: toLeaveDays(leaveBalance.remaining_days),
        },
      });

      this.logger.log(
        `Event emitted: leave.request.submitted for leave request ${leaveRequest.id}`,
      );
    } catch (error) {
      // Log error but don't fail the request - event can be retried
      this.logger.error(
        `Failed to emit leave.request.submitted event: ${error.message}`,
        error.stack,
      );
    }

    // Call Leave Request Agent to process the submission asynchronously
    // Requirements: 1.1, 1.2, 1.8 - Agent processes within 5 minutes and operates 24/7
    setImmediate(async () => {
      try {
        await this.leaveRequestAgent.processLeaveRequestSubmission(
          leaveRequest.id,
          undefined,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process leave request ${leaveRequest.id} via agent: ${error.message}`,
          error.stack,
        );
      }
    });

    return leaveRequest;
  }

  /**
   * Calculate total working days excluding weekends and public holidays
   * 
   * Requirements:
   * - 1.7: Calculate total_days excluding weekends and public holidays
   * 
   * @param start_date - Start date of leave period
   * @param end_date - End date of leave period (inclusive)
   * @returns Total number of working days
   */
  private async calculateTotalDays(
    start_date: Date,
    end_date: Date,
    options?: { half_day?: boolean },
  ): Promise<number> {
    // Fetch all active public holidays in the date range
    const publicHolidays = await this.prisma.publicHoliday.findMany({
      where: {
        is_active: true,
        holiday_date: {
          gte: start_date,
          lte: end_date,
        },
      },
    });

    // Create a set of holiday dates for quick lookup
    const holidayDates = new Set(
      publicHolidays.map(h => this.formatDate(h.holiday_date)),
    );

    let totalDays = 0;
    const currentDate = new Date(start_date);
    const endDateTime = new Date(end_date);
    const isSingleDay =
      start_date.toDateString() === end_date.toDateString();

    // Iterate through each day in the range
    while (currentDate <= endDateTime) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dateString = this.formatDate(currentDate);

      // Exclude weekends (Saturday = 6, Sunday = 0)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Exclude public holidays
      const isPublicHoliday = holidayDates.has(dateString);

      if (!isWeekend && !isPublicHoliday) {
        if (options?.half_day && isSingleDay) {
          totalDays += 0.5;
        } else {
          totalDays += 1;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.logger.debug(
      `Calculated ${totalDays} working days between ${start_date.toISOString()} and ${end_date.toISOString()} (excluding ${holidayDates.size} public holidays and weekends)`,
    );

    return totalDays;
  }

  /**
   * Format date to YYYY-MM-DD string for comparison
   * 
   * @param date - Date to format
   * @returns Date string in YYYY-MM-DD format
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get leave balance for an employee
   * 
   * @param employee_id - ID of the employee
   * @param year - Year for leave balance (defaults to current year)
   * @returns Leave balance or null if not found
   */
  async getLeaveBalance(
    employee_id: string,
    year?: number,
  ): Promise<any | null> {
    const targetYear = year || new Date().getFullYear();
    const cacheKey = CacheAsideService.leaveBalanceKey(employee_id, targetYear);

    return this.cacheAside.getOrSet(
      cacheKey,
      () =>
        this.prisma.leaveBalance.findUnique({
          where: {
            employee_id_year: {
              employee_id,
              year: targetYear,
            },
          },
        }),
      CacheAsideService.LEAVE_BALANCE_TTL,
    );
  }

  /**
   * Get leave requests for an employee
   * 
   * @param employee_id - ID of the employee
   * @param options - Optional filters (status, limit, offset)
   * @returns Array of leave requests
   */
  async getLeaveRequests(
    employee_id: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<any[]> {
    const where: any = { employee_id };

    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { submitted_at: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            full_name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });
  }

  /**
   * HR manual adjustment to an employee's leave balance for the current (or given) year.
   * Positive days_delta adds leave; negative subtracts. Recorded in leave_balance_adjustments.
   */
  async adjustLeaveBalance(data: {
    employee_id: string;
    days_delta: number;
    reason: string;
    adjusted_by: string;
    year?: number;
  }): Promise<{ balance: any; adjustment: any }> {
    const { employee_id, reason, adjusted_by } = data;
    const year = data.year ?? new Date().getFullYear();
    const days_delta = toLeaveDays(data.days_delta);

    if (!reason?.trim()) {
      throw new BadRequestException('Alasan penyesuaian wajib diisi');
    }
    if (days_delta === 0) {
      throw new BadRequestException('Jumlah hari penyesuaian tidak boleh 0');
    }
    try {
      assertValidLeaveDays(Math.abs(days_delta));
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employee_id },
      select: { id: true, employment_status: true, full_name: true },
    });
    if (!employee || employee.employment_status === 'deleted') {
      throw new BadRequestException('Karyawan tidak ditemukan');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let balance = await tx.leaveBalance.findUnique({
        where: { employee_id_year: { employee_id, year } },
      });

      if (!balance) {
        balance = await tx.leaveBalance.create({
          data: {
            employee_id,
            year,
            total_entitlement: 12,
            used_days: 0,
            remaining_days: 12,
          },
        });
      }

      const currentRemaining = toLeaveDays(balance.remaining_days);
      const newRemaining = toLeaveDays(currentRemaining + days_delta);
      if (newRemaining < 0) {
        throw new BadRequestException(
          `Saldo cuti tidak cukup untuk pengurangan ${formatLeaveDays(Math.abs(days_delta))} hari`,
        );
      }

      const currentEntitlement = toLeaveDays(balance.total_entitlement);
      const newEntitlement =
        days_delta > 0
          ? toLeaveDays(currentEntitlement + days_delta)
          : currentEntitlement;

      const updatedBalance = await tx.leaveBalance.update({
        where: { employee_id_year: { employee_id, year } },
        data: {
          remaining_days: newRemaining,
          total_entitlement: newEntitlement,
          last_calculated_at: new Date(),
        },
      });

      const adjustment = await tx.leaveBalanceAdjustment.create({
        data: {
          employee_id,
          year,
          days_delta,
          reason: reason.trim(),
          adjusted_by,
        },
        include: {
          adjuster: { select: { id: true, full_name: true } },
        },
      });

      return { balance: updatedBalance, adjustment };
    });

    await this.cacheAside.invalidate(
      CacheAsideService.leaveBalanceKey(employee_id, year),
    );

    try {
      await this.eventBusService.emit({
        event_type: 'leave.balance.adjusted',
        event_version: '1.0',
        actor: { id: adjusted_by, type: 'employee' },
        entity: { id: result.adjustment.id, type: 'leave_balance_adjustment' },
        payload: {
          employee_id,
          employee_name: employee.full_name,
          year,
          days_delta,
          reason: reason.trim(),
          remaining_days: result.balance.remaining_days,
          adjusted_by,
        },
        metadata: { source: 'hr_admin' },
      });
    } catch (err) {
      this.logger.warn(`Failed to emit leave.balance.adjusted: ${err}`);
    }

    this.logger.log(
      `Leave balance adjusted for ${employee_id}: ${days_delta > 0 ? '+' : ''}${formatLeaveDays(days_delta)} days (${reason.trim()})`,
    );

    return result;
  }

  async getLeaveAdjustments(
    employee_id: string,
    options?: { limit?: number },
  ): Promise<any[]> {
    return this.prisma.leaveBalanceAdjustment.findMany({
      where: { employee_id },
      orderBy: { created_at: 'desc' },
      take: options?.limit ?? 20,
      include: {
        adjuster: { select: { id: true, full_name: true } },
      },
    });
  }

  /**
   * Get a specific leave request by ID
   * 
   * @param request_id - ID of the leave request
   * @returns Leave request or null if not found
   */
  async getLeaveRequestById(request_id: string): Promise<any | null> {
    return this.prisma.leaveRequest.findUnique({
      where: { id: request_id },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            full_name: true,
            email: true,
            department_id: true,
          },
        },
        approver: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });
  }

  /**
   * Approve a leave request and update employee's leave balance
   * 
   * Requirements:
   * - 1.3: Update status to 'approved', set approved_at timestamp, update leave balance
   * - 1.4: Send confirmation notification to employee, emit event to Event Bus
   * 
   * @param leave_request_id - ID of the leave request to approve
   * @param approved_by - ID of the approver (supervisor or HR)
   * @returns Updated leave request
   * @throws BadRequestException if request not found, already processed, or balance update fails
   */
  async approveLeaveRequest(
    leave_request_id: string,
    approved_by: string,
  ): Promise<any> {
    this.logger.log(
      `Processing leave request approval: ${leave_request_id} by approver ${approved_by}`,
    );

    // Fetch the leave request with employee details
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: leave_request_id },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            full_name: true,
            email: true,
            department_id: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new BadRequestException(
        `Leave request not found: ${leave_request_id}`,
      );
    }

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        `Leave request ${leave_request_id} is already ${leaveRequest.status}`,
      );
    }

    const currentYear = new Date().getFullYear();

    // Use Prisma transaction to ensure atomic balance update
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Update leave balance: remaining_days -= total_days, used_days += total_days
        const updatedBalance = await tx.leaveBalance.update({
          where: {
            employee_id_year: {
              employee_id: leaveRequest.employee_id,
              year: currentYear,
            },
          },
          data: {
            remaining_days: {
              decrement: leaveRequest.total_days,
            },
            used_days: {
              increment: leaveRequest.total_days,
            },
            last_calculated_at: new Date(),
          },
        });

        // Update leave request status to 'approved'
        const updatedRequest = await tx.leaveRequest.update({
          where: { id: leave_request_id },
          data: {
            status: 'approved',
            approved_by,
            approved_at: new Date(),
          },
          include: {
            employee: {
              select: {
                id: true,
                employee_code: true,
                full_name: true,
                email: true,
                department_id: true,
              },
            },
            approver: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        });

        return { updatedRequest, updatedBalance };
      });

      this.logger.log(
        `Leave request ${leave_request_id} approved successfully. Balance updated: ${result.updatedBalance.remaining_days} days remaining`,
      );

      // Invalidate cached leave balance after approval changes the balance
      await this.cacheAside.invalidate(
        CacheAsideService.leaveBalanceKey(leaveRequest.employee_id, currentYear),
      );

      // Emit leave.request.approved event to Event Bus
      try {
        await this.eventBusService.emit({
          event_type: 'leave.request.approved',
          event_version: '1.0',
          actor: {
            id: approved_by,
            type: 'employee',
          },
          entity: {
            id: result.updatedRequest.id,
            type: 'leave_request',
          },
          payload: {
            leave_request_id: result.updatedRequest.id,
            employee_id: result.updatedRequest.employee_id,
            employee_name: result.updatedRequest.employee.full_name,
            leave_type: result.updatedRequest.leave_type,
            start_date: result.updatedRequest.start_date.toISOString(),
            end_date: result.updatedRequest.end_date.toISOString(),
            total_days: result.updatedRequest.total_days,
            approved_by,
            approver_name: result.updatedRequest.approver?.full_name || 'Unknown',
            approved_at: result.updatedRequest.approved_at?.toISOString() || new Date().toISOString(),
            remaining_balance: result.updatedBalance.remaining_days,
            used_days: result.updatedBalance.used_days,
          },
          metadata: {
            department_id: result.updatedRequest.employee.department_id,
            previous_balance:
              toLeaveDays(result.updatedBalance.remaining_days) +
              toLeaveDays(leaveRequest.total_days),
          },
        });

        this.logger.log(
          `Event emitted: leave.request.approved for leave request ${leave_request_id}`,
        );
      } catch (error) {
        // Log error but don't fail the approval - event can be retried
        this.logger.error(
          `Failed to emit leave.request.approved event: ${error.message}`,
          error.stack,
        );
      }

      // Send confirmation notification to employee (Requirement 1.4)
      try {
        const formattedStartDate = this.formatDate(result.updatedRequest.start_date);
        const formattedEndDate = this.formatDate(result.updatedRequest.end_date);
        const approverName = result.updatedRequest.approver?.full_name || 'Supervisor';

        await this.notificationService.sendNotification({
          recipient_id: result.updatedRequest.employee_id,
          type: 'leave_approval',
          visibility: 'private',
          title: '✅ Leave Request Approved',
          content: `Dear ${result.updatedRequest.employee.full_name},\n\n` +
            `Your leave request has been approved!\n\n` +
            `**Leave Details:**\n` +
            `• Leave Type: ${result.updatedRequest.leave_type}\n` +
            `• Start Date: ${formattedStartDate}\n` +
            `• End Date: ${formattedEndDate}\n` +
            `• Total Days: ${result.updatedRequest.total_days} day(s)\n` +
            `• Approved By: ${approverName}\n` +
            `• Approved At: ${result.updatedRequest.approved_at?.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
            `**Updated Leave Balance:**\n` +
            `• Remaining Days: ${result.updatedBalance.remaining_days}\n` +
            `• Used Days: ${result.updatedBalance.used_days}\n` +
            `• Total Entitlement: ${result.updatedBalance.total_entitlement} days\n\n` +
            `Thank you.`,
          metadata: {
            leave_request_id: result.updatedRequest.id,
            leave_type: result.updatedRequest.leave_type,
            start_date: result.updatedRequest.start_date.toISOString(),
            end_date: result.updatedRequest.end_date.toISOString(),
            total_days: result.updatedRequest.total_days,
            approved_by,
            approver_name: approverName,
            approved_at: result.updatedRequest.approved_at?.toISOString() || new Date().toISOString(),
            remaining_balance: result.updatedBalance.remaining_days,
            used_days: result.updatedBalance.used_days,
            total_entitlement: result.updatedBalance.total_entitlement,
          },
        });

        this.logger.log(
          `Approval confirmation notification sent to employee ${result.updatedRequest.employee_id}`,
        );
      } catch (error) {
        // Log error but don't fail the approval - notification can be retried
        this.logger.error(
          `Failed to send approval confirmation notification to employee ${result.updatedRequest.employee_id}: ${error.message}`,
          error.stack,
        );
      }

      // Call Leave Request Agent to process the approval asynchronously
      // Requirements: 1.3, 1.4 - Update balance automatically and send confirmation within 1 minute
      setImmediate(async () => {
        try {
          await this.leaveRequestAgent.processLeaveRequestApproval(
            leave_request_id,
            undefined,
            approved_by,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process leave approval ${leave_request_id} via agent: ${error.message}`,
            error.stack,
          );
        }
      });

      return result.updatedRequest;
    } catch (error) {
      this.logger.error(
        `Failed to approve leave request ${leave_request_id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to approve leave request: ${error.message}`,
      );
    }
  }

  /**
   * Reject a leave request with a reason
   * 
   * Requirements:
   * - 1.5: Reject request with reason and notify employee
   * 
   * @param leave_request_id - ID of the leave request to reject
   * @param rejected_by - ID of the rejector (supervisor or HR)
   * @param rejection_reason - Reason for rejection
   * @returns Updated leave request
   * @throws BadRequestException if request not found or already processed
   */
  async rejectLeaveRequest(
    leave_request_id: string,
    rejected_by: string,
    rejection_reason: string,
  ): Promise<any> {
    this.logger.log(
      `Processing leave request rejection: ${leave_request_id} by ${rejected_by}`,
    );

    // Fetch the leave request with employee details
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: leave_request_id },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            full_name: true,
            email: true,
            department_id: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new BadRequestException(
        `Leave request not found: ${leave_request_id}`,
      );
    }

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        `Leave request ${leave_request_id} is already ${leaveRequest.status}`,
      );
    }

    // Update leave request status to 'rejected'
    const updatedRequest = await this.prisma.leaveRequest.update({
      where: { id: leave_request_id },
      data: {
        status: 'rejected',
        approved_by: rejected_by, // Store who rejected it
        approved_at: new Date(), // Store when it was rejected
        rejection_reason,
      },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            full_name: true,
            email: true,
            department_id: true,
          },
        },
        approver: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    this.logger.log(
      `Leave request ${leave_request_id} rejected successfully. Reason: ${rejection_reason}`,
    );

    // Emit leave.request.rejected event to Event Bus
    try {
      await this.eventBusService.emit({
        event_type: 'leave.request.rejected',
        event_version: '1.0',
        actor: {
          id: rejected_by,
          type: 'employee',
        },
        entity: {
          id: updatedRequest.id,
          type: 'leave_request',
        },
        payload: {
          leave_request_id: updatedRequest.id,
          employee_id: updatedRequest.employee_id,
          employee_name: updatedRequest.employee.full_name,
          leave_type: updatedRequest.leave_type,
          start_date: updatedRequest.start_date.toISOString(),
          end_date: updatedRequest.end_date.toISOString(),
          total_days: updatedRequest.total_days,
          rejected_by,
          rejector_name: updatedRequest.approver?.full_name || 'Unknown',
          rejected_at: updatedRequest.approved_at?.toISOString() || new Date().toISOString(),
          rejection_reason,
        },
        metadata: {
          department_id: updatedRequest.employee.department_id,
        },
      });

      this.logger.log(
        `Event emitted: leave.request.rejected for leave request ${leave_request_id}`,
      );
    } catch (error) {
      // Log error but don't fail the rejection - event can be retried
      this.logger.error(
        `Failed to emit leave.request.rejected event: ${error.message}`,
        error.stack,
      );
    }

    // Call Leave Request Agent to process the rejection asynchronously
    // Requirements: 1.5 - Notify employee with rejection reason
    setImmediate(async () => {
      try {
        await this.leaveRequestAgent.processLeaveRequestRejection(
          leave_request_id,
          undefined,
          rejected_by,
          rejection_reason,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process leave rejection ${leave_request_id} via agent: ${error.message}`,
          error.stack,
        );
      }
    });

    return updatedRequest;
  }

  /**
   * Send rejection notification with balance information
   * 
   * Task 12.2 - Requirement 1.5: Include balance information in rejection notification
   * 
   * Handles edge cases:
   * - No balance record exists
   * - Zero days remaining
   * - Insufficient balance
   * 
   * @param employee_id - ID of the employee
   * @param requested_days - Number of days requested
   * @param leaveBalance - Leave balance record (null if no record exists)
   */
  private async sendBalanceRejectionNotification(
    employee_id: string,
    requested_days: number,
    leaveBalance: any | null,
  ): Promise<void> {
    try {
      // Get employee details for notification
      const employee = await this.prisma.employee.findUnique({
        where: { id: employee_id },
        select: { id: true, full_name: true },
      });

      if (!employee) {
        this.logger.error(
          `Cannot send rejection notification: Employee ${employee_id} not found`,
        );
        return;
      }

      let notificationContent: string;
      let notificationTitle: string;

      // Handle different rejection scenarios
      if (!leaveBalance) {
        // Edge case: No balance record
        notificationTitle = '❌ Leave Request Cannot Be Processed';
        notificationContent = `Dear ${employee.full_name},\n\n` +
          `Your leave request for ${requested_days} day(s) cannot be processed because ` +
          `no leave balance record exists for the current year.\n\n` +
          `**Action Required:** Please contact HR to set up your leave entitlement.\n\n` +
          `Thank you.`;
      } else if (leaveBalance.remaining_days === 0) {
        // Edge case: Zero remaining days
        notificationTitle = '❌ Leave Request Rejected - No Remaining Days';
        notificationContent = `Dear ${employee.full_name},\n\n` +
          `Your leave request for ${requested_days} day(s) has been rejected due to insufficient balance.\n\n` +
          `**Your Leave Balance:**\n` +
          `• Requested Days: ${requested_days}\n` +
          `• Available Days: 0\n` +
          `• Total Entitlement: ${leaveBalance.total_entitlement} days\n` +
          `• Used Days: ${leaveBalance.used_days} days\n` +
          `• Carryover Days: ${leaveBalance.carryover_days} days\n\n` +
          `You have used all your available leave days for this year.\n\n` +
          `Thank you.`;
      } else {
        // Normal case: Insufficient balance
        notificationTitle = '❌ Leave Request Rejected - Insufficient Balance';
        notificationContent = `Dear ${employee.full_name},\n\n` +
          `Your leave request for ${requested_days} day(s) has been rejected due to insufficient balance.\n\n` +
          `**Your Leave Balance:**\n` +
          `• Requested Days: ${requested_days}\n` +
          `• Available Days: ${leaveBalance.remaining_days}\n` +
          `• Total Entitlement: ${leaveBalance.total_entitlement} days\n` +
          `• Used Days: ${leaveBalance.used_days} days\n` +
          `• Carryover Days: ${leaveBalance.carryover_days} days\n\n` +
          `Please adjust your leave request to ${leaveBalance.remaining_days} day(s) or less.\n\n` +
          `Thank you.`;
      }

      // Send private notification to employee
      await this.notificationService.sendNotification({
        recipient_id: employee_id,
        type: 'leave_request_rejected',
        visibility: 'private',
        title: notificationTitle,
        content: notificationContent,
        metadata: {
          reason: 'insufficient_balance',
          requested_days: requested_days,
          available_days: leaveBalance?.remaining_days || 0,
          total_entitlement: leaveBalance?.total_entitlement || 0,
          used_days: leaveBalance?.used_days || 0,
          carryover_days: leaveBalance?.carryover_days || 0,
          year: leaveBalance?.year || new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Rejection notification sent to employee ${employee_id}: ` +
        `requested ${requested_days} days, available ${leaveBalance?.remaining_days || 0} days`,
      );
    } catch (error) {
      // Don't fail the rejection if notification fails - log error
      this.logger.error(
        `Failed to send rejection notification to employee ${employee_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
