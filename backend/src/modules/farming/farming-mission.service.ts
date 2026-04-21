import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export enum MissionType {
    IRRIGATION = 'IRRIGATION',
    FEEDING = 'FEEDING',
    PH_ADJUSTMENT = 'PH_ADJUSTMENT',
    HARVEST = 'HARVEST'
}

export enum MissionStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

@Injectable()
export class FarmingMissionService {
  private readonly logger = new Logger(FarmingMissionService.name);

  /**
   * Creates an operational mission triggered by IoT or User.
   */
  async createMission(tenant_id: string, data: {
    type: MissionType;
    location_id: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    metadata?: any;
  }) {
    this.logger.log(`Creating Farming Mission: ${data.type} for tenant ${tenant_id}`);
    
    const mission = {
        id: uuidv4(),
        tenant_id,
        ...data,
        status: MissionStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date()
    };

    // In DEV_MOCK_MODE, we log it. In PROD, this would hit FarmingRepository.
    return mission;
  }

  /**
   * Automated Mission Trigger from Sensor Logic.
   */
  async handleSensorThreshold(tenant_id: string, sensor_id: string, reading_value: number, reading_type: string) {
    if (reading_type === 'SOIL_MOISTURE' && reading_value < 15) {
        this.logger.warn(`Low soil moisture (${reading_value}%) detected on sensor ${sensor_id}. Triggering Auto-Irrigation.`);
        
        return this.createMission(tenant_id, {
            type: MissionType.IRRIGATION,
            location_id: 'AUTO_LOCATION', // In real logic, lookup sensor-to-location mapping
            description: `Automated irrigation response to low moisture reading (${reading_value}%) on ${sensor_id}`,
            priority: 'HIGH',
            metadata: { sensor_id, reading_value }
        });
    }
  }
}
