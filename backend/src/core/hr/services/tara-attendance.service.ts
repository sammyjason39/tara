// @ts-nocheck
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { GeoService } from './geo.service';
import { EventBusService, TaraEvent } from './event-bus.service';
import { AttendancePhotoService } from './attendance-photo.service';

/**
 * TARA Attendance Service
 * 
 * Handles clock-in and clock-out operations for the TARA HR system with:
 * - Geo-fence validation
 * - GPS coordinate storage in PostGIS format
 * - WIB timezone handling
 * - Event emission for autonomous agents
 * - Attendance source tracking (phone vs aws_device)
 * - Biometric verification support
 * 
 * Requirements: 2.1, 2.2, 23.1, 23.9
 * Design: Task 11.1
 */
@Injectable()
export class TaraAttendanceService {
  private readonly logger = new Logger(TaraAttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    private readonly eventBusService: EventBusService,
    private readonly attendancePhotoService: AttendancePhotoService,
  ) {}

  /**
   * Validate employee GPS against active office geofence (shared by API + clock flows).
   */
  async validateGeofenceForEmployee(
    employee_id: string,
    gps_latitude: number,
    gps_longitude: number,
  ): Promise<{
    within_fence: boolean;
    distance_meters: number;
    office_name: string;
    office_latitude: number;
    office_longitude: number;
    geofence_radius_meters: number;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employee_id },
      select: { id: true, employment_status: true },
    });

    if (!employee) {
      throw new BadRequestException(`Employee not found: ${employee_id}`);
    }

    if (employee.employment_status !== 'active') {
      throw new BadRequestException('Karyawan tidak aktif');
    }

    const officeLocation = await this.prisma.officeLocation.findFirst({
      where: { is_active: true },
    });

    if (!officeLocation) {
      throw new BadRequestException(
        'Lokasi kantor belum dikonfigurasi. Hubungi HR.',
      );
    }

    const officeLatitude = parseFloat(officeLocation.latitude.toString());
    const officeLongitude = parseFloat(officeLocation.longitude.toString());

    const distanceMeters = this.geoService.calculateHaversineDistance(
      gps_latitude,
      gps_longitude,
      officeLatitude,
      officeLongitude,
    );

    const withinFence = distanceMeters <= officeLocation.geofence_radius_meters;

    return {
      within_fence: withinFence,
      distance_meters: Math.round(distanceMeters),
      office_name: officeLocation.location_name,
      office_latitude: officeLatitude,
      office_longitude: officeLongitude,
      geofence_radius_meters: officeLocation.geofence_radius_meters,
    };
  }

  /**
   * Record employee clock-in with geo-fence validation
   * 
   * Requirements:
   * - 2.1: Record exact timestamp in WIB
   * - 23.1: Validate geo-fence before recording
   * - 23.9: Store GPS coordinates in PostGIS GEOGRAPHY column
   * 
   * @param employee_id - Employee UUID
   * @param timestamp - Clock-in timestamp (will be stored in WIB)
   * @param gps_latitude - Employee's GPS latitude in degrees
   * @param gps_longitude - Employee's GPS longitude in degrees
   * @param biometric_verified - Whether biometric authentication was successful
   * @param attendance_source - Source of attendance: 'phone' or 'aws_device'
   * @returns Created attendance record
   * @throws BadRequestException if geo-fence validation fails or duplicate clock-in detected
   */
  async recordClockIn(
    employee_id: string,
    timestamp: Date,
    gps_latitude: number,
    gps_longitude: number,
    biometric_verified: boolean,
    attendance_source: 'phone' | 'aws_device' = 'phone',
    selfie_photo?: string,
  ): Promise<any> {
    this.logger.log(
      `Recording clock-in for employee ${employee_id} at ${timestamp.toISOString()} from ${attendance_source}`,
    );

    return this.prisma.$transaction(async (tx) => {
      // Step 1: Get employee and their assigned office location
      const employee = await tx.employee.findUnique({
        where: { id: employee_id },
        select: {
          id: true,
          full_name: true,
          email: true,
          employment_status: true,
        },
      });

      if (!employee) {
        throw new BadRequestException(`Employee not found: ${employee_id}`);
      }

      if (employee.employment_status !== 'active') {
        throw new BadRequestException(
          `Employee is not active: ${employee.employment_status}`,
        );
      }

      // Step 2: Get employee's assigned office location
      // For now, we'll use the first active office location
      // TODO: In future, support employee-specific office assignments
      const officeLocation = await tx.officeLocation.findFirst({
        where: { is_active: true },
      });

      if (!officeLocation) {
        throw new BadRequestException(
          'No active office location configured. Please configure office location in Settings.',
        );
      }

      // Step 3: Validate geo-fence (Requirement 23.1)
      const geoValidation = await this.validateGeofenceForEmployee(
        employee_id,
        gps_latitude,
        gps_longitude,
      );

      if (!geoValidation.within_fence) {
        throw new BadRequestException(
          `Clock-in rejected: You are ${geoValidation.distance_meters}m from ${geoValidation.office_name}. ` +
            `Please be within ${geoValidation.geofence_radius_meters}m to clock in.`,
        );
      }

      if (attendance_source === 'phone' && !selfie_photo?.trim()) {
        throw new BadRequestException(
          'Foto selfie wajib untuk absensi via HP',
        );
      }

      // Step 4: Check for duplicate clock-in (ensure only one record per day)
      const attendanceDate = new Date(timestamp);
      attendanceDate.setHours(0, 0, 0, 0); // Set to start of day

      const existingAttendance = await tx.attendance.findUnique({
        where: {
          employee_id_attendance_date: {
            employee_id: employee_id,
            attendance_date: attendanceDate,
          },
        },
      });

      if (existingAttendance && existingAttendance.clock_in_time) {
        throw new BadRequestException(
          `Clock-in already recorded for today at ${existingAttendance.clock_in_time.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
        );
      }

      // Step 5: Calculate tardiness (Requirement 2.3)
      const tardinessResult = await this.calculateTardiness(
        timestamp,
        attendanceDate,
      );

      // Step 6: Save selfie photo (phone attendance)
      let clockInPhotoPath: string | null = null;
      if (selfie_photo?.trim()) {
        clockInPhotoPath = await this.attendancePhotoService.saveSelfie(
          employee_id,
          attendanceDate,
          'in',
          selfie_photo,
        );
      }

      // Step 7: Create or update attendance record
      // Store GPS coordinates in PostGIS GEOGRAPHY format (Requirement 23.9)
      // Format: POINT(longitude latitude) - note the order!
      const gpsPointWKT = `POINT(${gps_longitude} ${gps_latitude})`;

      const attendance = await tx.$executeRawUnsafe(
        `
        INSERT INTO attendance (
          id, 
          employee_id, 
          attendance_date, 
          clock_in_time, 
          clock_in_location, 
          clock_in_source, 
          is_tardy, 
          tardiness_minutes, 
          office_location_id,
          clock_in_photo_path,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          ST_GeogFromText($4),
          $5,
          $6,
          $7,
          $8,
          $9,
          NOW(),
          NOW()
        )
        ON CONFLICT (employee_id, attendance_date)
        DO UPDATE SET
          clock_in_time = EXCLUDED.clock_in_time,
          clock_in_location = EXCLUDED.clock_in_location,
          clock_in_source = EXCLUDED.clock_in_source,
          is_tardy = EXCLUDED.is_tardy,
          tardiness_minutes = EXCLUDED.tardiness_minutes,
          office_location_id = EXCLUDED.office_location_id,
          clock_in_photo_path = EXCLUDED.clock_in_photo_path,
          updated_at = NOW()
        RETURNING *
      `,
        employee_id,
        attendanceDate,
        timestamp,
        gpsPointWKT,
        attendance_source,
        tardinessResult.is_tardy,
        tardinessResult.tardiness_minutes,
        officeLocation.id,
        clockInPhotoPath,
      );

      // Fetch the created/updated record
      const attendanceRecord = await tx.attendance.findUnique({
        where: {
          employee_id_attendance_date: {
            employee_id: employee_id,
            attendance_date: attendanceDate,
          },
        },
      });

      this.logger.log(
        `Clock-in recorded for ${employee.full_name} at ${timestamp.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB. ` +
          `Tardy: ${tardinessResult.is_tardy}, Distance: ${geoValidation.distance_meters}m`,
      );

      // Step 7: Emit event to Event Bus (Requirement 2.7)
      const event: TaraEvent = {
        event_id: undefined, // Will be generated by EventBusService
        event_type: 'attendance.clock_in',
        event_version: '1.0',
        event_timestamp: timestamp,
        actor: {
          id: employee_id,
          type: 'employee',
        },
        entity: {
          id: attendanceRecord.id,
          type: 'attendance',
        },
        payload: {
          employee_id: employee_id,
          employee_name: employee.full_name,
          attendance_date: attendanceDate.toISOString(),
          clock_in_time: timestamp.toISOString(),
          is_tardy: tardinessResult.is_tardy,
          tardiness_minutes: tardinessResult.tardiness_minutes,
          attendance_source: attendance_source,
          biometric_verified: biometric_verified,
          gps_coordinates: {
            latitude: gps_latitude,
            longitude: gps_longitude,
          },
          office_location: {
            id: officeLocation.id,
            name: officeLocation.location_name,
            distance_meters: geoValidation.distance_meters,
          },
        },
        metadata: {
          geo_validation: geoValidation,
        },
      };

      await this.eventBusService.emit(event);

      // Step 8: If tardy, emit tardiness event (Requirement 2.4)
      if (tardinessResult.is_tardy) {
        const tardinessEvent: TaraEvent = {
          event_id: undefined,
          event_type: 'attendance.tardiness_detected',
          event_version: '1.0',
          event_timestamp: timestamp,
          actor: {
            id: employee_id,
            type: 'employee',
          },
          entity: {
            id: attendanceRecord.id,
            type: 'attendance',
          },
          payload: {
            employee_id: employee_id,
            employee_name: employee.full_name,
            attendance_date: attendanceDate.toISOString(),
            clock_in_time: timestamp.toISOString(),
            tardiness_minutes: tardinessResult.tardiness_minutes,
            threshold_time: tardinessResult.threshold_time.toISOString(),
          },
        };

        await this.eventBusService.emit(tardinessEvent);
        this.logger.warn(
          `Tardiness detected: ${employee.full_name} is ${tardinessResult.tardiness_minutes} minutes late`,
        );
      }

      return attendanceRecord;
    });
  }

  /**
   * Record employee clock-out with geo-fence validation
   * 
   * Requirements:
   * - 2.2: Record exact timestamp in WIB
   * - 23.2: Validate geo-fence before recording
   * 
   * @param employee_id - Employee UUID
   * @param timestamp - Clock-out timestamp (will be stored in WIB)
   * @param gps_latitude - Employee's GPS latitude in degrees
   * @param gps_longitude - Employee's GPS longitude in degrees
   * @param attendance_source - Source of attendance: 'phone' or 'aws_device'
   * @returns Updated attendance record
   * @throws BadRequestException if geo-fence validation fails or no clock-in found
   */
  async recordClockOut(
    employee_id: string,
    timestamp: Date,
    gps_latitude: number,
    gps_longitude: number,
    attendance_source: 'phone' | 'aws_device' = 'phone',
    selfie_photo?: string,
  ): Promise<any> {
    this.logger.log(
      `Recording clock-out for employee ${employee_id} at ${timestamp.toISOString()} from ${attendance_source}`,
    );

    return this.prisma.$transaction(async (tx) => {
      // Step 1: Get employee
      const employee = await tx.employee.findUnique({
        where: { id: employee_id },
        select: {
          id: true,
          full_name: true,
          email: true,
          employment_status: true,
        },
      });

      if (!employee) {
        throw new BadRequestException(`Employee not found: ${employee_id}`);
      }

      // Step 2: Get employee's assigned office location
      const officeLocation = await tx.officeLocation.findFirst({
        where: { is_active: true },
      });

      if (!officeLocation) {
        throw new BadRequestException(
          'No active office location configured. Please configure office location in Settings.',
        );
      }

      // Step 3: Validate geo-fence (Requirement 23.2)
      const geoValidation = await this.validateGeofenceForEmployee(
        employee_id,
        gps_latitude,
        gps_longitude,
      );

      if (!geoValidation.within_fence) {
        throw new BadRequestException(
          `Clock-out rejected: You are ${geoValidation.distance_meters}m from ${geoValidation.office_name}. ` +
            `Please be within ${geoValidation.geofence_radius_meters}m to clock out.`,
        );
      }

      if (attendance_source === 'phone' && !selfie_photo?.trim()) {
        throw new BadRequestException(
          'Foto selfie wajib untuk absensi via HP',
        );
      }

      // Step 4: Check for existing clock-in
      const attendanceDate = new Date(timestamp);
      attendanceDate.setHours(0, 0, 0, 0);

      const existingAttendance = await tx.attendance.findUnique({
        where: {
          employee_id_attendance_date: {
            employee_id: employee_id,
            attendance_date: attendanceDate,
          },
        },
      });

      if (!existingAttendance || !existingAttendance.clock_in_time) {
        throw new BadRequestException(
          'No clock-in record found for today. Please clock in first.',
        );
      }

      if (existingAttendance.clock_out_time) {
        throw new BadRequestException(
          `Clock-out already recorded for today at ${existingAttendance.clock_out_time.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
        );
      }

      // Step 5: Save selfie photo (phone attendance)
      let clockOutPhotoPath: string | null = null;
      if (selfie_photo?.trim()) {
        clockOutPhotoPath = await this.attendancePhotoService.saveSelfie(
          employee_id,
          attendanceDate,
          'out',
          selfie_photo,
        );
      }

      // Step 6: Update attendance record with clock-out
      const gpsPointWKT = `POINT(${gps_longitude} ${gps_latitude})`;

      await tx.$executeRawUnsafe(
        `
        UPDATE attendance
        SET 
          clock_out_time = $1,
          clock_out_location = ST_GeogFromText($2),
          clock_out_source = $3,
          clock_out_photo_path = $4,
          updated_at = NOW()
        WHERE employee_id = $5 AND attendance_date = $6
      `,
        timestamp,
        gpsPointWKT,
        attendance_source,
        clockOutPhotoPath,
        employee_id,
        attendanceDate,
      );

      // Fetch the updated record
      const attendanceRecord = await tx.attendance.findUnique({
        where: {
          employee_id_attendance_date: {
            employee_id: employee_id,
            attendance_date: attendanceDate,
          },
        },
      });

      this.logger.log(
        `Clock-out recorded for ${employee.full_name} at ${timestamp.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      );

      // Step 6: Emit event to Event Bus
      const event: TaraEvent = {
        event_id: undefined,
        event_type: 'attendance.clock_out',
        event_version: '1.0',
        event_timestamp: timestamp,
        actor: {
          id: employee_id,
          type: 'employee',
        },
        entity: {
          id: attendanceRecord.id,
          type: 'attendance',
        },
        payload: {
          employee_id: employee_id,
          employee_name: employee.full_name,
          attendance_date: attendanceDate.toISOString(),
          clock_in_time: existingAttendance.clock_in_time.toISOString(),
          clock_out_time: timestamp.toISOString(),
          attendance_source: attendance_source,
          gps_coordinates: {
            latitude: gps_latitude,
            longitude: gps_longitude,
          },
          office_location: {
            id: officeLocation.id,
            name: officeLocation.location_name,
            distance_meters: geoValidation.distance_meters,
          },
        },
        metadata: {
          geo_validation: geoValidation,
        },
      };

      await this.eventBusService.emit(event);

      return attendanceRecord;
    });
  }

  /**
   * Calculate tardiness based on system settings
   * 
   * Requirements:
   * - 2.3: Flag as tardy if clock-in after 09:00 WIB
   * - 8.3: Use configurable tardiness threshold
   * 
   * @param clockInTime - The actual clock-in timestamp
   * @param attendanceDate - The attendance date (date only, no time)
   * @returns Tardiness calculation result
   */
  private async calculateTardiness(
    clockInTime: Date,
    attendanceDate: Date,
  ): Promise<{
    is_tardy: boolean;
    tardiness_minutes: number;
    threshold_time: Date;
  }> {
    // Query system settings for tardiness threshold
    const tardinessSettings = await this.prisma.systemSettings.findUnique({
      where: { setting_key: 'attendance.tardiness_threshold' },
    });

    // Default to 09:00 WIB if not configured (Requirement 2.3)
    const thresholdHour =
      tardinessSettings?.setting_value?.['hour'] ?? 9;
    const thresholdMinute =
      tardinessSettings?.setting_value?.['minute'] ?? 0;

    // Create threshold time for the attendance date
    const thresholdTime = new Date(attendanceDate);
    thresholdTime.setHours(thresholdHour, thresholdMinute, 0, 0);

    // Calculate if tardy and by how many minutes
    const isTardy = clockInTime > thresholdTime;
    const tardinessMinutes = isTardy
      ? Math.floor((clockInTime.getTime() - thresholdTime.getTime()) / (1000 * 60))
      : 0;

    return {
      is_tardy: isTardy,
      tardiness_minutes: tardinessMinutes,
      threshold_time: thresholdTime,
    };
  }

  /**
   * Get attendance history for an employee
   * 
   * @param employee_id - Employee UUID
   * @param start_date - Start date for the query
   * @param end_date - End date for the query
   * @returns List of attendance records
   */
  async getAttendanceHistory(
    employee_id: string,
    start_date?: Date,
    end_date?: Date,
  ): Promise<any[]> {
    const where: any = {
      employee_id: employee_id,
    };

    if (start_date && end_date) {
      where.attendance_date = {
        gte: start_date,
        lte: end_date,
      };
    }

    return this.prisma.attendance.findMany({
      where,
      orderBy: {
        attendance_date: 'desc',
      },
      include: {
        employee: {
          select: {
            full_name: true,
            email: true,
          },
        },
        office_location: {
          select: {
            location_name: true,
            address: true,
          },
        },
      },
    });
  }

  /**
   * Get real-time attendance status for all employees (for dashboard)
   * 
   * Requirements:
   * - 2.5: Maintain real-time attendance status
   * 
   * @param date - Date to check (defaults to today)
   * @returns Attendance status for all active employees
   */
  async getRealtimeAttendanceStatus(date?: Date): Promise<any[]> {
    const attendanceDate = date || new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    return this.prisma.attendance.findMany({
      where: {
        attendance_date: attendanceDate,
        employee: {
          employment_status: 'active',
        },
      },
      include: {
        employee: {
          select: {
            full_name: true,
            email: true,
            department_id: true,
          },
        },
      },
      orderBy: {
        clock_in_time: 'asc',
      },
    });
  }
}
