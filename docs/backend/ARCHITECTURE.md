# Architecture

## System Overview

TARA is an event-driven, dual-interface HR management system built on a monorepo structure with a React frontend and NestJS backend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │  Web Interface   │    │   Mobile Interface (PWA)    │    │
│  │  (Desktop/Tablet)│    │   (Phone - 320-428px)       │    │
│  │  HR & Supervisors│    │   All Employees             │    │
│  └────────┬─────────┘    └──────────────┬──────────────┘    │
└───────────┼─────────────────────────────┼───────────────────┘
            │         Vite Proxy          │
            └──────────────┬──────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    API GATEWAY (NestJS)                       │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Auth   │  │ Throttle │  │ Validation│  │  Context  │   │
│  │  Guard  │  │  Guard   │  │   Pipe    │  │  Filter   │   │
│  └─────────┘  └──────────┘  └───────────┘  └───────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                   APPLICATION LAYER                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              7 AUTONOMOUS AGENTS                     │    │
│  │  Leave Request │ Absensi │ Clock Confirm │ Weekly   │    │
│  │  Late Report   │ Onboarding │ Saldo Cuti            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────┐    │
│  │   HR Services    │  │   Payroll    │  │  Schedule  │    │
│  │  (Employee, Dept │  │  (Periods,   │  │  (Shifts,  │    │
│  │   Leave, Attend) │  │   Payslips)  │  │   Assign)  │    │
│  └──────────────────┘  └──────────────┘  └────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    EVENT BUS                          │   │
│  │  Emit → Persist → Dispatch → External Consumers     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────────┐  ┌──────────┐  ┌────────────────┐    │
│  │   PostgreSQL     │  │  Redis   │  │   Backup       │    │
│  │   + PostGIS      │  │ (Cache)  │  │   Storage      │    │
│  └──────────────────┘  └──────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Event-Driven** — All mutations emit structured events consumed by agents and external systems (Hermes AI).
2. **Dual Interface** — Web (administrative) and Mobile (self-service) with context-based access control.
3. **Autonomous Agents** — 7 independent agents operate 24/7 with configurable enable/disable.
4. **Manual Override** — Every automated action can be performed manually by HR.
5. **Single Source of Truth** — PostgreSQL is the authoritative data store; all agents read/write the same tables.

## Module Structure

```
backend/src/
├── app.module.ts              # Root module registration
├── main.ts                    # Bootstrap & server config
├── persistence/               # Database layer (Prisma)
├── scripts/                   # Seed & utility scripts
├── core/
│   ├── auth/                  # JWT auth, guards, context
│   ├── hr/                    # Main HR module
│   │   ├── agents/            # 7 autonomous agents
│   │   ├── hermes/            # Hermes AI integration
│   │   │   ├── executors/     # Action executors (notification, follow-up, query)
│   │   │   ├── hermes-action.controller.ts
│   │   │   ├── hermes-suggestion.controller.ts
│   │   │   ├── hermes-events.controller.ts
│   │   │   └── hermes-safety.service.ts
│   │   ├── services/          # Business logic
│   │   ├── controllers/       # REST endpoints
│   │   ├── events/            # WebSocket event streaming
│   │   ├── i18n/              # Internationalization
│   │   └── scope/             # Context-based filtering
│   ├── settings/              # System configuration
│   └── demo/                  # Demo mode (mock data)
└── shared/
    ├── audit/                 # Audit logging
    ├── cache/                 # In-memory cache
    └── logger/                # Structured logging
```

## Context-Based Access Control

| User | Interface | Context | Data Access |
|------|-----------|---------|-------------|
| HR_Admin | Web | Administrative | All employees, all data |
| HR_Admin | Mobile | Personal Employee | Own data only |
| Supervisor | Web | Supervisor | Team data |
| Employee | Mobile | Personal Employee | Own data only |

## Communication Patterns

- **Frontend → Backend:** REST API via Nginx proxy (`/api/` → `/v1/`)
- **Real-time:** WebSocket (Socket.IO) for notifications and live updates
- **Agent → Agent:** Event Bus (NestJS EventEmitter2, in-process)
- **Hermes AI → TARA:** REST API (`/v1/hermes/actions`, `/v1/hermes/query`, `/v1/hermes/suggestions`)
- **TARA → Hermes AI:** WebSocket Event Stream (`/event-stream` namespace)
- **Notifications:** Multi-channel delivery (In-app, WhatsApp, Telegram, Email)

## Hermes Agentic AI Integration

Hermes is an external LLM-based agentic system that plugs into TARA:

```
┌─────────────────────────────────────────────────┐
│                 HERMES (LLM Agent)              │
│                                                 │
│  Reads events ←── WebSocket /event-stream       │
│  Queries data ←── POST /v1/hermes/query         │
│  Safe actions ──→ POST /v1/hermes/actions        │
│  Suggestions ──→ POST /v1/hermes/suggestions     │
└─────────────────────────────────────────────────┘
```

**Design Principles:**
- Hermes is read-mostly: observes events, queries data
- Safe automation only: reminders, encouragement, deadline notices
- All decisions require human approval via the suggestion queue
- Safety guardrails: rate limits, daily caps, blocked action types
- Full audit trail in `hermes_action_logs` table

See: [`backend/src/core/hr/hermes/README.md`](../backend/src/core/hr/hermes/README.md)
