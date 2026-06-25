# Hermes Integration Guide — Plug-and-Play Setup

## TL;DR

```typescript
// In your app module:
import { HermesModule } from './path-to/hermes/hermes.module';

@Module({
  imports: [
    HermesModule.forRoot({
      notificationService: YourNotificationService,
      integrationService: YourHermesConfigService,
      eventBusService: YourEventBusService,  // optional
      whatsAppAgent: YourWhatsAppAgent,      // optional
      imports: [PersistenceModule],
    }),
  ],
})
export class AppModule {}
```

That's it. Three controllers, safety guardrails, rate limiting, audit logging — all active.

---

## Step-by-Step Integration

### 1. Copy the `hermes/` folder into your project

Copy the entire `src/core/hr/hermes/` directory into your backend. The folder is self-contained — no imports reach outside of it except:
- `PrismaService` (for database access)
- `JwtGuard` (for HR-facing suggestion endpoints)

### 2. Ensure database tables exist

Hermes requires these Prisma models in your schema:

```prisma
model HermesActionLog {
  id              String   @id @default(uuid())
  agent_id        String
  action_type     String
  parameters      Json
  authority_level String
  status          String   // success, failed, rate_limited, authority_denied, safety_blocked
  result          Json?
  error_message   String?
  execution_ms    Int?
  created_at      DateTime @default(now())

  @@map("hermes_action_logs")
}

model HermesSuggestion {
  id                   String    @id @default(uuid())
  agent_id             String
  action_type          String
  target_entity_id     String
  entity_type          String
  suggestion           Json
  reasoning            String
  confidence           Float?
  correlation_event_id String?
  status               String    @default("pending") // pending, accepted, rejected, expired
  expires_at           DateTime?
  reviewed_by          String?
  reviewed_at          DateTime?
  review_notes         String?
  created_at           DateTime  @default(now())

  @@map("hermes_suggestions")
}

model HermesFollowUp {
  id                  String    @id @default(uuid())
  agent_id            String
  recipient_id        String
  title               String
  message             String
  scheduled_at        DateTime
  context_entity_id   String?
  context_entity_type String?
  status              String    @default("pending") // pending, delivered, cancelled, failed
  delivered_at        DateTime?
  created_at          DateTime  @default(now())

  @@map("hermes_follow_ups")
}
```

### 3. Implement the required adapters

#### A. Notification Service Adapter (REQUIRED)

Your notification service must implement this interface:

```typescript
interface IHermesNotificationAdapter {
  sendNotification(payload: {
    recipient_id: string;
    type: string;        // e.g., 'general_notification'
    visibility: string;  // 'private' or 'public'
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string } | null>;

  sendBulkNotification(payload: {
    recipient_ids: string[];
    type: string;
    visibility: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<any>;
}
```

If you already have a `NotificationService`, you can often use it directly — just ensure the method signatures match.

#### B. Integration/Config Service Adapter (REQUIRED)

Manages Hermes config (API keys, enabled state, registered agents):

```typescript
interface IHermesIntegrationService {
  getConfig(): Promise<{
    enabled: boolean;
    api_key: string;
    agents: Array<{
      id: string;
      name: string;
      is_enabled: boolean;
      authority_level: 'read_only' | 'read_write' | 'full_autonomous';
    }>;
  }>;
}
```

The simplest implementation reads from environment variables:

```typescript
@Injectable()
export class SimpleHermesConfigService {
  async getConfig() {
    return {
      enabled: process.env.HERMES_ENABLED === 'true',
      api_key: process.env.HERMES_API_KEY || '',
      agents: [
        {
          id: 'default-agent',
          name: 'Hermes AI',
          is_enabled: true,
          authority_level: 'read_write' as const,
        },
      ],
    };
  }
}
```

#### C. Event Bus Service Adapter (OPTIONAL)

If you want Hermes to emit events when suggestions are created/accepted/rejected:

```typescript
interface IHermesEventBusAdapter {
  emit(event: {
    event_type: string;
    actor: { id: string; type: string };
    entity: { id: string; type: string };
    payload: Record<string, any>;
  }): Promise<void>;
}
```

#### D. WhatsApp Agent (OPTIONAL)

Only needed if your app has WhatsApp integration:

```typescript
interface IHermesWhatsAppAdapter {
  executeReply(params: {
    employee_id: string;
    message: string;
    hermes_agent_id: string;
    buttons?: Array<{ id: string; title: string }>;
  }): Promise<any>;
}
```

### 4. Register the module

```typescript
import { Module } from '@nestjs/common';
import { HermesModule } from './core/hr/hermes/hermes.module';
import { PersistenceModule } from './persistence/persistence.module';
import { NotificationService } from './services/notification.service';
import { SimpleHermesConfigService } from './services/hermes-config.service';

@Module({
  imports: [
    PersistenceModule,
    HermesModule.forRoot({
      notificationService: NotificationService,
      integrationService: SimpleHermesConfigService,
      // eventBusService: EventBusService,   // uncomment if you have one
      // whatsAppAgent: WhatsAppAgent,       // uncomment if you have one
      imports: [PersistenceModule],
    }),
  ],
})
export class AppModule {}
```

### 5. Add environment variables

```env
HERMES_ENABLED=true
HERMES_API_KEY=your-secure-api-key-here
```

### 6. Test it

```bash
# Get action catalog
curl -H "X-Hermes-Api-Key: your-secure-api-key-here" \
  http://localhost:3000/hermes/actions/catalog

# Send a reminder
curl -X POST http://localhost:3000/hermes/actions \
  -H "X-Hermes-Api-Key: your-secure-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_reminder",
    "params": {
      "recipient_id": "employee-uuid",
      "title": "Submit your timesheet",
      "message": "Your weekly timesheet is due by Friday 5pm."
    }
  }'
```

---

## What You Get Out of the Box

| Feature | Included |
|---------|----------|
| API key authentication | ✅ |
| Agent authority levels (read_only, read_write) | ✅ |
| Rate limiting (60 actions/hour/agent) | ✅ |
| Safety guardrails (spam prevention, blocked types) | ✅ |
| Full audit logging | ✅ |
| Human-in-the-loop suggestions | ✅ |
| Scheduled follow-up delivery (cron) | ✅ |
| Event replay for catch-up | ✅ |
| Multi-agent support | ✅ |

---

## Architecture

```
Your App
  └── HermesModule.forRoot({...})
        ├── HermesActionController    → /hermes/actions, /hermes/actions/catalog
        ├── HermesSuggestionController → /hermes/suggestions
        ├── HermesEventsController    → /hermes/events/replay, audit, stats
        ├── HermesApiKeyGuard         → validates X-Hermes-Api-Key
        ├── HermesAuthorityGuard      → enforces authority levels
        ├── HermesRateLimitGuard      → 60 req/hour sliding window
        ├── HermesSafetyService       → content limits, duplicate suppression
        ├── HermesAuditService        → logs everything
        ├── HermesSuggestionService   → human-in-the-loop queue
        ├── HermesFollowUpProcessor   → cron delivers scheduled messages
        └── Executors
              ├── NotificationExecutor → sends via YOUR NotificationService
              ├── FollowUpExecutor     → schedules future notifications
              └── QueryExecutor        → reads data via Prisma
```

---

## FAQ

**Q: Does my app need WhatsApp to use Hermes?**
No. WhatsApp is optional. If not provided, `send_whatsapp_reply` actions will return a clear error.

**Q: Does my app need an EventBus?**
No. If not provided, suggestion events just won't be emitted. Everything else works.

**Q: Can I customize the safety limits?**
Yes — modify `DEFAULT_SAFETY_CONFIG` in `hermes.interfaces.ts` or extend `HermesSafetyService`.

**Q: What about the suggestion controller's JWT auth?**
The suggestion list/accept/reject endpoints use `JwtGuard`. Your app's `AuthModule` must export this guard. If your JWT guard has a different name, update the import in `hermes-suggestion.controller.ts`.

**Q: How do I add custom query types?**
Extend `HermesQueryType` in `hermes.interfaces.ts` and add a case in `query.executor.ts`.
