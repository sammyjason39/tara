import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeoService } from './geo.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Unit Tests for GeoService Geo-Fence Validation
 * 
 * Task 10.2: Implement geo-fence validation logic
 * - Test validateGeoFence method with employee location and office location
 * - Test validateGeoFenceMultiple for employees with multiple office assignments
 * - Test error handling for invalid locations
 * - Test different geo-fence radii
 * 
 * **Validates: Requirements 23.1, 23.2, 23.3, 23.4**
 * **Validates: Design Property 15 - Geo-Fence Validation Accuracy**
 */

describe('GeoService - Geo-Fence Validation', () => {
  let service: GeoService;
  let mockPrismaService: any;

  const mockLocationId = 'test-location-id';
  const mockOfficeName = 'Jakarta HQ';
  const mockOfficeLatitude = new Decimal('-8.6705');
  const mockOfficeLongitude = new Decimal('115.2126');
  const mockGeofenceRadius = 200;

  beforeEach(() => {
    // Create mock Prisma service
    mockPrismaService = {
      officeLocation: {
        findUnique: vi.fn(),
      },
    };

    // Create service with mocked Prisma
    service = new GeoService(mockPrismaService as unknown as PrismaService);
  });

  describe('validateGeoFence', () => {
    describe('successful validation', () => {
      it('should validate employee within geo-fence', async () => {
        // Mock location data
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: mockGeofenceRadius,
        });

        // Employee location 50 meters away (within 200m fence)
        const employeeLat = -8.67095;
        const employeeLon = 115.2126;

        const result = await service.validateGeoFence(
          employeeLat,
          employeeLon,
          mockLocationId,
        );

        expect(result.within_fence).toBe(true);
        expect(result.distance_meters).toBeLessThanOrEqual(mockGeofenceRadius);
        expect(result.distance_meters).toBeGreaterThan(0);
        expect(result.office_name).toBe(mockOfficeName);
        expect(result.office_latitude).toBe(-8.6705);
        expect(result.office_longitude).toBe(115.2126);
        expect(result.geofence_radius_meters).toBe(mockGeofenceRadius);
      });

      it('should validate employee outside geo-fence', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: mockGeofenceRadius,
        });

        // Employee location 500 meters away (outside 200m fence)
        const employeeLat = -8.67500;
        const employeeLon = 115.2126;

        const result = await service.validateGeoFence(
          employeeLat,
          employeeLon,
          mockLocationId,
        );

        expect(result.within_fence).toBe(false);
        expect(result.distance_meters).toBeGreaterThan(mockGeofenceRadius);
        expect(result.office_name).toBe(mockOfficeName);
      });

      it('should validate employee at exact geo-fence boundary', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: 100,
        });

        // Employee exactly 100 meters away (approximately)
        const employeeLat = -8.6714;
        const employeeLon = 115.2126;

        const result = await service.validateGeoFence(
          employeeLat,
          employeeLon,
          mockLocationId,
        );

        // At boundary, should be very close to 100m
        expect(result.distance_meters).toBeLessThanOrEqual(105);
        expect(result.distance_meters).toBeGreaterThanOrEqual(95);
      });

      it('should query the correct location from database', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: mockGeofenceRadius,
        });

        await service.validateGeoFence(-8.6705, 115.2126, mockLocationId);

        expect(mockPrismaService.officeLocation.findUnique).toHaveBeenCalledWith({
          where: { id: mockLocationId },
          select: {
            location_name: true,
            latitude: true,
            longitude: true,
            geofence_radius_meters: true,
          },
        });
      });

      it('should handle Decimal conversion correctly', async () => {
        // Test with Decimal objects (as Prisma returns)
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: new Decimal('-6.2088'),
          longitude: new Decimal('106.8456'),
          geofence_radius_meters: 250,
        });

        const result = await service.validateGeoFence(
          -6.2088,
          106.8456,
          mockLocationId,
        );

        expect(result.office_latitude).toBe(-6.2088);
        expect(result.office_longitude).toBe(106.8456);
        expect(result.distance_meters).toBe(0); // Same location
        expect(result.within_fence).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw error if location not found', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue(null);

        await expect(
          service.validateGeoFence(-8.6705, 115.2126, 'non-existent-id'),
        ).rejects.toThrow('Location not found: non-existent-id');
      });

      it('should throw error if location has no latitude', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: null,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: mockGeofenceRadius,
        });

        await expect(
          service.validateGeoFence(-8.6705, 115.2126, mockLocationId),
        ).rejects.toThrow('does not have GPS coordinates configured');
      });

      it('should throw error if location has no longitude', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: null,
          geofence_radius_meters: mockGeofenceRadius,
        });

        await expect(
          service.validateGeoFence(-8.6705, 115.2126, mockLocationId),
        ).rejects.toThrow('does not have GPS coordinates configured');
      });

      it('should throw error if location has no geofence_radius', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: null,
        });

        await expect(
          service.validateGeoFence(-8.6705, 115.2126, mockLocationId),
        ).rejects.toThrow('does not have geo-fence radius configured');
      });

      it('should throw error for invalid employee coordinates', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: mockGeofenceRadius,
        });

        // Invalid latitude (> 90)
        await expect(
          service.validateGeoFence(91, 115.2126, mockLocationId),
        ).rejects.toThrow('Latitude must be between -90 and 90 degrees');
      });
    });

    describe('different geo-fence radii', () => {
      it('should work with small geo-fence (50m)', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: 50,
        });

        // Employee 30 meters away
        const result = await service.validateGeoFence(
          -8.67077,
          115.2126,
          mockLocationId,
        );

        expect(result.within_fence).toBe(true);
        expect(result.geofence_radius_meters).toBe(50);
        expect(result.distance_meters).toBeLessThan(35);
      });

      it('should work with large geo-fence (1000m)', async () => {
        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: mockOfficeName,
          latitude: mockOfficeLatitude,
          longitude: mockOfficeLongitude,
          geofence_radius_meters: 1000,
        });

        // Employee 500 meters away
        const result = await service.validateGeoFence(
          -8.67500,
          115.2126,
          mockLocationId,
        );

        expect(result.within_fence).toBe(true);
        expect(result.geofence_radius_meters).toBe(1000);
      });
    });

    describe('real-world scenarios', () => {
      it('should validate employee clocking in from office entrance', async () => {
        // PT. Maju Bersama office coordinates
        const officeLatitude = new Decimal('-6.2088');
        const officeLongitude = new Decimal('106.8456');

        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: 'PT. Maju Bersama HQ',
          latitude: officeLatitude,
          longitude: officeLongitude,
          geofence_radius_meters: 200,
        });

        // Employee at entrance, 50 meters from office center
        const result = await service.validateGeoFence(
          -6.20925,
          106.8456,
          mockLocationId,
        );

        expect(result.within_fence).toBe(true);
        expect(result.distance_meters).toBeLessThan(100);
      });

      it('should reject employee clocking in from nearby coffee shop', async () => {
        const officeLatitude = new Decimal('-6.2088');
        const officeLongitude = new Decimal('106.8456');

        mockPrismaService.officeLocation.findUnique.mockResolvedValue({
          location_name: 'PT. Maju Bersama HQ',
          latitude: officeLatitude,
          longitude: officeLongitude,
          geofence_radius_meters: 200,
        });

        // Employee at coffee shop, 500 meters away
        const result = await service.validateGeoFence(
          -6.2133,
          106.8456,
          mockLocationId,
        );

        expect(result.within_fence).toBe(false);
        expect(result.distance_meters).toBeGreaterThan(200);
      });
    });
  });

  describe('validateGeoFenceMultiple', () => {
    const location1Id = 'location-1';
    const location2Id = 'location-2';
    const location3Id = 'location-3';

    beforeEach(() => {
      // Setup mock for multiple locations
      mockPrismaService.officeLocation.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === location1Id) {
          return Promise.resolve({
            location_name: 'Jakarta Office',
            latitude: new Decimal('-6.2088'),
            longitude: new Decimal('106.8456'),
            geofence_radius_meters: 200,
          });
        }
        if (where.id === location2Id) {
          return Promise.resolve({
            location_name: 'Bali Office',
            latitude: new Decimal('-8.6705'),
            longitude: new Decimal('115.2126'),
            geofence_radius_meters: 150,
          });
        }
        if (where.id === location3Id) {
          return Promise.resolve({
            location_name: 'Surabaya Office',
            latitude: new Decimal('-7.2575'),
            longitude: new Decimal('112.7521'),
            geofence_radius_meters: 300,
          });
        }
        return Promise.resolve(null);
      });
    });

    it('should find closest office when within one geo-fence', async () => {
      // Employee near Bali office
      const employeeLat = -8.67095;
      const employeeLon = 115.2126;

      const result = await service.validateGeoFenceMultiple(
        employeeLat,
        employeeLon,
        [location1Id, location2Id, location3Id],
      );

      expect(result.within_any_fence).toBe(true);
      expect(result.closest_office.location_id).toBe(location2Id);
      expect(result.closest_office.office_name).toBe('Bali Office');
      expect(result.closest_office.within_fence).toBe(true);
      expect(result.all_offices).toHaveLength(3);
    });

    it('should identify not within any fence when outside all', async () => {
      // Employee in the middle of nowhere
      const employeeLat = 0.0;
      const employeeLon = 100.0;

      const result = await service.validateGeoFenceMultiple(
        employeeLat,
        employeeLon,
        [location1Id, location2Id, location3Id],
      );

      expect(result.within_any_fence).toBe(false);
      expect(result.closest_office.within_fence).toBe(false);
      expect(result.all_offices.every((o) => !o.within_fence)).toBe(true);
    });

    it('should return all offices with distance information', async () => {
      // Employee near Bali
      const employeeLat = -8.67;
      const employeeLon = 115.21;

      const result = await service.validateGeoFenceMultiple(
        employeeLat,
        employeeLon,
        [location1Id, location2Id, location3Id],
      );

      expect(result.all_offices).toHaveLength(3);
      
      // Bali should be closest
      const baliOffice = result.all_offices.find(o => o.office_name === 'Bali Office');
      expect(baliOffice).toBeDefined();
      expect(baliOffice!.distance_meters).toBeLessThan(1000);
      
      // All offices should have required properties
      result.all_offices.forEach(office => {
        expect(office).toHaveProperty('location_id');
        expect(office).toHaveProperty('office_name');
        expect(office).toHaveProperty('distance_meters');
        expect(office).toHaveProperty('within_fence');
        expect(office).toHaveProperty('geofence_radius_meters');
      });
    });

    it('should throw error if no location IDs provided', async () => {
      await expect(
        service.validateGeoFenceMultiple(-8.6705, 115.2126, []),
      ).rejects.toThrow('At least one location ID must be provided');
    });

    it('should throw error if all locations are invalid', async () => {
      mockPrismaService.officeLocation.findUnique.mockResolvedValue(null);

      await expect(
        service.validateGeoFenceMultiple(-8.6705, 115.2126, ['invalid-1', 'invalid-2']),
      ).rejects.toThrow('No valid locations found for geo-fence validation');
    });

    it('should handle mix of valid and invalid locations', async () => {
      // Only location2 is valid, others return null
      mockPrismaService.officeLocation.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === location2Id) {
          return Promise.resolve({
            location_name: 'Bali Office',
            latitude: new Decimal('-8.6705'),
            longitude: new Decimal('115.2126'),
            geofence_radius_meters: 150,
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.validateGeoFenceMultiple(
        -8.67095,
        115.2126,
        [location1Id, location2Id, location3Id],
      );

      expect(result.all_offices).toHaveLength(1);
      expect(result.closest_office.office_name).toBe('Bali Office');
    });

    it('should identify closest office even when all are outside fence', async () => {
      // Employee far from all offices
      const employeeLat = -10.0;
      const employeeLon = 120.0;

      const result = await service.validateGeoFenceMultiple(
        employeeLat,
        employeeLon,
        [location1Id, location2Id, location3Id],
      );

      expect(result.within_any_fence).toBe(false);
      expect(result.closest_office).toBeDefined();
      expect(result.closest_office.within_fence).toBe(false);
      
      // All offices should be outside fence
      expect(result.all_offices.every(o => !o.within_fence)).toBe(true);
    });
  });
});
