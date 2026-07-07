import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TaraAttendanceService } from './tara-attendance.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { GeoService } from './geo.service';
import { EventBusService } from './event-bus.service';

describe('TaraAttendanceService.validateGeofenceForEmployee', () => {
  let service: TaraAttendanceService;
  const prisma = {
    employee: { findUnique: vi.fn() },
    officeLocation: { findMany: vi.fn() },
  };
  const geoService = {
    calculateHaversineDistance: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaraAttendanceService(
      prisma as unknown as PrismaService,
      geoService as unknown as GeoService,
      {} as EventBusService,
      {} as any,
    );
  });

  it('uses the employee assigned office instead of the first active office', async () => {
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      employment_status: 'active',
      office_location_id: 'office-kokikit',
    });
    prisma.officeLocation.findMany.mockResolvedValue([
      {
        id: 'office-kokikit',
        location_name: 'Kokikit Office',
        latitude: -6.1,
        longitude: 106.7,
        geofence_radius_meters: 200,
        is_active: true,
      },
    ]);
    geoService.calculateHaversineDistance.mockReturnValue(45);

    const result = await service.validateGeofenceForEmployee('emp-1', -6.1001, 106.7001);

    expect(prisma.officeLocation.findMany).toHaveBeenCalledWith({
      where: { id: 'office-kokikit', is_active: true },
      orderBy: { location_name: 'asc' },
    });
    expect(result.within_fence).toBe(true);
    expect(result.office_name).toBe('Kokikit Office');
    expect(result.office_location_id).toBe('office-kokikit');
  });

  it('allows unassigned employees to clock in at any active office within radius', async () => {
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-2',
      employment_status: 'active',
      office_location_id: null,
    });
    prisma.officeLocation.findMany.mockResolvedValue([
      {
        id: 'office-hq',
        location_name: 'Capital Cove HQ',
        latitude: -6.3,
        longitude: 106.66,
        geofence_radius_meters: 200,
        is_active: true,
      },
      {
        id: 'office-kokikit',
        location_name: 'Kokikit Office',
        latitude: -6.1,
        longitude: 106.7,
        geofence_radius_meters: 200,
        is_active: true,
      },
    ]);
    geoService.calculateHaversineDistance
      .mockReturnValueOnce(5000)
      .mockReturnValueOnce(80);

    const result = await service.validateGeofenceForEmployee('emp-2', -6.1002, 106.7002);

    expect(result.within_fence).toBe(true);
    expect(result.office_name).toBe('Kokikit Office');
    expect(result.office_location_id).toBe('office-kokikit');
  });

  it('reports the assigned office in the error reference when outside radius', async () => {
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-3',
      employment_status: 'active',
      office_location_id: 'office-kokikit',
    });
    prisma.officeLocation.findMany.mockResolvedValue([
      {
        id: 'office-kokikit',
        location_name: 'Kokikit Office',
        latitude: -6.1,
        longitude: 106.7,
        geofence_radius_meters: 200,
        is_active: true,
      },
    ]);
    geoService.calculateHaversineDistance.mockReturnValue(1200);

    const result = await service.validateGeofenceForEmployee('emp-3', -6.2, 106.8);

    expect(result.within_fence).toBe(false);
    expect(result.office_name).toBe('Kokikit Office');
    expect(result.distance_meters).toBe(1200);
  });

  it('throws when assigned office is missing or inactive', async () => {
    prisma.employee.findUnique.mockResolvedValue({
      id: 'emp-4',
      employment_status: 'active',
      office_location_id: 'office-missing',
    });
    prisma.officeLocation.findMany.mockResolvedValue([]);

    await expect(
      service.validateGeofenceForEmployee('emp-4', -6.1, 106.7),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
