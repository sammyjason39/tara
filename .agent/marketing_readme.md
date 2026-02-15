# Zenvix Core — Marketing Workspace (Locked)

## 1. Overview

The **Marketing Workspace** is the demand-generation environment of Zenvix.

It manages:

- Campaign creation and automation
- Lead capture from multi-channel sources
- AI-based scoring and qualification
- Real-time lead handoff into Sales Workspace
- ROI attribution across the business OS

Marketing in Zenvix is not just advertising —
it is a **real-time pipeline feeder** into Sales.

---

## 2. Core Goals

1. Centralize campaign execution across channels
2. Capture and enrich leads in real time
3. Score and qualify leads automatically using AI
4. Reduce dependency on external CRMs and marketing suites
5. Integrate deeply with Sales + Finance attribution
6. Provide enterprise-safe campaign governance

---

## 3. Core Responsibilities

Marketing Workspace owns:

- Lead generation campaigns
- Multi-channel nurturing workflows
- Lead qualification thresholds
- Campaign performance analytics
- External ad platform connections (Meta, Google)

Sales owns conversion.
Marketing owns pipeline input quality.

---

## 4. Marketing Engines & Services

| Engine / Service              | Responsibility                                |
| ----------------------------- | --------------------------------------------- |
| Campaign Service              | Campaign creation, scheduling, execution      |
| Lead Capture Service          | Forms, landing pages, ads lead ingestion      |
| Lead Enrichment Engine        | Deduplication, firmographic enrichment        |
| AI Lead Scoring Engine        | Conversion probability + priority ranking     |
| Nurturing Workflow Engine     | Automated sequences across channels           |
| Analytics & ROI Engine        | Attribution, spend vs revenue, KPI dashboards |
| Notification Engine           | Lead spikes, campaign failures, SLA alerts    |
| Integration Engine            | Meta Ads, Google Ads, WhatsApp channels       |
| Connected Accounts (Settings) | OAuth login, token refresh, permissions       |
| Security & Audit Engine       | Governance, compliance, audit logging         |

---

## 5. External Ads Integration (Meta + Google)

### Supported via API

Zenvix can:

- Create campaigns from Zenvix UI
- Push campaigns into Meta Ads + Google Ads
- Pull performance metrics back into dashboards
- Capture lead form submissions directly

APIs are free.
Ad spend is paid externally.

---

## 6. Connected Accounts Requirement (Settings Module)

Marketing requires OAuth-based external login.

Settings Workspace will provide:

- Meta Business OAuth connection
- Google Ads OAuth connection
- Token storage + refresh logic
- Permission audit + reconnection UI

Marketing cannot pull ads data without Connected Accounts.

---

## 7. Lead Capture Sources

### Owned Sources

- Zenvix landing pages
- Embedded forms
- Chatbots
- Webinars/events

### External Sources

- Meta Lead Ads
- Google Ads conversions
- LinkedIn Lead Forms (future)
- Partner API ingestion

All leads normalize into one Lead Record system.

---

## 8. Real-Time Lead Tracking Architecture

Event-driven pipeline:

Campaign Action  
→ Engagement Event  
→ Lead Capture  
→ AI Scoring  
→ Qualification  
→ Sales Handoff  
→ Attribution Feedback Loop

Implemented via:

- Event Bus (Kafka/RabbitMQ/internal)
- Real-time dashboards
- SLA-based alerts

---

## 9. Marketing UI / UX Design

### Campaign Dashboard

- Active campaigns overview
- Spend + ROI metrics
- AI optimization suggestions
- Channel breakdown (Meta vs Google)

### Lead Capture Dashboard

- Live incoming leads feed
- Lead score + intent level
- Source attribution
- Handoff readiness

### Nurturing Workflow Builder

- Drag-and-drop sequences
- Multi-touch logic (email, WhatsApp, retargeting)
- AI recommended next step

### Connected Accounts Panel

- OAuth login + token status
- Ad account mapping
- Permissions health monitoring

---

## 10. Marketing → Sales Handoff (Core Bridge)

Qualified leads automatically push into Sales Workspace with:

- Priority score
- SLA response timer
- Recommended rep assignment
- Full campaign context

No exports.
No manual CRM syncing.

---

## 11. Competitive Advantage vs HubSpot / GoHighLevel / Zoho

| Competitor Pain Point                  | Zenvix Advantage                        |
| -------------------------------------- | --------------------------------------- |
| Marketing disconnected from operations | Native Sales + Finance + Inventory link |
| High subscription fees                 | Internal-first CRM replacement          |
| Lead handoff delays                    | Real-time event-based routing           |
| Fragmented campaign reporting          | Unified OS-level attribution            |
| Too many integrations                  | Minimal external dependency policy      |

---

## 12. Security & Compliance

- OAuth2 secure token handling
- AES-256 encryption at rest
- TLS 1.3 in transit
- Audit trail for:
  - campaign edits
  - lead scoring changes
  - external sync events
- GDPR / CCPA alignment
- SOC2 / ISO27001 architecture readiness

---

## 13. Module Status (Locked)

Marketing Workspace is locked as a core demand-generation module.

Future expansion must preserve:

- Minimal external dependency policy
- Real-time Sales integration contract
- Full auditability + compliance

---

✅ End of Marketing Workspace README
