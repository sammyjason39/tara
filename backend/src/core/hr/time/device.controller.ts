import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { TimeAndAttendanceService } from './time.service';

@Controller('hr/time/device')
export class AttendanceDeviceController {
  private readonly logger = new Logger(AttendanceDeviceController.name);

  constructor(private readonly timeService: TimeAndAttendanceService) {}

  /**
   * Biometric Ingest Endpoint
   * Used by external hardware/IOT devices to push attendance logs.
   * Authentication should be handled by global API Key or Device Token guard (omitted for now).
   */
  @Post('ingest')
  async ingest(
    @Headers('x-tenant-id') tenant_id: string,
    @Body() payload: { 
      employee_code: string, 
      device_id: string, 
      timestamp: string, 
      action?: 'IN' | 'OUT',
      metadata?: any 
    }
  ) {
    this.logger.log(`Raw device log received for employee ${payload.employee_code}`);
    try {
      const result = await this.timeService.biometricIngest(tenant_id, payload);
      return { 
        success: true, 
        message: 'Log ingested successfully', 
        record_id: result.id,
        status: result.status 
      };
    } catch (error) {
      this.logger.error(`Biometric ingest failed: ${error.message}`);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
}
