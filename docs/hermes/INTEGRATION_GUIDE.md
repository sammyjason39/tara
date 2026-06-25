# Hermes Integration Guide

## Two Integration Strategies

Hermes supports two deployment models depending on where it runs:

---

## Strategy A: Hermes on a Separate VPS (Recommended)

**Use when:** Hermes is a separate service on its own server.

```
┌──────────────────────────┐          ┌──────────────────────────┐
│      HERMES VPS          │  HTTPS   │      YOUR APP VPS        │
│                          │ ──────── │                          │
│  LLM Agent Code          │  WSS     │  TARA Backend            │
│  + @tara/hermes-sdk      │ ◄──────► │  + HermesModule.forRoot()│
└──────────────────────────┘          └──────────────────────────┘
```

### On the Hermes VPS side:

Install the SDK:
```bash
npm install @tara/hermes-sdk
# Or copy packages/hermes-sdk into your project
```

Use it:
```typescript
import { HermesClient } from '@tara/hermes-sdk';

const hermes = new HermesClient({
  baseUrl: 'https://your-tara-app.com',
  apiKey: process.env.HERMES_API_KEY,
  agentId: 'hermes-main',
});

// Query data
const employee = await hermes.getEmployee('uuid');

// Execute actions
await hermes.sendReminder('uuid', 'Title', 'Message');

// Listen to events
hermes.events.on('event', handleEvent);
await hermes.events.connect({ eventTypes: ['attendance.*'] });
```

See `packages/hermes-sdk/README.md` for full API reference and `packages/hermes-sdk/examples/` for complete agent examples.

### On the host app side:

Just ensure the Hermes endpoints are active:
```typescript
// In your app module (NestJS):
HermesModule.forRoot({
  notificationService: NotificationService,
  integrationService: HermesIntegrationService,
  imports: [PersistenceModule],
})
```

Set environment variables:
```env
HERMES_ENABLED=true
HERMES_API_KEY=same-key-as-hermes-vps
```

---

## Strategy B: Hermes Embedded (Same Server)

**Use when:** Hermes code runs inside the same NestJS application.

```typescript
@Module({
  imports: [
    HermesModule.forRoot({
      notificationService: NotificationService,
      integrationService: HermesIntegrationService,
      eventBusService: EventBusService,
      whatsAppAgent: WhatsAppAgent,
      imports: [PersistenceModule],
    }),
  ],
})
export class AppModule {}
```

This registers all Hermes controllers, guards, and services as part of your NestJS app. Hermes accesses the database directly (no HTTP calls between them).

---

## What the Host App Must Expose

Regardless of strategy, the host app needs these endpoints active:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/hermes/actions/catalog` | Tool list for LLM |
| POST | `/hermes/actions` | Execute safe actions |
| POST | `/hermes/query` | Query data |
| POST | `/hermes/suggestions` | Submit suggestions |
| GET | `/hermes/events/replay` | Catch up on missed events |
| GET | `/hermes/events/audit` | View action logs |
| GET | `/hermes/events/stats` | Daily stats |
| WS | `/event-stream` | Real-time event stream |

These are all provided by `HermesModule.forRoot()`.

---

## Database Tables Required

```prisma
model HermesActionLog { ... }    // @@map("hermes_action_logs")
model HermesSuggestion { ... }   // @@map("hermes_suggestions")
model HermesFollowUp { ... }     // @@map("hermes_follow_ups")
```

See the full Prisma schema in the Strategy B section of the old guide, or in the migration files.

---

## Network & Security Checklist

- [ ] Hermes VPS can reach host app on HTTPS (port 443 or custom)
- [ ] WebSocket connections allowed through load balancer/reverse proxy
- [ ] `HERMES_API_KEY` is a strong random string (32+ chars)
- [ ] Same API key configured on both sides
- [ ] CORS configured to allow Hermes VPS origin (for WebSocket)
- [ ] Rate limiting: 60 actions/hour/agent (built-in, configurable)
- [ ] TLS/SSL for all communication between VPSes
