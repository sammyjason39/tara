import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { NotificationService } from '../services/notification.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserRole } from '../../../shared/roles';

/**
 * TARA Leave Controller
 * 
 * Handles leave request submission, approval, and rejection for TARA HR System.
 * 
 * Endpoints:
 * - POST /tara/leave-requests - Submit a leave request
 * - PUT /tara/leave-requests/:id/approve - Approve a leave request
 * - PUT /tara/leave-requests/:id/reject - Reject a leave request
 * - GET /tara/leave-requests - Get leave requests
 * - GET /tara/leave-requests/:id - Get a specific leave request
 * - GET /tara/leave-balance/:employee_id - Get leave balance for an employee
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7
 * Task: 12.3
 */
@Controller('tara/leave-requests')
@UseGuards(RolesGuard)
export class TaraLeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Submit a new leave request
   * 
   * Requirements: 1.1, 1.5, 1.7
   * 
   * @param request - Express request with user context
   * @param body - Leave request data
   * @returns Created leave request
   */
  @Post()
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async submitLeaveRequest(
    @Request() request: any,
    @Body() body: {
      employee_id: string;
      leave_type: string;
      start_date: string;
      end_date: string;
      reason?: string;
      half_day?: boolean;
      total_days?: number;
    },
  ) {
    const { employee_id, leave_type, start_date, end_date, reason, half_day, total_days } = body;

    // Validate required fields
    if (!employee_id || !leave_type || !start_date || !end_date) {
      throw new BadRequestException(
        'Missing required fields: employee_id, leave_type, start_date, end_date',
      );
    }

    // Convert date strings to Date objects
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    try {
      const leaveRequest = await this.leaveService.submitLeaveRequest({
        employee_id,
        leave_type,
        start_date: startDate,
        end_date: endDate,
        reason,
        half_day,
        total_days,
      });

      return {
        success: true,
        message: 'Leave request submitted successfully',
        data: leaveRequest,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve a leave request
   * 
   * Requirements: 1.3, 1.4
   * 
   * @param request - Express request with user context
   * @param id - Leave request ID
   * @param body - Approval data
   * @returns Updated leave request
   */
  @Put(':id/approve')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveLeaveRequest(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: { approved_by: string },
  ) {
    const { approved_by } = body;

    if (!approved_by) {
      throw new BadRequestException('Missing required field: approved_by');
    }

    try {
      const leaveRequest = await this.leaveService.approveLeaveRequest(
        id,
        approved_by,
      );

      // Send confirmation notification to employee (Requirement 1.4)
      await this.notificationService.sendNotification({
        recipient_id: leaveRequest.employee_id,
        type: 'leave_approval',
        visibility: 'private',
        title: 'Leave Request Approved',
        content: `Your leave request for ${leaveRequest.total_days} day(s) from ${leaveRequest.start_date.toLocaleDateString()} to ${leaveRequest.end_date.toLocaleDateString()} has been approved by ${leaveRequest.approver?.full_name || 'your supervisor'}.`,
        metadata: {
          leave_request_id: leaveRequest.id,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date.toISOString(),
          end_date: leaveRequest.end_date.toISOString(),
          total_days: leaveRequest.total_days,
          approved_by: leaveRequest.approver?.full_name,
          approved_at: leaveRequest.approved_at.toISOString(),
        },
      });

      return {
        success: true,
        message: 'Leave request approved successfully',
        data: leaveRequest,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject a leave request
   * 
   * Requirements: 1.5
   * 
   * @param request - Express request with user context
   * @param id - Leave request ID
   * @param body - Rejection data
   * @returns Updated leave request
   */
  @Put(':id/reject')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectLeaveRequest(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: { rejected_by: string; rejection_reason: string },
  ) {
    const { rejected_by, rejection_reason } = body;

    if (!rejected_by || !rejection_reason) {
      throw new BadRequestException(
        'Missing required fields: rejected_by, rejection_reason',
      );
    }

    try {
      const leaveRequest = await this.leaveService.rejectLeaveRequest(
        id,
        rejected_by,
        rejection_reason,
      );

      // Send rejection notification to employee (Requirement 1.5)
      await this.notificationService.sendNotification({
        recipient_id: leaveRequest.employee_id,
        type: 'leave_rejection',
        visibility: 'private',
        title: 'Leave Request Rejected',
        content: `Your leave request for ${leaveRequest.total_days} day(s) from ${leaveRequest.start_date.toLocaleDateString()} to ${leaveRequest.end_date.toLocaleDateString()} has been rejected. Reason: ${rejection_reason}`,
        metadata: {
          leave_request_id: leaveRequest.id,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date.toISOString(),
          end_date: leaveRequest.end_date.toISOString(),
          total_days: leaveRequest.total_days,
          rejected_by: leaveRequest.approver?.full_name,
          rejection_reason,
        },
      });

      return {
        success: true,
        message: 'Leave request rejected successfully',
        data: leaveRequest,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leave requests for an employee
   * 
   * @param employee_id - Employee ID
   * @param status - Optional status filter
   * @param limit - Optional limit
   * @param offset - Optional offset
   * @returns Array of leave requests
   */
  @Get()
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getLeaveRequests(
    @Query('employee_id') employee_id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!employee_id) {
      throw new BadRequestException('Missing required query parameter: employee_id');
    }

    const leaveRequests = await this.leaveService.getLeaveRequests(
      employee_id,
      {
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );

    return {
      success: true,
      data: leaveRequests,
    };
  }

  /**
   * Get a specific leave request by ID
   * 
   * @param id - Leave request ID
   * @returns Leave request
   */
  @Get(':id')
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getLeaveRequestById(@Param('id') id: string) {
    const leaveRequest = await this.leaveService.getLeaveRequestById(id);

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request not found: ${id}`);
    }

    return {
      success: true,
      data: leaveRequest,
    };
  }

  /**
   * Get leave balance for an employee
   * 
   * @param employee_id - Employee ID
   * @param year - Optional year (defaults to current year)
   * @returns Leave balance
   */
  @Get('balance/:employee_id')
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getLeaveBalance(
    @Param('employee_id') employee_id: string,
    @Query('year') year?: string,
  ) {
    const leaveBalance = await this.leaveService.getLeaveBalance(
      employee_id,
      year ? parseInt(year, 10) : undefined,
    );

    if (!leaveBalance) {
      throw new NotFoundException(
        `Leave balance not found for employee: ${employee_id}`,
      );
    }

    return {
      success: true,
      data: leaveBalance,
    };
  }
}
