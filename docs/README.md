# TARA Documentation

All project documentation organized by category.

## AI / LLM Onboarding (start here)

| Document | Description |
|----------|-------------|
| [agents.md](../agents.md) | Codebase map, conventions, agents, workflow engine — for coding agents |
| [prd.md](../prd.md) | Product requirements, personas, v2.1 features, DoD |
| [designs.md](../designs.md) | Design system, UX patterns, mobile PWA rules |

## Backend

| Document | Description |
|----------|-------------|
| [Architecture](./backend/ARCHITECTURE.md) | System architecture, layers, design decisions |
| [API Reference](./backend/API.md) | All endpoints, request/response, authentication |
| [Database Schema](./backend/DATABASE.md) | Tables, relations, indexing strategy |
| [Agents](./backend/AGENTS.md) | 8 autonomous agents, triggers, outputs |
| [Security](./backend/SECURITY.md) | Auth, authorization, encryption, OWASP |
| [Event Bus](./backend/EVENT_BUS.md) | Domain event system, emit/subscribe patterns |
| [Event Subscriptions](./backend/EVENT_SUBSCRIPTION_GUIDE.md) | WebSocket event stream for external consumers |
| [Notification Privacy](./backend/NOTIFICATION_PRIVACY_RULES.md) | Privacy rules for notification content |
| [Offline Queue](./backend/OFFLINE_QUEUE.md) | Offline event queue for resilience |

## Frontend

| Document | Description |
|----------|-------------|
| [Frontend Guide](./frontend/FRONTEND.md) | Routing, design system, themes, components |

## Hermes (AI Agent Integration)

| Document | Description |
|----------|-------------|
| [Hermes Module](./hermes/HERMES_MODULE.md) | Backend module architecture, API endpoints, safety guardrails |
| [Hermes SDK](./hermes/HERMES_SDK.md) | TypeScript SDK for separate VPS — REST, WebSocket, SSH tunnel |
| [Setup Instructions](./hermes/SETUP_INSTRUCTIONS.md) | Step-by-step: TARA VPS config + Hermes VPS setup |
| [Integration Guide](./hermes/INTEGRATION_GUIDE.md) | Two strategies: separate VPS (SDK) vs embedded (NestJS module) |
| [WhatsApp Agent](./hermes/WHATSAPP_AGENT.md) | WhatsApp integration via Kapso |

## Deployment

| Document | Description |
|----------|-------------|
| [Deployment Guide](./DEPLOYMENT.md) | Docker, environment variables, production setup |

## Internal (Implementation Notes)

Task-specific implementation summaries. Reference only.

| Document | Description |
|----------|-------------|
| [Task 7.4](./internal/TASK_7.4_SERVICES.md) | Services implementation |
| [Task 11.1](./internal/TASK_11.1_SERVICES.md) | Services implementation |
| [Task 11.3](./internal/TASK_11.3_AGENTS.md) | Agent implementation |
| [Task 11.6](./internal/TASK_11.6_TESTS.md) | Test summary |
| [Task 12.4](./internal/TASK_12.4_AGENTS.md) | Agent implementation |
| [Task 13.2](./internal/TASK_13.2_SERVICES.md) | Services implementation |
| [Events](./internal/EVENTS_IMPLEMENTATION.md) | Event stream implementation |
