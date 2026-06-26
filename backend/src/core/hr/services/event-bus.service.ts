// @ts-nocheck
import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../persistence/prisma.service';

/**
 * TaraEvent structure for TARA HR System
 * Conforms to Requirements 21.1, 21.7, 21.11, 21.12
 */
export interface TaraEvent {
  event_id: string; // UUID
  event_type: string; // e.g., 'leave.request.submitted', 'attendance.clock_in'
  event_version: string; // Schema version (e.g., '1.0')
  event_timestamp: Date; // Timestamp in WIB (Western Indonesian Time)
  actor: {
    id: string; // Employee ID or 'system' for automated actions
    type: 'employee' | 'agent' | 'system'; // Actor type
  };
  entity: {
    id: string; // Affected entity ID
    type: string; // Entity type: 'leave_request', 'attendance', 'employee', etc.
  };
  payload: any; // Event-specific data
  metadata?: Record<string, any>; // Optional contextual information
}

/**
 * Event Bus Service for TARA HR System
 * 
 * Responsibilities:
 * - Emit structured events to Event Bus
 * - Store events in EventBusLog table
 * - Track delivery status
 * - Guarantee event ordering per employee_id
 * 
 * Requirements: 21.1, 21.7, 21.11, 21.12
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private eventBusAvailable = true;
  private externalEventGateway: any = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Register an external event gateway (e.g. the WebSocket EventStreamGateway)
   * that should receive a broadcast for every emitted event. Optional — when no
   * gateway is registered, events are only persisted and dispatched locally.
   */
  setExternalEventGateway(gateway: any): void {
    this.externalEventGateway = gateway;
  }

  /**
   * Emit an event to the Event Bus
   * 
   * Validates event structure, stores in EventBusLog with delivery_status tracking,
   * and ensures event ordering guarantee per employee_id.
   * 
   * @param event - TaraEvent structure containing all required fields
   * @returns The created EventBusLog record
   * @throws Error if Event Bus is unavailable (caller should handle with offline queue)
   * 
   * Requirements:
   * - 21.1: Emit structured event for system actions
   * - 21.7: Include event type, timestamp (WIB), actor, entity, payload
   * - 21.11: Guarantee event ordering per employee_id
   * - 21.12: Deliver events within 500ms
   * - 21.13: Throw error if unavailable (for offline queue handling)
   */
  async emit(event: Partial<TaraEvent>): Promise<any> {
    // Check if Event Bus is available
    if (!this.eventBusAvailable) {
      throw new Error('Event Bus temporarily unavailable');
    }

    try {
      // Generate event_id if not provided
      const event_id = event.event_id || uuidv4();

      // Set default event_version if not provided
      const event_version = event.event_version || '1.0';

      // Ensure timestamp is in WIB (UTC+7)
      const event_timestamp = event.event_timestamp || this.getWIBTimestamp();

      // Validate required fields
      this.validateEvent(event);

      // Store event in EventBusLog table
      // actor_id has an FK to employees.id. System/agent actors are not employees,
      // so keep actor_id null for them while preserving actor_type.
      const actor_id = event.actor!.type === 'employee' ? event.actor!.id : null;

      const eventLog = await this.prisma.eventBusLog.create({
        data: {
          id: event_id,
          event_type: event.event_type!,
          event_version: event_version,
          actor_id,
          actor_type: event.actor!.type,
          entity_id: event.entity!.id,
          entity_type: event.entity!.type,
          event_payload: event.payload as any,
          event_timestamp: event_timestamp,
          delivery_status: 'pending', // Initial status
          retry_count: 0,
        },
      });

      this.logger.log(
        `Event emitted: ${event.event_type} [${event_id}] for entity ${event.entity!.type}:${event.entity!.id} by actor ${event.actor!.type}:${event.actor!.id}`,
      );

      // Note: In a production system, this would trigger async processing
      // to external consumers (Hermes_Agentic) via WebSocket/SSE
      // For now, we mark as delivered immediately
      await this.markAsDelivered(event_id);

      // Dispatch the event to in-process listeners (autonomous agents that use
      // @OnEvent, e.g. Clock_Confirmation_Agent) via Nest's EventEmitter2.
      // This is the glue that lets event-driven agents react to domain events
      // such as `attendance.clock_in` / `attendance.clock_out`.
      // Requirement 3.6: agents operate automatically without manual triggers.
      this.dispatchToLocalListeners({
        event_id,
        event_type: event.event_type!,
        event_version,
        event_timestamp,
        actor: event.actor!,
        entity: event.entity!,
        payload: event.payload,
        metadata: event.metadata,
      });

      return eventLog;
    } catch (error) {
      this.logger.error(`Failed to emit event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Dispatch an event to in-process listeners via Nest's EventEmitter2.
   *
   * Domain events are persisted to EventBusLog (for external consumers and
   * replay), and also broadcast locally so that autonomous agents subscribed
   * with @OnEvent can react in real time. Failures here are swallowed so that
   * a misbehaving listener never blocks event emission/persistence.
   *
   * @param event - Fully-populated TaraEvent to broadcast
   */
  private dispatchToLocalListeners(event: TaraEvent): void {
    if (!this.eventEmitter) {
      return;
    }

    try {
      this.eventEmitter.emit(event.event_type, event);
    } catch (error) {
      this.logger.error(
        `Failed to dispatch event ${event.event_type} to local listeners: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Validate TaraEvent structure
   * Ensures all required fields are present
   */
  private validateEvent(event: Partial<TaraEvent>): void {
    if (!event.event_type) {
      throw new Error('event_type is required');
    }

    if (!event.actor || !event.actor.id || !event.actor.type) {
      throw new Error('actor with id and type is required');
    }

    if (!event.entity || !event.entity.id || !event.entity.type) {
      throw new Error('entity with id and type is required');
    }

    if (event.payload === undefined || event.payload === null) {
      throw new Error('payload is required');
    }
  }

  /**
   * Get current timestamp in WIB (Western Indonesian Time, UTC+7)
   * 
   * Requirements: 21.7 - timestamp in WIB
   */
  private getWIBTimestamp(): Date {
    // Create date in UTC and adjust to WIB (UTC+7)
    const now = new Date();
    // Store as UTC in database but conceptually represents WIB time
    return now;
  }

  /**
   * Mark event as delivered
   * 
   * In production, this would be called by the event delivery mechanism
   * after successful delivery to consumers
   */
  private async markAsDelivered(event_id: string): Promise<void> {
    await this.prisma.eventBusLog.update({
      where: { id: event_id },
      data: {
        delivery_status: 'delivered',
        published_at: new Date(),
      },
    });
  }

  /**
   * Mark event as failed
   * 
   * Used when event delivery fails and needs retry
   */
  async markAsFailed(event_id: string, error?: string): Promise<void> {
    const event = await this.prisma.eventBusLog.findUnique({
      where: { id: event_id },
    });

    if (!event) {
      throw new Error(`Event ${event_id} not found`);
    }

    await this.prisma.eventBusLog.update({
      where: { id: event_id },
      data: {
        delivery_status: 'failed',
        retry_count: event.retry_count + 1,
      },
    });

    this.logger.warn(
      `Event ${event_id} marked as failed. Retry count: ${event.retry_count + 1}. Error: ${error}`,
    );
  }

  /**
   * Get events for a specific employee (ordered chronologically)
   * 
   * Requirements: 21.11 - Event ordering guarantee per employee_id
   */
  async getEventsForEmployee(
    employeeId: string,
    options?: {
      event_type?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<any[]> {
    const where: any = {
      OR: [
        { actor_id: employeeId },
        { entity_id: employeeId, entity_type: 'employee' },
      ],
    };

    if (options?.event_type) {
      where.event_type = options.event_type;
    }

    return this.prisma.eventBusLog.findMany({
      where,
      orderBy: { event_timestamp: 'asc' }, // Chronological ordering
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    event_type: string,
    options?: {
      limit?: number;
      offset?: number;
      delivery_status?: string;
    },
  ): Promise<any[]> {
    const where: any = { event_type };

    if (options?.delivery_status) {
      where.delivery_status = options.delivery_status;
    }

    return this.prisma.eventBusLog.findMany({
      where,
      orderBy: { event_timestamp: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get pending events (for retry mechanism)
   */
  async getPendingEvents(limit: number = 100): Promise<any[]> {
    return this.prisma.eventBusLog.findMany({
      where: {
        delivery_status: 'pending',
        retry_count: { lt: 5 }, // Max 5 retries
      },
      orderBy: { event_timestamp: 'asc' }, // Process oldest first
      take: limit,
    });
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(): Promise<number> {
    const failedEvents = await this.prisma.eventBusLog.findMany({
      where: {
        delivery_status: 'failed',
        retry_count: { lt: 5 }, // Max 5 retries
      },
      take: 50,
    });

    let retriedCount = 0;
    for (const event of failedEvents) {
      try {
        // Reset to pending for retry
        await this.prisma.eventBusLog.update({
          where: { id: event.id },
          data: {
            delivery_status: 'pending',
          },
        });
        retriedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to retry event ${event.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Retried ${retriedCount} failed events`);
    return retriedCount;
  }

  /**
   * Event persistence and cleanup
   * Requirement 21.9: Persist events for minimum 90 days for replay capability
   */

  /**
   * Clean up events older than 90 days
   * 
   * Should be called periodically (e.g., daily via scheduled task)
   * to maintain 90-day retention policy
   * 
   * @returns Number of events deleted
   */
  async cleanupOldEvents(): Promise<number> {
    const retentionDays = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.prisma.eventBusLog.deleteMany({
        where: {
          event_timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} events older than ${retentionDays} days (before ${cutoffDate.toISOString()})`,
      );

      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup old events: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get total event count for monitoring retention
   */
  async getEventCount(options?: {
    event_type?: string;
    delivery_status?: string;
    olderThanDays?: number;
  }): Promise<number> {
    const where: any = {};

    if (options?.event_type) {
      where.event_type = options.event_type;
    }

    if (options?.delivery_status) {
      where.delivery_status = options.delivery_status;
    }

    if (options?.olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);
      where.event_timestamp = {
        lt: cutoffDate,
      };
    }

    return this.prisma.eventBusLog.count({ where });
  }

  /**
   * Event replay mechanism
   * Requirement 21.9: Provide event replay capability for recovery scenarios
   */

  /**
   * Replay events for a specific time range
   * 
   * Useful for recovery scenarios where events need to be reprocessed
   * after system failures or data inconsistencies
   * 
   * @param startDate - Start of replay time range
   * @param endDate - End of replay time range
   * @param options - Optional filters (event_type, entity_id, actor_id)
   * @returns Array of replayed events
   */
  async replayEventsInTimeRange(
    startDate: Date,
    endDate: Date,
    options?: {
      event_type?: string;
      entity_id?: string;
      actor_id?: string;
      dryRun?: boolean; // If true, return events without re-emitting
    },
  ): Promise<any[]> {
    const where: any = {
      event_timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (options?.event_type) {
      where.event_type = options.event_type;
    }

    if (options?.entity_id) {
      where.entity_id = options.entity_id;
    }

    if (options?.actor_id) {
      where.actor_id = options.actor_id;
    }

    const events = await this.prisma.eventBusLog.findMany({
      where,
      orderBy: { event_timestamp: 'asc' }, // Replay in chronological order
    });

    this.logger.log(
      `Found ${events.length} events to replay between ${startDate.toISOString()} and ${endDate.toISOString()}${options?.dryRun ? ' (DRY RUN)' : ''}`,
    );

    if (options?.dryRun) {
      return events;
    }

    // Re-emit events with their original data but mark as replay
    const replayedEvents = [];
    for (const event of events) {
      try {
        const replayEvent: Partial<TaraEvent> = {
          event_type: event.event_type,
          event_version: event.event_version,
          actor: {
            id: event.actor_id || 'system',
            type: event.actor_type as any || 'system',
          },
          entity: {
            id: event.entity_id || 'unknown',
            type: event.entity_type || 'unknown',
          },
          payload: {
            ...event.event_payload,
            _replay: true,
            _original_event_id: event.id,
            _original_timestamp: event.event_timestamp,
          },
        };

        const replayedEvent = await this.emit(replayEvent);
        replayedEvents.push(replayedEvent);

        this.logger.log(
          `Replayed event ${event.id} (${event.event_type}) as ${replayedEvent.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to replay event ${event.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Successfully replayed ${replayedEvents.length} out of ${events.length} events`);

    return replayedEvents;
  }

  /**
   * Replay specific event by ID
   * 
   * @param eventId - ID of the event to replay
   * @returns Replayed event
   */
  async replayEventById(eventId: string): Promise<any> {
    const event = await this.prisma.eventBusLog.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    this.logger.log(`Replaying event ${eventId} (${event.event_type})`);

    const replayEvent: Partial<TaraEvent> = {
      event_type: event.event_type,
      event_version: event.event_version,
      actor: {
        id: event.actor_id || 'system',
        type: event.actor_type as any || 'system',
      },
      entity: {
        id: event.entity_id || 'unknown',
        type: event.entity_type || 'unknown',
      },
      payload: {
        ...event.event_payload,
        _replay: true,
        _original_event_id: event.id,
        _original_timestamp: event.event_timestamp,
      },
    };

    const replayedEvent = await this.emit(replayEvent);

    this.logger.log(
      `Replayed event ${eventId} as ${replayedEvent.id}`,
    );

    return replayedEvent;
  }

  /**
   * Replay all events for a specific entity (e.g., rebuild entity state)
   * 
   * @param entityType - Type of entity (e.g., 'employee', 'leave_request')
   * @param entityId - ID of the entity
   * @param options - Optional filters
   * @returns Array of replayed events
   */
  async replayEventsForEntity(
    entityType: string,
    entityId: string,
    options?: {
      event_type?: string;
      dryRun?: boolean;
    },
  ): Promise<any[]> {
    const where: any = {
      entity_type: entityType,
      entity_id: entityId,
    };

    if (options?.event_type) {
      where.event_type = options.event_type;
    }

    const events = await this.prisma.eventBusLog.findMany({
      where,
      orderBy: { event_timestamp: 'asc' },
    });

    this.logger.log(
      `Found ${events.length} events for ${entityType}:${entityId}${options?.dryRun ? ' (DRY RUN)' : ''}`,
    );

    if (options?.dryRun) {
      return events;
    }

    const replayedEvents = [];
    for (const event of events) {
      try {
        const replayEvent: Partial<TaraEvent> = {
          event_type: event.event_type,
          event_version: event.event_version,
          actor: {
            id: event.actor_id || 'system',
            type: event.actor_type as any || 'system',
          },
          entity: {
            id: event.entity_id || 'unknown',
            type: event.entity_type || 'unknown',
          },
          payload: {
            ...event.event_payload,
            _replay: true,
            _original_event_id: event.id,
            _original_timestamp: event.event_timestamp,
          },
        };

        const replayedEvent = await this.emit(replayEvent);
        replayedEvents.push(replayedEvent);
      } catch (error) {
        this.logger.error(
          `Failed to replay event ${event.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Successfully replayed ${replayedEvents.length} out of ${events.length} events for ${entityType}:${entityId}`,
    );

    return replayedEvents;
  }

  /**
   * Event schema versioning
   * Requirement 21.10: Support event schema versioning with backward compatibility (2 versions)
   */

  /**
   * Supported schema versions for each event type
   * Maintains backward compatibility for 2 previous versions
   */
  private eventSchemaVersions: Map<string, string[]> = new Map([
    // Leave request events
    ['leave.request.submitted', ['1.0', '1.1', '2.0']],
    ['leave.request.approved', ['1.0', '1.1', '2.0']],
    ['leave.request.rejected', ['1.0', '1.1', '2.0']],
    
    // Attendance events
    ['attendance.clock_in', ['1.0', '1.1', '2.0']],
    ['attendance.clock_out', ['1.0', '1.1', '2.0']],
    ['attendance.tardiness_detected', ['1.0', '1.1', '2.0']],
    
    // Warning letter events
    ['warning.letter.issued', ['1.0', '1.1', '2.0']],
    
    // Onboarding events
    ['onboarding.step.completed', ['1.0', '1.1', '2.0']],
    ['onboarding.workflow.completed', ['1.0', '1.1', '2.0']],
    ['onboarding.step.failed', ['1.0', '1.1', '2.0']],
    
    // Leave balance events
    ['leave.balance.updated', ['1.0', '1.1', '2.0']],
    ['leave.balance.recap.sent', ['1.0', '1.1', '2.0']],
    
    // Weekly check-in events
    ['checkin.form.distributed', ['1.0', '1.1', '2.0']],
    ['checkin.response.submitted', ['1.0', '1.1', '2.0']],
    ['checkin.report.generated', ['1.0', '1.1', '2.0']],
    
    // Notification events
    ['notification.clock.confirmation.sent', ['1.0', '1.1', '2.0']],
    ['notification.sent', ['1.0', '1.1', '2.0']],
    
    // Report events
    ['report.tardiness.generated', ['1.0', '1.1', '2.0']],
    ['announcement.tardiness.published', ['1.0', '1.1', '2.0']],
  ]);

  /**
   * Validate event schema version
   * 
   * Ensures the event version is supported and within backward compatibility range
   * 
   * @param event_type - Type of event
   * @param event_version - Version of the event schema
   * @returns true if version is supported, false otherwise
   */
  isEventVersionSupported(event_type: string, event_version: string): boolean {
    const supportedVersions = this.eventSchemaVersions.get(event_type);
    
    if (!supportedVersions) {
      this.logger.warn(
        `No schema versions defined for event type: ${event_type}. Allowing any version.`,
      );
      return true; // Allow unknown event types
    }

    return supportedVersions.includes(event_version);
  }

  /**
   * Get supported versions for an event type
   * 
   * @param event_type - Type of event
   * @returns Array of supported versions
   */
  getSupportedVersions(event_type: string): string[] {
    return this.eventSchemaVersions.get(event_type) || ['1.0'];
  }

  /**
   * Get latest version for an event type
   * 
   * @param event_type - Type of event
   * @returns Latest supported version
   */
  getLatestVersion(event_type: string): string {
    const versions = this.getSupportedVersions(event_type);
    return versions[versions.length - 1] || '1.0';
  }

  /**
   * Transform event payload from old version to new version
   * 
   * Provides backward compatibility by transforming old event formats
   * to new formats when reading from event store
   * 
   * @param event - Event to transform
   * @param targetVersion - Target version to transform to (default: latest)
   * @returns Transformed event
   */
  transformEventToVersion(event: any, targetVersion?: string): any {
    const currentVersion = event.event_version || '1.0';
    const target = targetVersion || this.getLatestVersion(event.event_type);

    if (currentVersion === target) {
      return event; // No transformation needed
    }

    this.logger.log(
      `Transforming event ${event.id} from version ${currentVersion} to ${target}`,
    );

    // Version transformation logic based on event type
    // This is a simplified example - actual transformations would be event-specific
    const transformed = { ...event };

    // Example transformations for different event types
    switch (event.event_type) {
      case 'leave.request.submitted':
        transformed.event_payload = this.transformLeaveRequestEvent(
          event.event_payload,
          currentVersion,
          target,
        );
        break;

      case 'attendance.clock_in':
      case 'attendance.clock_out':
        transformed.event_payload = this.transformAttendanceEvent(
          event.event_payload,
          currentVersion,
          target,
        );
        break;

      // Add more event type transformations as needed
    }

    transformed.event_version = target;
    return transformed;
  }

  /**
   * Transform leave request event payload between versions
   */
  private transformLeaveRequestEvent(
    payload: any,
    fromVersion: string,
    toVersion: string,
  ): any {
    const transformed = { ...payload };

    // Example: v1.0 -> v1.1 added 'reason_category' field
    if (fromVersion === '1.0' && (toVersion === '1.1' || toVersion === '2.0')) {
      transformed.reason_category = transformed.reason_category || 'other';
    }

    // Example: v1.1 -> v2.0 added 'requester_department' field
    if ((fromVersion === '1.0' || fromVersion === '1.1') && toVersion === '2.0') {
      transformed.requester_department = transformed.requester_department || null;
    }

    return transformed;
  }

  /**
   * Transform attendance event payload between versions
   */
  private transformAttendanceEvent(
    payload: any,
    fromVersion: string,
    toVersion: string,
  ): any {
    const transformed = { ...payload };

    // Example: v1.0 -> v1.1 added 'location' field
    if (fromVersion === '1.0' && (toVersion === '1.1' || toVersion === '2.0')) {
      transformed.location = transformed.location || null;
    }

    // Example: v1.1 -> v2.0 added 'device_type' field
    if ((fromVersion === '1.0' || fromVersion === '1.1') && toVersion === '2.0') {
      transformed.device_type = transformed.device_type || 'phone';
    }

    return transformed;
  }

  /**
   * Get events with automatic version transformation
   * 
   * Retrieves events and transforms them to the latest version
   * for backward compatibility
   * 
   * @param options - Query options
   * @returns Array of events transformed to latest version
   */
  async getEventsWithVersionTransform(options: {
    event_type?: string;
    entity_id?: string;
    actor_id?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (options.event_type) {
      where.event_type = options.event_type;
    }

    if (options.entity_id) {
      where.entity_id = options.entity_id;
    }

    if (options.actor_id) {
      where.actor_id = options.actor_id;
    }

    if (options.startDate || options.endDate) {
      where.event_timestamp = {};
      if (options.startDate) {
        where.event_timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.event_timestamp.lte = options.endDate;
      }
    }

    const events = await this.prisma.eventBusLog.findMany({
      where,
      orderBy: { event_timestamp: 'desc' },
      take: options.limit || 100,
      skip: options.offset || 0,
    });

    // Transform all events to latest version
    return events.map(event => this.transformEventToVersion(event));
  }

  /**
   * Backward-compatible publish() API.
   *
   * The legacy shared EventBus exposed `publish({ event_type, tenant_id,
   * entity_id, entity_type, source_module, user_id, payload })`. TARA is
   * single-tenant and uses the structured TaraEvent/`emit()` API, so this
   * adapter maps the old shape onto `emit()` and is kept so existing callers
   * (compliance, department, role, scheduling, etc.) continue to work.
   */
  async publish(legacyEvent: {
    event_type: string;
    tenant_id?: string;
    entity_id: string;
    entity_type: string;
    source_module?: string;
    user_id?: string;
    payload?: any;
    [key: string]: any;
  }, _tx?: any): Promise<any> {
    return this.emit({
      event_type: legacyEvent.event_type,
      actor: {
        id: legacyEvent.user_id || 'system',
        type: legacyEvent.user_id ? 'employee' : 'system',
      },
      entity: {
        id: legacyEvent.entity_id,
        type: legacyEvent.entity_type,
      },
      payload: legacyEvent.payload ?? {},
    });
  }

  /**
   * Set Event Bus availability status
   * 
   * Used for testing offline queue functionality and simulating Event Bus outages
   * 
   * @param available - true if Event Bus is available, false otherwise
   */
  setAvailability(available: boolean): void {
    this.eventBusAvailable = available;
    this.logger.log(`Event Bus availability set to: ${available}`);
  }

  /**
   * Check if Event Bus is available
   * 
   * @returns true if Event Bus is available, false otherwise
   */
  isAvailable(): boolean {
    return this.eventBusAvailable;
  }
}
