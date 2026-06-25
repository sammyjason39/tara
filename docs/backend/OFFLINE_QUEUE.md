# Offline Event Queue Implementation

## Overview

The Offline Event Queue Service implements local event queuing when the Event Bus is temporarily unavailable, with retry mechanism using exponential backoff and automatic replay when the Event Bus reconnects. This ensures no events are lost during temporary Event Bus outages.

## Requirements

This implementation fulfills **Requirement 21.13**:
- **21.13**: IF the Event_Bus is temporarily unavailable, THEN THE TARA_System SHALL queue events locally and replay them when the Event_Bus reconnects

## Architecture

### Components

1. **OfflineEventQueueService** (`offline-event-queue.service.ts`)
   - Core service for queuing and processing offline events
   - Implements exponential backoff retry mechanism
   - Handles event reconstruction and replay

2. **OfflineQueueProcessorScheduler** (`offline-queue-processor.scheduler.ts`)
   - Scheduled tasks for automated processing
   - Processes pending events every minute
   - Cleans up old synced events daily
   - Monitors queue health every 5 minutes

3. **EventBusService Updates** (`event-bus.service.ts`)
   - Added availability status tracking
   - Throws error when unavailable (for offline queue handling)
   - Methods: `setAvailability()`, `isAvailable()`

## Event Flow

```
┌─────────────────┐
│  Application    │
│  emits event    │
└────────┬────────┘
         │
         v
┌────────────────────┐
│  emitOrQueue()     │
│  Try Event Bus     │
└────────┬───────────┘
         │
    ┌────┴─────┐
    │          │
    v          v
Event Bus   Event Bus
Available   Unavailable
    │          │
    v          v
 Emit       Queue
 Event      Locally
            │
            v
    ┌──────────────────┐
    │ OfflineActionQueue│
    │ (Database Table)  │
    └──────────────────┘
            │
            v
    ┌──────────────────┐
    │  Scheduled Task  │
    │  Every 1 minute  │
    └──────────────────┘
            │
            v
    ┌──────────────────┐
    │ processPending() │
    │ with Exponential │
    │ Backoff          │
    └──────────────────┘
            │
            v
    ┌──────────────────┐
    │  Event Bus       │
    │  Reconnected     │
    │  → Emit Events   │
    └──────────────────┘
```

## Retry Mechanism with Exponential Backoff

The service implements exponential backoff to prevent overwhelming the Event Bus during recovery:

```
Formula: delay = BASE_BACKOFF_MS * 2^(retry_attempt)

Retry Schedule:
- Attempt 0: 0 seconds (immediate)
- Attempt 1: 1 second (1000ms)
- Attempt 2: 2 seconds (2000ms)
- Attempt 3: 4 seconds (4000ms)
- Attempt 4: 8 seconds (8000ms)
- Attempt 5: 16 seconds (16000ms)
- Max retries: 5 attempts
```

After 5 failed attempts, the event is marked as permanently `failed` and requires manual intervention.

## Usage

### Basic Usage

```typescript
import { OfflineEventQueueService } from './services/offline-event-queue.service';
import { EventBusService } from './services/event-bus.service';

// Inject services
constructor(
  private readonly offlineQueue: OfflineEventQueueService,
  private readonly eventBus: EventBusService,
) {}

// Emit event with automatic fallback to offline queue
const event: TaraEvent = {
  event_id: 'evt-123',
  event_type: 'attendance.clock_in',
  event_version: '1.0',
  event_timestamp: new Date(),
  actor: {
    id: employeeId,
    type: 'employee',
  },
  entity: {
    id: attendanceId,
    type: 'attendance',
  },
  payload: {
    location: { latitude: -6.2088, longitude: 106.8456 },
    device_type: 'phone',
  },
};

// Automatically handles offline queueing if Event Bus is unavailable
const emitted = await this.offlineQueue.emitOrQueue(event);
if (emitted) {
  console.log('Event emitted immediately');
} else {
  console.log('Event queued offline for later sync');
}
```

### Manual Processing

```typescript
// Manually trigger processing of pending events
const result = await this.offlineQueue.processPendingEvents();
console.log(`Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`);

// Get queue statistics
const stats = await this.offlineQueue.getQueueStats();
console.log(`Pending: ${stats.pending}, Synced: ${stats.synced}, Failed: ${stats.failed}`);

// Retry all failed events
const retriedCount = await this.offlineQueue.retryFailedEvents();
console.log(`Reset ${retriedCount} failed events to pending`);

// Get pending events for specific employee
const pendingForEmployee = await this.offlineQueue.getPendingEventsForEmployee(employeeId);
```

### Simulating Event Bus Outage (Testing)

```typescript
// Simulate Event Bus unavailability
this.eventBus.setAvailability(false);

// Events will now be queued offline
await this.offlineQueue.emitOrQueue(event); // Returns false, queued offline

// Simulate Event Bus reconnection
this.eventBus.setAvailability(true);

// Process pending events (normally done by scheduled task)
await this.offlineQueue.processPendingEvents(); // Events will be replayed
```

## Database Schema

Events are stored in the `offline_action_queue` table:

```sql
CREATE TABLE offline_action_queue (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      UUID NOT NULL REFERENCES employees(id),
  action_type      VARCHAR NOT NULL,
  action_payload   JSONB NOT NULL,
  client_timestamp TIMESTAMP NOT NULL,
  sync_status      VARCHAR DEFAULT 'pending',
  synced_at        TIMESTAMP,
  sync_error       TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_offline_employee (employee_id),
  INDEX idx_offline_sync_status (sync_status),
  INDEX idx_offline_created_at (created_at)
);
```

### Sync Status Values

- `pending`: Event is waiting to be synced
- `synced`: Event successfully synced to Event Bus
- `failed`: Event permanently failed after max retries

### Retry Count Tracking

The `sync_error` field stores retry information in format:
```
"Retry attempt X: <error message>"
```

This allows the service to track retry attempts and implement backoff delays.

## Scheduled Tasks

### Process Pending Events (Every 1 minute)
```typescript
@Cron(CronExpression.EVERY_MINUTE)
async processPendingEvents()
```
- Processes up to 50 pending events per run
- Respects exponential backoff delays
- Marks events as synced or failed

### Cleanup Old Events (Daily at 2 AM)
```typescript
@Cron('0 2 * * *')
async cleanupOldEvents()
```
- Deletes synced events older than 90 days
- Maintains compliance with retention policy (Requirement 21.9)
- Prevents database bloat

### Log Queue Stats (Every 5 minutes)
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async logQueueStats()
```
- Monitors queue health
- Logs pending and failed event counts
- Helps identify persistent Event Bus issues

## Monitoring and Troubleshooting

### Queue Statistics

```bash
# View queue stats in application logs
grep "Offline Queue Stats" logs/application.log

# Expected output:
# Offline Queue Stats: 10 pending, 1523 synced, 2 failed (1535 total)
```

### Failed Events

When events fail permanently after 5 retries:
```bash
# View failed events in logs
grep "permanently failed" logs/application.log

# Expected output:
# Event queue-abc123 permanently failed: Max retry attempts (5) exceeded
```

To retry failed events:
```typescript
// Reset all failed events to pending for manual retry
await offlineQueueService.retryFailedEvents();
```

### Event Processing

```bash
# Monitor event processing
grep "Offline event processing complete" logs/application.log

# Expected output:
# Offline event processing complete: 15 succeeded, 2 failed out of 17 processed
```

## Testing

Comprehensive unit tests are provided in `offline-event-queue.service.spec.ts`:

```bash
# Run tests
npx vitest run --config backend/vitest.config.ts src/core/hr/services/offline-event-queue.service.spec.ts
```

### Test Coverage

- ✅ Queue event when Event Bus unavailable
- ✅ Store complete event data in action_payload
- ✅ Emit event when Event Bus available
- ✅ Queue event when Event Bus unavailable
- ✅ Process pending events and emit to Event Bus
- ✅ Implement exponential backoff for retries
- ✅ Mark event as failed after max retry attempts
- ✅ Process events in batches (50 per run)
- ✅ Prevent concurrent processing
- ✅ Return queue statistics
- ✅ Clean up old synced events (90 days)
- ✅ Retry failed events
- ✅ Get pending events for specific employee
- ✅ Calculate correct backoff delays
- ✅ **Requirement 21.13**: Local queue when Event Bus unavailable
- ✅ **Requirement 21.13**: Retry mechanism with exponential backoff
- ✅ **Requirement 21.13**: Replay queued events when Event Bus reconnects

## Performance Considerations

### Batch Processing
- Processes 50 events per minute maximum
- Prevents overwhelming the Event Bus during recovery
- Prioritizes oldest events first (FIFO)

### Exponential Backoff
- Prevents rapid retry storms
- Gives Event Bus time to recover
- Reduces database load during outages

### Concurrent Processing Protection
- Only one processing job runs at a time
- Prevents race conditions
- Ensures event ordering

### Database Indexes
- Efficient queries on `employee_id`, `sync_status`, `created_at`
- Fast retrieval of pending events
- Optimized cleanup queries

## Module Registration

The Offline Event Queue Service is registered in the HR Module:

```typescript
// In hr.module.ts
import { OfflineEventQueueService } from './services/offline-event-queue.service';
import { OfflineQueueProcessorScheduler } from './services/offline-queue-processor.scheduler';

@Module({
  providers: [
    EventBusService,
    OfflineEventQueueService,
    OfflineQueueProcessorScheduler,
    ...
  ],
  exports: [
    EventBusService,
    OfflineEventQueueService,
    ...
  ],
})
export class HRModule {}
```

Ensure `ScheduleModule` is imported in `AppModule`:

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Required for scheduled tasks
    HRModule,
    ...
  ],
})
export class AppModule {}
```

## Security Considerations

- **Data Integrity**: Events are queued atomically with database transactions
- **Ordering Guarantee**: Processes events by creation time (FIFO)
- **Audit Trail**: All queuing, retry attempts, and failures are logged
- **Authorization**: Employee ID filtering ensures data access control
- **Error Handling**: Graceful degradation with detailed error logging

## Future Enhancements

1. **Priority Queue**: Prioritize certain event types (e.g., clock-in over check-in)
2. **Dead Letter Queue**: Separate storage for permanently failed events
3. **Admin Dashboard**: Web UI for monitoring and managing offline queue
4. **Alert System**: Notifications when failed event count exceeds threshold
5. **Metrics Export**: Prometheus/Grafana integration for queue monitoring
6. **Compression**: Compress action_payload for large events

## Files

- `offline-event-queue.service.ts` - Main service implementation
- `offline-event-queue.service.spec.ts` - Unit tests (17 tests, all passing)
- `offline-queue-processor.scheduler.ts` - Scheduled task implementation
- `OFFLINE_QUEUE_README.md` - This documentation file

## Conclusion

The Offline Event Queue Service provides robust event handling during Event Bus outages, ensuring zero event loss and automatic recovery. It fully complies with Requirement 21.13 and integrates seamlessly with the TARA Event Bus architecture.
