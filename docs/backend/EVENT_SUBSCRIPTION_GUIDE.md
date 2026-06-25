# Event Consumer Subscription Guide

## Overview

The TARA Event Subscription mechanism provides real-time event streaming for external consumers (like Hermes_Agentic) to subscribe to HR system events via WebSocket.

**Requirements:** 21.8, 21.14

## Features

- **WebSocket-based real-time streaming**: Events delivered within 500ms of emission (Requirement 21.12)
- **Event type filtering**: Subscribe to specific event types or wildcard patterns
- **Multiple concurrent consumers**: Support for multiple consumers without message loss (Requirement 21.8)
- **Automatic connection management**: Handles disconnections and reconnections gracefully
- **Subscription statistics**: REST API for monitoring active subscriptions

## Connection

### WebSocket Endpoint

```
ws://[host]:[port]/event-stream?consumerName=YourConsumerName
```

**Query Parameters:**
- `consumerName` (optional): Identifier for your consumer (e.g., 'Hermes_Agentic')

### Example Connection (JavaScript/Node.js)

```javascript
const io = require('socket.io-client');

const socket = io('ws://localhost:3000/event-stream', {
  query: { consumerName: 'Hermes_Agentic' },
  transports: ['websocket']
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { subscriptionId: '...', message: '...', timestamp: '...' }
});
```

### Example Connection (Python)

```python
import socketio

sio = socketio.Client()

@sio.on('connected')
def on_connected(data):
    print('Connected:', data)

sio.connect('ws://localhost:3000/event-stream', 
            transports=['websocket'],
            query={'consumerName': 'Hermes_Agentic'})
```

## Subscription

### Subscribe to Event Types

After connecting, send a `subscribe` message with the event types you want to receive:

```javascript
// Subscribe to specific event types
socket.emit('subscribe', {
  eventTypes: ['attendance.clock_in', 'leave.request.submitted']
});

socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
  // { subscriptionId: '...', eventTypes: [...], message: '...', timestamp: '...' }
});
```

### Event Type Patterns

#### All Events
```javascript
socket.emit('subscribe', { eventTypes: ['*'] });
```

#### Specific Event
```javascript
socket.emit('subscribe', { eventTypes: ['attendance.clock_in'] });
```

#### Wildcard Patterns
```javascript
// All attendance events (attendance.clock_in, attendance.clock_out, attendance.tardiness_detected)
socket.emit('subscribe', { eventTypes: ['attendance.*'] });

// Multiple patterns
socket.emit('subscribe', { 
  eventTypes: ['attendance.*', 'leave.*', 'onboarding.step_completed'] 
});
```

## Receiving Events

Listen to the `event` message to receive real-time events:

```javascript
socket.on('event', (eventData) => {
  console.log('Event received:', eventData);
  
  // Event structure:
  // {
  //   event_id: string,
  //   event_type: string,
  //   timestamp: string (ISO 8601),
  //   tenant_id: string,
  //   actor_id: string | null,
  //   entity_id: string,
  //   entity_type: string,
  //   payload: object,
  //   correlation_id: string,
  //   version: number
  // }
});
```

### Example Event Types

Based on TARA requirements (Requirement 21.1-21.6):

| Event Type | Description | Requirement |
|------------|-------------|-------------|
| `leave.request.submitted` | Employee submitted leave request | 21.1 |
| `leave.request.approved` | Leave request approved by supervisor | 21.1 |
| `leave.request.rejected` | Leave request rejected | 21.1 |
| `attendance.clock_in` | Employee clocked in | 21.2 |
| `attendance.clock_out` | Employee clocked out | 21.2 |
| `attendance.tardiness_detected` | Tardiness detected | 21.2 |
| `warning_letter.issued` | Warning letter issued to employee | 21.3 |
| `onboarding.step_completed` | Onboarding step completed | 21.4 |
| `leave_balance.updated` | Leave balance updated | 21.5 |
| `weekly_checkin.submitted` | Weekly check-in form submitted | 21.6 |

## Subscription Management

### Check Subscription Status

```javascript
socket.emit('status');

socket.on('status', (data) => {
  console.log('Subscription status:', data);
  // {
  //   subscriptionId: string,
  //   consumerName: string,
  //   eventTypes: string[],
  //   createdAt: Date,
  //   lastActivityAt: Date
  // }
});
```

### Update Subscription Filters

```javascript
// Change subscribed event types
socket.emit('subscribe', {
  eventTypes: ['leave.*', 'attendance.clock_in']
});
```

### Unsubscribe from All Events

```javascript
socket.emit('unsubscribe');

socket.on('unsubscribed', (data) => {
  console.log('Unsubscribed:', data);
});
```

## Error Handling

Listen to the `error` event for subscription errors:

```javascript
socket.on('error', (error) => {
  console.error('Subscription error:', error);
  // { message: string, subscriptionId: string }
});
```

## Connection Management

### Handle Disconnections

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Subscription is automatically removed on disconnect
});
```

### Reconnection

```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  
  // Re-subscribe after reconnection
  socket.emit('subscribe', {
    eventTypes: ['attendance.*', 'leave.*']
  });
});
```

## REST API

### Get Subscription Statistics

```
GET /api/events/subscriptions/stats
```

**Response:**
```json
{
  "totalSubscriptions": 3,
  "subscriptionsByConsumer": {
    "Hermes_Agentic": 2,
    "DataAnalytics": 1
  },
  "subscriptions": [
    {
      "subscriptionId": "abc123",
      "consumerName": "Hermes_Agentic",
      "eventTypes": ["attendance.*"],
      "createdAt": "2024-01-15T10:00:00Z",
      "lastActivityAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Health Check

```
GET /api/events/subscriptions/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "event-stream",
  "activeSubscriptions": 3,
  "timestamp": "2024-01-15T10:35:00Z"
}
```

## Complete Example: Hermes_Agentic Consumer

```javascript
const io = require('socket.io-client');

class HermesAgenticConsumer {
  constructor(eventStreamUrl) {
    this.socket = io(eventStreamUrl, {
      query: { consumerName: 'Hermes_Agentic' },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.socket.on('connected', (data) => {
      console.log('[Hermes] Connected to TARA Event Stream:', data.subscriptionId);
      this.subscribeToEvents();
    });
    
    this.socket.on('subscribed', (data) => {
      console.log('[Hermes] Subscribed to events:', data.eventTypes);
    });
    
    this.socket.on('event', (event) => {
      this.handleEvent(event);
    });
    
    this.socket.on('error', (error) => {
      console.error('[Hermes] Subscription error:', error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('[Hermes] Disconnected:', reason);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Hermes] Reconnected after', attemptNumber, 'attempts');
      this.subscribeToEvents();
    });
  }
  
  subscribeToEvents() {
    // Subscribe to all HR events for AI agent processing
    this.socket.emit('subscribe', {
      eventTypes: [
        'attendance.*',
        'leave.*',
        'onboarding.*',
        'weekly_checkin.*',
        'warning_letter.*'
      ]
    });
  }
  
  handleEvent(event) {
    console.log(`[Hermes] Event received: ${event.event_type}`, event);
    
    // Route to appropriate AI agent handler
    switch (event.event_type) {
      case 'attendance.clock_in':
      case 'attendance.clock_out':
        this.processAttendanceEvent(event);
        break;
        
      case 'leave.request.submitted':
        this.processLeaveRequestEvent(event);
        break;
        
      case 'attendance.tardiness_detected':
        this.processTardinessEvent(event);
        break;
        
      default:
        console.log(`[Hermes] Unhandled event type: ${event.event_type}`);
    }
  }
  
  processAttendanceEvent(event) {
    // Implement AI logic for attendance monitoring
    console.log('[Hermes] Processing attendance event:', event.entity_id);
  }
  
  processLeaveRequestEvent(event) {
    // Implement AI logic for leave request analysis
    console.log('[Hermes] Processing leave request:', event.entity_id);
  }
  
  processTardinessEvent(event) {
    // Implement AI logic for tardiness patterns
    console.log('[Hermes] Processing tardiness event:', event.entity_id);
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const hermesConsumer = new HermesAgenticConsumer('ws://localhost:3000/event-stream');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Hermes] Shutting down...');
  hermesConsumer.disconnect();
  process.exit(0);
});
```

## Performance Considerations

- **Event Delivery**: Events are delivered within 500ms of emission (Requirement 21.12)
- **Concurrent Consumers**: Supports multiple consumers without message loss (Requirement 21.8)
- **Event Persistence**: Events are persisted for 90 days for replay capability (Requirement 21.9)
- **Network Efficiency**: WebSocket provides bidirectional communication with minimal overhead

## Security Considerations

**Note:** Current implementation provides open access to event streams. For production deployment, consider:

1. **Authentication**: Implement token-based authentication for consumers
2. **Authorization**: Restrict event types based on consumer permissions
3. **Rate Limiting**: Prevent abuse by limiting connections per consumer
4. **Encryption**: Use WSS (WebSocket Secure) in production
5. **Tenant Isolation**: Ensure consumers only receive events for their tenant

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to WebSocket endpoint

**Solution:**
- Verify the endpoint URL is correct
- Check if the TARA backend is running
- Ensure firewall allows WebSocket connections
- Check CORS configuration

### Not Receiving Events

**Problem:** Connected but no events are received

**Solution:**
- Verify you've sent a `subscribe` message after connection
- Check that your event type filters match the events being published
- Review subscription status with `status` message
- Check subscription statistics at `/api/events/subscriptions/stats`

### Events Delayed

**Problem:** Events are received later than expected

**Solution:**
- Check network latency between consumer and TARA backend
- Monitor subscription statistics for connection health
- Ensure EventBusService is properly publishing events
- Review server logs for event processing delays

## Support

For issues or questions about the Event Subscription mechanism:
1. Check subscription health: `GET /api/events/subscriptions/health`
2. Review subscription statistics: `GET /api/events/subscriptions/stats`
3. Check server logs for event processing errors
4. Verify EventBusService is publishing events correctly
