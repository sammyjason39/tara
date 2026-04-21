import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import { EventBusService, DomainEvent } from './event-bus.service';

export interface LocalEvent {
  name: string; // e.g., 'payroll.calculated'
  version: string; // SemVer, e.g., '1.0.0'
  tenant_id: string;
  payload: any;
  bubbleToGlobal?: boolean; // If true, automatically publish to global EventBus
  user_id?: string;
  correlation_id?: string;
}

@Injectable()
export class LocalEmitterService implements OnModuleInit {
  private readonly logger = new Logger(LocalEmitterService.name);
  private readonly emitter: EventEmitter2;

  constructor(private readonly globalBus: EventBusService) {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 200, // High concurrency for module-internal hooks
      verboseMemoryLeak: true,
    });
  }

  onModuleInit() {
    this.logger.log('Local EventEmitter2 Pipeline Initialized.');
  }

  /**
   * Emit a Module-Internal Event.
   * Optionally bubbles to the Global Event Bus for AI and Cross-Module subscribers.
   */
  async emit(event: LocalEvent) {
    const fullEventName = `local.${event.name}.v${event.version}`;
    
    // 1. Emit Localy (In-Process, high speed)
    this.emitter.emit(fullEventName, event);
    this.logger.debug(`[LOCAL_EMIT] ${fullEventName}`);

    // 2. Bubble to Global Bus (Outbox Pattern / Persistent)
    if (event.bubbleToGlobal) {
      const globalEventName = `zenvix.${event.name}.v${event.version}`;
      
      const domainEvent: DomainEvent = {
        event_type: globalEventName,
        tenant_id: event.tenant_id,
        entity_id: event.payload.id || 'system',
        entity_type: event.name.split('.')[0], // Guessing entity from name
        source_module: event.name.split('.')[0],
        payload: event.payload,
        user_id: event.user_id,
        correlation_id: event.correlation_id,
        version: parseInt(event.version.split('.')[0]), // Major version as number for registry
      };

      await this.globalBus.publish(domainEvent);
      this.logger.debug(`[GLOBAL_BUBBLE] ${globalEventName}`);
    }
  }

  /**
   * Subscribe to local events
   */
  on(eventName: string, handler: (event: LocalEvent) => void) {
    this.emitter.on(eventName, handler);
  }

  /**
   * Visibility: Returns registration stats for the local event fabric.
   * Useful for debugging "dead" event listeners.
   */
  getMetrics() {
    const events = this.emitter.eventNames();
    return {
      active_events: events,
      listener_count: events.reduce((acc, name) => acc + this.emitter.listenerCount(name), 0),
      is_alive: true,
      last_event_at: new Date().toISOString()
    };
  }
}
