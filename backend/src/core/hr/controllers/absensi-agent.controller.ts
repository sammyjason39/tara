import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AbsensiAgent } from '../agents/absensi.agent';
import { TaraAttendanceService } from '../services/tara-attendance.service';

/**
 * Absensi Agent Controller
 * 
 * Exposes REST API endpoints for the Absensi Agent (Attendance Monitoring Agent)
 * 
 * Endpoints:
 * - POST /absensi-agent/clock-in - Record employee clock-in
 * - POST /absensi-agent/clock-out - Record employee clock-out
 * - GET /absensi-agent/status - Get real-time attendance status
 * - GET /absensi-agent/statistics - Get attendance statistics
 * - GET /absensi-agent/health - Get agent health status
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7
 */
@Controller('absensi-agent')
export class AbsensiAgentController {
  private readonly logger = new Logger(AbsensiAgentController.name);

  constructor(
    private readonly absensiAgent: AbsensiAgent,
    private readonly attendanceService: TaraAttendanceService,
  ) {}

  /**
   * Record employee clock-in
   * 
   * Requirements: 2.1, 2.3, 2.4, 2.7
   * 
   * @body clockInDto - Clock-in data
   * @returns Created attendance record
   */
  @Post('clock-in')
  @HttpCode(HttpStatus.CREATED)
  async clockIn(
    @Body()
    clockInDto: {
      employee_id: string;
      timestamp?: string; // ISO 8601 format, defaults to now
      gps_latitude: number;
      gps_longitude: number;
      biometric_verified: boolean;
      attendance_source?: 'phone' | 'aws_device';
      selfie_photo?: string;
    },
  ) {
    this.logger.log(`Clock-in request for employee ${clockInDto.employee_id}`);

    try {
      // Validate required fields
      if (!clockInDto.employee_id) {
        throw new BadRequestException('employee_id is required');
      }

      if (
        clockInDto.gps_latitude === undefined ||
        clockInDto.gps_longitude === undefined
      ) {
        throw new BadRequestException(
          'GPS coordinates (gps_latitude, gps_longitude) are required',
        );
      }

      if (clockInDto.biometric_verified === undefined) {
        throw new BadRequestException('biometric_verified is required');
      }

      const source = clockInDto.attendance_source || 'phone';
      if (source === 'phone' && !clockInDto.selfie_photo?.trim()) {
        throw new BadRequestException('Foto selfie wajib untuk absensi via HP');
      }

      // Parse timestamp or use current time
      const timestamp = clockInDto.timestamp
        ? new Date(clockInDto.timestamp)
        : new Date();

      // Validate timestamp
      if (isNaN(timestamp.getTime())) {
        throw new BadRequestException('Invalid timestamp format');
      }

      // Validate GPS coordinates
      if (
        clockInDto.gps_latitude < -90 ||
        clockInDto.gps_latitude > 90 ||
        clockInDto.gps_longitude < -180 ||
        clockInDto.gps_longitude > 180
      ) {
        throw new BadRequestException('Invalid GPS coordinates');
      }

      const result = await this.absensiAgent.processClockIn(
        clockInDto.employee_id,
        timestamp,
        clockInDto.gps_latitude,
        clockInDto.gps_longitude,
        clockInDto.biometric_verified,
        source,
        clockInDto.selfie_photo,
      );

      const monthlyTardiness = await this.attendanceService.getMonthlyTardinessSummary(
        clockInDto.employee_id,
      );

      const message = result.is_tardy
        ? `Clock-in tercatat. Anda terlambat ${result.tardiness_minutes} menit.`
        : 'Clock-in recorded successfully';

      return {
        success: true,
        message,
        data: {
          ...result,
          monthly_tardiness: monthlyTardiness,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to process clock-in for employee ${clockInDto.employee_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate GPS against office geofence before PIN / selfie step.
   */
  @Post('validate-geofence')
  @HttpCode(HttpStatus.OK)
  async validateGeofence(
    @Body()
    body: {
      employee_id: string;
      gps_latitude: number;
      gps_longitude: number;
    },
  ) {
    if (!body.employee_id) {
      throw new BadRequestException('employee_id is required');
    }
    if (
      body.gps_latitude === undefined ||
      body.gps_longitude === undefined
    ) {
      throw new BadRequestException(
        'GPS coordinates (gps_latitude, gps_longitude) are required',
      );
    }

    const result = await this.attendanceService.validateGeofenceForEmployee(
      body.employee_id,
      body.gps_latitude,
      body.gps_longitude,
    );

    return { success: true, data: result };
  }

  /**
   * Record employee clock-out
   * 
   * Requirements: 2.2, 2.7
   * 
   * @body clockOutDto - Clock-out data
   * @returns Updated attendance record
   */
  @Post('clock-out')
  @HttpCode(HttpStatus.OK)
  async clockOut(
    @Body()
    clockOutDto: {
      employee_id: string;
      timestamp?: string; // ISO 8601 format, defaults to now
      gps_latitude: number;
      gps_longitude: number;
      attendance_source?: 'phone' | 'aws_device';
      selfie_photo?: string;
    },
  ) {
    this.logger.log(`Clock-out request for employee ${clockOutDto.employee_id}`);

    try {
      // Validate required fields
      if (!clockOutDto.employee_id) {
        throw new BadRequestException('employee_id is required');
      }

      if (
        clockOutDto.gps_latitude === undefined ||
        clockOutDto.gps_longitude === undefined
      ) {
        throw new BadRequestException(
          'GPS coordinates (gps_latitude, gps_longitude) are required',
        );
      }

      const outSource = clockOutDto.attendance_source || 'phone';
      if (outSource === 'phone' && !clockOutDto.selfie_photo?.trim()) {
        throw new BadRequestException('Foto selfie wajib untuk absensi via HP');
      }

      // Parse timestamp or use current time
      const timestamp = clockOutDto.timestamp
        ? new Date(clockOutDto.timestamp)
        : new Date();

      // Validate timestamp
      if (isNaN(timestamp.getTime())) {
        throw new BadRequestException('Invalid timestamp format');
      }

      // Validate GPS coordinates
      if (
        clockOutDto.gps_latitude < -90 ||
        clockOutDto.gps_latitude > 90 ||
        clockOutDto.gps_longitude < -180 ||
        clockOutDto.gps_longitude > 180
      ) {
        throw new BadRequestException('Invalid GPS coordinates');
      }

      const result = await this.absensiAgent.processClockOut(
        clockOutDto.employee_id,
        timestamp,
        clockOutDto.gps_latitude,
        clockOutDto.gps_longitude,
        outSource,
        clockOutDto.selfie_photo,
      );

      return {
        success: true,
        message: 'Clock-out recorded successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process clock-out for employee ${clockOutDto.employee_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get real-time attendance status
   * 
   * Requirements: 2.5
   * 
   * @query date - Date to check (ISO 8601 format, defaults to today)
   * @returns Attendance status summary
   */
  @Get('status')
  async getStatus(
    @Query('date') dateStr?: string,
  ): Promise<{
    success: boolean;
    data: {
      date: string;
      total_employees: number;
      clocked_in: number;
      clocked_out: number;
      tardy: number;
      absent: number;
      attendance_records: any[];
    };
  }> {
    this.logger.log(`Getting real-time attendance status for date: ${dateStr || 'today'}`);

    try {
      const date = dateStr ? new Date(dateStr) : undefined;

      if (date && isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      const status = await this.absensiAgent.getRealtimeAttendanceStatus(date);

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get attendance status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get attendance statistics for a date range
   * 
   * @query start_date - Start date (ISO 8601 format, required)
   * @query end_date - End date (ISO 8601 format, required)
   * @query employee_id - Optional employee filter
   * @returns Attendance statistics
   */
  @Get('statistics')
  async getStatistics(
    @Query('start_date') startDateStr: string,
    @Query('end_date') endDateStr: string,
    @Query('employee_id') employeeId?: string,
  ): Promise<{
    success: boolean;
    data: {
      period: { start: string; end: string };
      total_days: number;
      present_days: number;
      tardy_days: number;
      absent_days: number;
      attendance_rate: number;
      punctuality_rate: number;
    };
  }> {
    this.logger.log(
      `Getting attendance statistics from ${startDateStr} to ${endDateStr}`,
    );

    try {
      if (!startDateStr || !endDateStr) {
        throw new BadRequestException('start_date and end_date are required');
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (startDate > endDate) {
        throw new BadRequestException('start_date must be before end_date');
      }

      const statistics = await this.absensiAgent.getAttendanceStatistics(
        startDate,
        endDate,
        employeeId,
      );

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get attendance statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get agent health status
   * 
   * Used by monitoring dashboard to check agent health
   * 
   * @returns Agent health status and metrics
   */
  @Get('health')
  async getHealth(): Promise<{
    success: boolean;
    data: {
      agent_name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      last_check: string;
      metrics: {
        total_clock_ins_today: number;
        total_clock_outs_today: number;
        tardy_today: number;
        events_emitted_today: number;
      };
    };
  }> {
    this.logger.log('Getting Absensi Agent health status');

    try {
      const health = await this.absensiAgent.getHealthStatus();

      return {
        success: true,
        data: health,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get health status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Trigger missing clock-out check (manual trigger)
   * 
   * Normally runs on schedule at 6 PM, but can be triggered manually
   * 
   * @returns Result of the check
   */
  @Post('check-missing-clock-outs')
  @HttpCode(HttpStatus.OK)
  async checkMissingClockOuts(): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log('Manual trigger: checking for missing clock-outs');

    try {
      await this.absensiAgent.checkMissingClockOuts();

      return {
        success: true,
        message: 'Missing clock-out check completed',
      };
    } catch (error) {
      this.logger.error(
        `Failed to check missing clock-outs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Trigger daily summary generation (manual trigger)
   * 
   * Normally runs on schedule at 7 PM, but can be triggered manually
   * 
   * @returns Result of the generation
   */
  @Post('generate-daily-summary')
  @HttpCode(HttpStatus.OK)
  async generateDailySummary(): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log('Manual trigger: generating daily attendance summary');

    try {
      await this.absensiAgent.generateDailyAttendanceSummary();

      return {
        success: true,
        message: 'Daily attendance summary generated',
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate daily summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
