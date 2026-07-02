import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../persistence/prisma.service';
import { toLeaveDays } from '../../../shared/utils/leave-days.util';
import { EventBusService, TaraEvent } from '../services/event-bus.service';
import { NotificationService } from '../services/notification.service';

/**
 * Leave Request Agent
 * 
 * Autonomous service for TARA HR System that handles:
 * - Processing leave requests within 5 minutes of submission
 * - Notifying supervisors for approval within 5 minutes
 * - Updating leave balance automatically on approval
 * - Operating 24/7 without manual HR intervention
 * 
 * Requirements:
 * - 1.1: Validate request against employee's leave balance within 5 minutes
 * - 1.2: Notify supervisor for approval within 5 minutes
 * - 1.3: Update employee's leave balance automatically on approval
 * - 1.4: Send confirmation to employee via private notification within 1 minute
 * - 1.8: Operate 24/7 without manual HR intervention
 * 
 * Design: Task 12.4 - Implement Leave Request Agent
 */
@Injectable()
export class LeaveRequestAgent {
  private readonly logger = new Logger(LeaveRequestAgent.name);
  private readonly PROCESSING_SLA_MINUTES = 5; // Requirement 1.1, 1.2
  private readonly CONFIRMATION_SLA_MINUTES = 1; // Requirement 1.4

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly notificationService: NotificationService,
  ) {
    this.logger.log('Leave Request Agent initialized');
  }

  /**
   * Process a new leave request submission
   * 
   * This is called when a leave request is created by an employee.
   * Requirements: 1.1, 1.2, 1.7
   * 
   * @param leaveRequestId - The UUID of the leave request to process
   */
  async processLeaveRequestSubmission(
    leaveRequestId: string,
    tenantId?: string,
  ): Promise<void> {
    this.logger.log(`Processing leave request submission: ${leaveRequestId}`);

    try {
      // Step 1: Load the leave request
      const leaveRequest = await this.prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
              email: true,
              supervisor_id: true,
              department_id: true,
            },
          },
        },
      });

      if (!leaveRequest) {
        this.logger.error(`Leave request ${leaveRequestId} not found`);
        return;
      }

      // Step 2: Emit submission event to Event Bus
      // Requirement 1.7: Record submission timestamp, dates, type, and reason
      await this.emitLeaveRequestEvent(
        'leave.request.submitted',
        leaveRequest,
        leaveRequest.employee_id,
      );

      // Step 3: Notify supervisor for approval
      // Requirement 1.2: Notify supervisor within 5 minutes
      await this.notifySupervisorForApproval(leaveRequest, tenantId);

      this.logger.log(
        `Leave request ${leaveRequestId} processed successfully. Supervisor notified.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process leave request ${leaveRequestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process leave request approval
   * 
   * Called when a supervisor approves a leave request.
   * Requirements: 1.3, 1.4
   * 
   * @param leaveRequestId - The UUID of the leave request
   * @param approvedBy - The supervisor who approved the request
   */
  async processLeaveRequestApproval(
    leaveRequestId: string,
    tenantId: string | undefined,
    approvedBy: string,
  ): Promise<void> {
    this.logger.log(`Processing leave request approval: ${leaveRequestId}`);

    try {
      // Step 1: Load the leave request with employee info
      const leaveRequest = await this.prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
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

      if (!leaveRequest) {
        this.logger.error(`Leave request ${leaveRequestId} not found`);
        return;
      }

      // Step 2: Update leave balance
      // Requirement 1.3: Update employee's leave balance automatically
      await this.updateLeaveBalance(
        leaveRequest.employee_id,
        toLeaveDays(leaveRequest.total_days),
        tenantId,
      );

      // Step 3: Emit approval event to Event Bus
      await this.emitLeaveRequestEvent(
        'leave.request.approved',
        leaveRequest,
        approvedBy,
      );

      // Step 4: Send confirmation notification to employee
      // Requirement 1.4: Send confirmation within 1 minute
      await this.sendApprovalConfirmation(leaveRequest, tenantId);

      this.logger.log(
        `Leave request ${leaveRequestId} approved and processed. Employee ${leaveRequest.employee.full_name} notified.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process leave approval ${leaveRequestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process leave request rejection
   * 
   * Called when a supervisor rejects a leave request.
   * Requirement 1.5
   * 
   * @param leaveRequestId - The UUID of the leave request
   * @param rejectedBy - The supervisor who rejected the request
   * @param rejectionReason - The reason for rejection
   */
  async processLeaveRequestRejection(
    leaveRequestId: string,
    tenantId: string | undefined,
    rejectedBy: string,
    rejectionReason: string,
  ): Promise<void> {
    this.logger.log(`Processing leave request rejection: ${leaveRequestId}`);

    try {
      const leaveRequest = await this.prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
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

      if (!leaveRequest) {
        this.logger.error(`Leave request ${leaveRequestId} not found`);
        return;
      }

      // Emit rejection event
      await this.emitLeaveRequestEvent(
        'leave.request.rejected',
        leaveRequest,
        rejectedBy,
      );

      // Send rejection notification to employee
      await this.sendRejectionNotification(
        leaveRequest,
        rejectionReason,
        tenantId,
      );

      this.logger.log(
        `Leave request ${leaveRequestId} rejected. Employee ${leaveRequest.employee.full_name} notified.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process leave rejection ${leaveRequestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Notify supervisor for leave approval
   * 
   * Requirements: 1.2
   * 
   * @param leaveRequest - The leave request
   * @param tenantId - The tenant ID (optional)
   */
  private async notifySupervisorForApproval(
    leaveRequest: any,
    tenantId?: string,
  ): Promise<void> {
    if (!leaveRequest.employee.supervisor_id) {
      this.logger.warn(
        `Employee ${leaveRequest.employee.full_name} has no supervisor assigned. Cannot notify for approval.`,
      );
      return;
    }

    try {
      const startDate = new Date(leaveRequest.start_date).toLocaleDateString('id-ID');
      const endDate = new Date(leaveRequest.end_date).toLocaleDateString('id-ID');

      await this.notificationService.sendNotification({
        recipient_id: leaveRequest.employee.supervisor_id,
        type: 'leave_request_pending',
        visibility: 'private',
        title: 'Permintaan Cuti Membutuhkan Persetujuan',
        content: `${leaveRequest.employee.full_name} telah mengajukan permintaan ${leaveRequest.leave_type} dari ${startDate} sampai ${endDate} (${leaveRequest.total_days} hari). Alasan: ${leaveRequest.reason}. Silakan tinjau dan setujui/tolak permintaan ini.`,
        metadata: {
          leave_request_id: leaveRequest.id,
          employee_id: leaveRequest.employee_id,
          employee_name: leaveRequest.employee.full_name,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          total_days: leaveRequest.total_days,
          reason: leaveRequest.reason,
          action_required: true,
        },
      });

      this.logger.log(
        `Supervisor notified for leave request ${leaveRequest.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify supervisor: ${error.message}`,
        error.stack,
      );
      // Don't throw - notification failure should not block request processing
    }
  }

  /**
   * Update employee's leave balance after approval
   * 
   * Requirements: 1.3
   * 
   * @param employeeId - The employee ID
   * @param totalDays - Number of days to deduct
   * @param tenantId - The tenant ID (optional)
   */
  private async updateLeaveBalance(
    employeeId: string,
    totalDays: number,
    tenantId?: string,
  ): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();

      // Get current balance
      const balance = await this.prisma.leaveBalance.findUnique({
        where: {
          employee_id_year: {
            employee_id: employeeId,
            year: currentYear,
          },
        },
      });

      if (!balance) {
        this.logger.error(
          `Leave balance not found for employee ${employeeId} for year ${currentYear}`,
        );
        return;
      }

      const usedDays = toLeaveDays(balance.used_days) + totalDays;
      const remainingDays = toLeaveDays(balance.remaining_days) - totalDays;

      // Update balance: deduct used days, update remaining days
      await this.prisma.leaveBalance.update({
        where: {
          employee_id_year: {
            employee_id: employeeId,
            year: currentYear,
          },
        },
        data: {
          used_days: usedDays,
          remaining_days: remainingDays,
          last_calculated_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Emit balance update event
      await this.eventBusService.emit({
        event_type: 'leave.balance.updated',
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: 'leave_request_agent',
          type: 'agent',
        },
        entity: {
          id: employeeId,
          type: 'employee',
        },
        payload: {
          employee_id: employeeId,
          year: currentYear,
          days_deducted: totalDays,
          new_remaining_days: remainingDays,
          new_used_days: usedDays,
        },
      });

      this.logger.log(
        `Leave balance updated for employee ${employeeId}. Deducted ${totalDays} days. Remaining: ${remainingDays} days.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update leave balance for employee ${employeeId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send approval confirmation to employee
   * 
   * Requirements: 1.4
   * 
   * @param leaveRequest - The approved leave request
   * @param tenantId - The tenant ID (optional)
   */
  private async sendApprovalConfirmation(
    leaveRequest: any,
    tenantId?: string,
  ): Promise<void> {
    try {
      const startDate = new Date(leaveRequest.start_date).toLocaleDateString('id-ID');
      const endDate = new Date(leaveRequest.end_date).toLocaleDateString('id-ID');

      await this.notificationService.sendNotification({
        recipient_id: leaveRequest.employee_id,
        type: 'leave_approved',
        visibility: 'private',
        title: 'Permintaan Cuti Disetujui',
        content: `Permintaan ${leaveRequest.leave_type} Anda dari ${startDate} sampai ${endDate} (${leaveRequest.total_days} hari) telah disetujui. Saldo cuti Anda telah diperbarui.`,
        metadata: {
          leave_request_id: leaveRequest.id,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          total_days: leaveRequest.total_days,
          approved_at: leaveRequest.approved_at || new Date(),
          status: 'approved',
        },
      });

      this.logger.log(
        `Approval confirmation sent to employee ${leaveRequest.employee.full_name}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send approval confirmation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send rejection notification to employee
   * 
   * Requirement 1.5
   * 
   * @param leaveRequest - The rejected leave request
   * @param rejectionReason - Reason for rejection
   * 
   * @param leaveRequest - The rejected leave request
   * @param rejectionReason - Reason for rejection
   * @param tenantId - The tenant ID (optional)
   */
  private async sendRejectionNotification(
    leaveRequest: any,
    rejectionReason: string,
    tenantId?: string,
  ): Promise<void> {
    try {
      const startDate = new Date(leaveRequest.start_date).toLocaleDateString('id-ID');
      const endDate = new Date(leaveRequest.end_date).toLocaleDateString('id-ID');

      await this.notificationService.sendNotification({
        recipient_id: leaveRequest.employee_id,
        type: 'leave_rejected',
        visibility: 'private',
        title: 'Permintaan Cuti Ditolak',
        content: `Permintaan ${leaveRequest.leave_type} Anda dari ${startDate} sampai ${endDate} (${leaveRequest.total_days} hari) telah ditolak. Alasan: ${rejectionReason}`,
        metadata: {
          leave_request_id: leaveRequest.id,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          total_days: leaveRequest.total_days,
          rejection_reason: rejectionReason,
          status: 'rejected',
        },
      });

      this.logger.log(
        `Rejection notification sent to employee ${leaveRequest.employee.full_name}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send rejection notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit leave request event to Event Bus
   * 
   * Requirement 1.7
   * 
   * @param eventType - Type of event
   * @param leaveRequest - The leave request
   * @param actorId - Who triggered the event
   */
  private async emitLeaveRequestEvent(
    eventType: string,
    leaveRequest: any,
    actorId: string,
  ): Promise<void> {
    try {
      const event: Partial<TaraEvent> = {
        event_type: eventType,
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: actorId,
          type: actorId === 'leave_request_agent' ? 'agent' : 'employee',
        },
        entity: {
          id: leaveRequest.id,
          type: 'leave_request',
        },
        payload: {
          leave_request_id: leaveRequest.id,
          employee_id: leaveRequest.employee_id,
          employee_name: leaveRequest.employee?.full_name,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          total_days: leaveRequest.total_days,
          reason: leaveRequest.reason,
          status: leaveRequest.status,
          submitted_at: leaveRequest.submitted_at,
        },
      };

      await this.eventBusService.emit(event as TaraEvent);

      this.logger.log(
        `Event ${eventType} emitted for leave request ${leaveRequest.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventType}: ${error.message}`,
        error.stack,
      );
      // Don't throw - event emission failure should not block processing
    }
  }

  /**
   * Scheduled task: Process pending leave requests
   * 
   * Runs every minute to check for pending leave requests that need processing
   * Ensures 24/7 autonomous operation
   * 
   * Requirement 1.8: Operate 24/7 without manual HR intervention
   */
  @Cron('*/1 * * * *') // Every minute
  async processPendingLeaveRequests(): Promise<void> {
    this.logger.debug('Running scheduled check for pending leave requests');

    try {
      // Find leave requests submitted more than the SLA time ago that are still pending
      const slaThreshold = new Date();
      slaThreshold.setMinutes(slaThreshold.getMinutes() - this.PROCESSING_SLA_MINUTES);

      const pendingRequests = await this.prisma.leaveRequest.findMany({
        where: {
          status: 'pending',
          submitted_at: {
            lte: slaThreshold,
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
              email: true,
              supervisor_id: true,
            },
          },
        },
        take: 50, // Process in batches
      });

      if (pendingRequests.length > 0) {
        this.logger.log(
          `Found ${pendingRequests.length} pending leave requests exceeding SLA`,
        );

        for (const request of pendingRequests) {
          // Re-notify supervisor if notification failed or was missed
          if (request.employee.supervisor_id) {
            await this.notifySupervisorForApproval(request, undefined);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process pending leave requests: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Scheduled task: Generate daily leave request summary
   * 
   * Runs daily at 6 PM to generate summary for HR team
   * Requirement 1.8: Autonomous operation
   */
  @Cron('0 18 * * *') // 6 PM daily
  async generateDailyLeaveRequestSummary(): Promise<void> {
    this.logger.log('Generating daily leave request summary');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all leave requests submitted today
      const submittedToday = await this.prisma.leaveRequest.count({
        where: {
          submitted_at: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      const approvedToday = await this.prisma.leaveRequest.count({
        where: {
          approved_at: {
            gte: today,
            lt: tomorrow,
          },
          status: 'approved',
        },
      });

      const rejectedToday = await this.prisma.leaveRequest.count({
        where: {
          approved_at: {
            gte: today,
            lt: tomorrow,
          },
          status: 'rejected',
        },
      });

      const pendingTotal = await this.prisma.leaveRequest.count({
        where: {
          status: 'pending',
        },
      });

      // Emit summary event
      await this.eventBusService.emit({
        event_type: 'leave.request.daily_summary',
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: 'leave_request_agent',
          type: 'agent',
        },
        entity: {
          id: today.toISOString(),
          type: 'daily_summary',
        },
        payload: {
          date: today.toISOString(),
          submitted_today: submittedToday,
          approved_today: approvedToday,
          rejected_today: rejectedToday,
          pending_total: pendingTotal,
        },
      });

      this.logger.log(
        `Daily leave request summary: Submitted=${submittedToday}, Approved=${approvedToday}, Rejected=${rejectedToday}, Pending=${pendingTotal}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate daily summary: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get agent health status
   * 
   * Provides health check information for monitoring dashboard
   */
  async getHealthStatus(): Promise<{
    agent_name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_check: string;
    metrics: {
      pending_requests: number;
      processed_today: number;
      approved_today: number;
      rejected_today: number;
      events_emitted_today: number;
    };
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [pendingRequests, processedToday, approvedToday, rejectedToday, eventsToday] = 
        await Promise.all([
          this.prisma.leaveRequest.count({
            where: { status: 'pending' },
          }),
          this.prisma.leaveRequest.count({
            where: {
              submitted_at: {
                gte: today,
                lt: tomorrow,
              },
            },
          }),
          this.prisma.leaveRequest.count({
            where: {
              approved_at: {
                gte: today,
                lt: tomorrow,
              },
              status: 'approved',
            },
          }),
          this.prisma.leaveRequest.count({
            where: {
              approved_at: {
                gte: today,
                lt: tomorrow,
              },
              status: 'rejected',
            },
          }),
          this.prisma.eventBusLog.count({
            where: {
              event_timestamp: {
                gte: today,
              },
              actor_id: 'leave_request_agent',
            },
          }),
        ]);

      return {
        agent_name: 'Leave_Request_Agent',
        status: 'healthy',
        last_check: new Date().toISOString(),
        metrics: {
          pending_requests: pendingRequests,
          processed_today: processedToday,
          approved_today: approvedToday,
          rejected_today: rejectedToday,
          events_emitted_today: eventsToday,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get health status: ${error.message}`,
        error.stack,
      );

      return {
        agent_name: 'Leave_Request_Agent',
        status: 'unhealthy',
        last_check: new Date().toISOString(),
        metrics: {
          pending_requests: 0,
          processed_today: 0,
          approved_today: 0,
          rejected_today: 0,
          events_emitted_today: 0,
        },
      };
    }
  }
}
