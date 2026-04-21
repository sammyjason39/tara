import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FarmingMissionService } from '../farming-mission.service';
import { EventBusService } from '../../../shared/events/event-bus.service';

@Injectable()
export class SensorThresholdListener implements OnModuleInit {
  private readonly logger = new Logger(SensorThresholdListener.name);

  constructor(
    private readonly missionService: FarmingMissionService,
    private readonly eventBus: EventBusService
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('SENSOR_THRESHOLD_EXCEEDED', 'SensorThresholdListener.handle', async (event: any) => {
        return this.handleThresholdExceeded(event);
    });
  }

  async handleThresholdExceeded(event: any) {
    this.logger.log(`Reacting to Threshold Event for sensor: ${event.payload?.sensor_id}`);
    
    const payload = event.payload;
    // Delegate to Mission Service for industry-specific logic
    await this.missionService.handleSensorThreshold(
        event.tenant_id,
        payload.sensor_id,
        Number(payload.value),
        payload.sensor_type
    );
  }
}
