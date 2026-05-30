# Zenvix Business Flow Suite v2 - Master Specification

**Version:** 2.0  
**Last Updated:** 2026-05-22  
**Status:** Production-Bound

---

## Executive Summary

Zenvix Business Flow Suite v2 (OpsCore) is a **multi-tenant, modular, local-first business operations platform** designed to support multiple industries through industry-specific modules running on a shared, secure core. The platform scales from small single-location businesses to multi-branch enterprises while remaining configurable without hardcoded UI or business logic.

**Current Focus:** Establishing a production-grade foundation with two initial industry modules: **Cafe** and **Retail**.

---

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CORE LAYER                              │
│  (Identity, Licensing, Configuration, Orchestration)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM LAYER                            │
│  (Device Detection, Runtime UI, Dynamic Routing)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     MODULE LAYER                             │
│  (Cafe, Retail, Future: Healthcare, Manufacturing, etc.)     │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Core First** — Identity, licensing, configuration, and data safety are enforced centrally
2. **Modules, Not Apps** — Industries are implemented as isolated modules, not standalone systems
3. **Configuration Over Code** — Tenant-specific behavior is driven by configuration, not JSX or hardcoded logic

---

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Context API + Reducers (localized)
- **Routing:** React Router v6 (runtime-resolved)
- **Charts:** Recharts
- **Icons:** Lucide React

### Backend
- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 6.2.1
- **Architecture:** Repository Pattern + Event-Driven (EventBus)
- **Error Handling:** RFC 7807 compliant
- **Multi-Tenancy:** Header-based (`x-tenant-id`)

### Infrastructure
- **Deployment:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Hosting:** VPS (Production), Render (Staging)

---

## Core Modules

### 1. Finance Module
**Path:** `backend/src/core/finance/`, `src/pages/core/finance/`

**Capabilities:**
- General Ledger with cryptographic hash chain
- Accounts Receivable (AR) & Accounts Payable (AP)
- Journal Entry Management with reversal support
- Fiscal Period Management (OPEN → SOFT_LOCK → HARD_LOCK → CLOSED)
- Subledger-to-Ledger posting automation
- Multi-currency support
- Financial reporting and dashboards

**Key Services:**
- `LedgerPostingService` - Journal entry creation and posting
- `JournalReversalService` - Journal reversal with double-reversal prevention
- `FiscalPeriodService` - Period lifecycle management
- `ARBillService` - Accounts receivable management
- `APBillService` - Accounts payable management
- `HashingService` - Cryptographic integrity for ledger

**Database Tables:**
- `finance_journal_entries`
- `finance_journal_lines`
- `finance_journal_reversals`
- `finance_fiscal_periods`
- `finance_chart_of_accounts`
- `finance_ar_invoices`
- `finance_ar_payments`

---

### 2. Inventory Module
**Path:** `backend/src/core/inventory/`, `src/pages/core/inventory/`

**Capabilities:**
- Multi-location stock management
- Stock transfers (REQUESTED → PICKED → SHIPPED → IN_TRANSIT → RECEIVED)
- Stock adjustments with approval workflow
- Barcode scanning and SKU generation
- Item master data management
- Stock level tracking (on_hand, available, reserved, in_transit)
- Inventory valuation (FIFO, LIFO, Weighted Average)

**Key Services:**
- `InventoryService` - Core inventory operations
- `StockTransferService` - Transfer lifecycle management
- `ItemImageService` - Image management
- `SKUGeneratorService` - Automatic SKU generation
- `LabelTemplateService` - Label printing

**Database Tables:**
- `item_masters`
- `stock_levels`
- `stock_movements`
- `stock_reservations`
- `inventory_transfers`
- `inventory_adjustments`
- `locations`

---

### 3. HR Module
**Path:** `backend/src/core/hr/`, `src/pages/core/HR/`

**Capabilities:**
- Employee lifecycle management
- Attendance tracking
- Leave management
- Payroll processing
- Performance reviews
- Recruitment and onboarding
- Compliance tracking
- Workforce planning

**Key Services:**
- `HRService` - Core HR operations
- `HRAttendanceService` - Attendance tracking
- `HRPayrollService` - Payroll processing
- `HRRecruitmentService` - Recruitment management
- `PayrollEngineService` - Payroll calculation engine
- `ComplianceService` - Compliance tracking

**Database Tables:**
- `employees`
- `hr_attendance_records`
- `hr_payroll_runs`
- `payroll_lines`
- `leave_requests`
- `performance_reviews`
- `job_requisitions`

---

### 4. Retail Module
**Path:** `backend/src/modules/retail/`, `src/pages/retail/`

**Capabilities:**
- Point of Sale (POS) operations
- Shift management (OPEN → CLOSED)
- Cash drawer reconciliation
- Barcode-based checkout
- Multi-channel product sync
- Customer management
- Promotions and discounts
- Offline mode support

**Key Services:**
- `RetailService` - Core retail operations
- `RetailGatewayService` - Multi-channel sync
- `RetailPrintService` - Receipt printing
- `RetailExportService` - Data export

**Database Tables:**
- `retail_orders`
- `retail_order_items`
- `retail_shifts`
- `retail_customers`
- `retail_channels`
- `retail_channel_products`
- `retail_promotions`

---

### 5. Procurement Module
**Path:** `backend/src/core/procurement/`, `src/pages/core/procurement/`

**Capabilities:**
- Purchase requisition management
- Purchase order lifecycle
- Supplier management
- Goods receipt
- Procurement analytics

**Key Services:**
- `ProcurementService` - Core procurement operations

**Database Tables:**
- `procurement_requisitions`
- `procurement_final_pos`
- `procurement_receipts`
- `supplier_masters`

---

### 6. Sales Module
**Path:** `backend/src/core/sales/`, `src/pages/core/sales/`

**Capabilities:**
- Lead management
- Opportunity tracking
- Quote generation
- Sales order management
- Sales analytics

**Key Services:**
- `SalesService` - Core sales operations
- `SalesManagementService` - Sales pipeline management

**Database Tables:**
- `sales_leads`
- `sales_opportunities`
- `sales_quotes`
- `sales_orders`

---

### 7. Marketing Module
**Path:** `backend/src/core/marketing/`, `src/pages/core/marketing/`

**Capabilities:**
- Campaign management
- Lead generation
- Customer segmentation
- Marketing automation
- Social media sync

**Key Services:**
- `MarketingService` - Core marketing operations
- `AutomationEngineService` - Marketing automation
- `SocialSyncService` - Social media integration

**Database Tables:**
- `marketing_campaigns`
- `marketing_leads`
- `marketing_contacts`
- `marketing_workflows`

---

### 8. Payment Module
**Path:** `backend/src/core/payment/`, `src/pages/core/payment/`

**Capabilities:**
- Multi-provider payment processing
- Payment routing policies
- Refund management
- Chargeback handling
- Settlement tracking

**Key Services:**
- `PaymentService` - Core payment operations
- `PaymentReconciliationService` - Settlement reconciliation

**Database Tables:**
- `payment_transactions`
- `payment_refunds`
- `payment_disputes`
- `payment_settlements`

---

### 9. IT Module
**Path:** `backend/src/core/it/`, `src/pages/core/it/`

**Capabilities:**
- Device management
- System health monitoring
- Provisioning requests
- IT asset tracking

**Key Services:**
- `ITService` - Core IT operations
- `WebhookService` - External integrations

**Database Tables:**
- `it_devices`
- `it_device_events`
- `it_provisioning_requests`
- `it_system_health`

---

## Shared Services

### Audit & Logging
**Path:** `backend/src/shared/audit/`, `backend/src/shared/logger/`

**Capabilities:**
- Immutable audit trail with hash chain
- System logging
- Audit report generation

**Key Services:**
- `AuditService` - Audit trail management
- `AuditChainService` - Hash chain integrity
- `LoggerService` - System logging

---

### Communication (Comms)
**Path:** `backend/src/shared/comms/`, `src/pages/core/comms/`

**Capabilities:**
- Real-time chat
- Internal mail system
- Bulletin board
- Notifications

**Key Services:**
- `ChatService` - Real-time messaging
- `MailService` - Internal mail
- `BulletinService` - Bulletin board
- `NotificationService` - Push notifications

---

### Workflow Engine
**Path:** `backend/src/core/workflow/`, `backend/src/shared/workflow/`

**Capabilities:**
- Approval workflows
- Task automation
- Workflow orchestration

**Key Services:**
- `WorkflowOrchestratorService` - Workflow execution
- `WorkflowService` - Workflow management

---

### License Management
**Path:** `backend/src/shared/license/`

**Capabilities:**
- Module licensing per tenant
- License validation
- Access control

**Key Services:**
- `LicenseService` - License management
- `LicenseGuard` - Access enforcement

---

## Multi-Tenancy Architecture

### Tenant Isolation
- **Header-based routing:** `x-tenant-id` header required for all API requests
- **Database-level isolation:** All tables include `tenant_id` column
- **Row-Level Security (RLS):** Enforced at Prisma query level
- **Company-level scoping:** Optional `company_id` for multi-company tenants

### Tenant Context Flow
```
Request → TenantMiddleware → TenantInterceptor → Repository → Database
```

---

## Security Model

### Authentication
- JWT-based authentication
- Session management
- Password hashing (bcrypt)

### Authorization
- Role-based access control (RBAC)
- Permission matrix per module
- Department-level access control

### Roles
- **System Admin** - Full system access
- **Tenant Admin** - Tenant-wide access
- **Department Manager** - Department-level access
- **Staff** - Limited operational access

---

## Data Persistence

### Modes
1. **DB_PERSISTENCE** (Production) - PostgreSQL with full ACID guarantees
2. **LOCAL_FIRST** (Offline) - PGLite with sync-on-reconnect

### Sync Strategy
- Optimistic UI updates
- Background sync queue
- Conflict resolution
- Idempotency keys for all mutations

---

## Error Handling

### RFC 7807 Compliance
All API errors follow RFC 7807 Problem Details format:

```json
{
  "type": "finance/fiscal-period-locked",
  "title": "Fiscal Period Locked",
  "status": 422,
  "detail": "Cannot post journal entry to locked fiscal period 2026-Q1",
  "instance": "/api/finance/journal-entries",
  "tenant_id": "tenant-123",
  "company_id": "company-456"
}
```

---

## Testing Strategy

### Test Types
1. **Unit Tests** - Service-level logic
2. **Integration Tests** - API endpoint testing
3. **E2E Tests** - Playwright for critical flows
4. **System Simulation Tests** - Multi-tenant scenarios

### Test Coverage Goals
- Core Services: 80%+
- Critical Paths: 100%
- Bug Fixes: Regression tests required

---

## Deployment

### Production Environment
- **VPS:** Ubuntu 22.04 LTS
- **Database:** PostgreSQL 14
- **Reverse Proxy:** Nginx
- **Process Manager:** Docker Compose
- **Monitoring:** System health checks

### Environment Variables
See `.env.example` for required configuration

---

## Known Issues & Stabilization

See [core-retail-stabilization spec](./.kiro/specs/core-retail-stabilization/) for:
- Bug tracking (11 confirmed bugs)
- Implementation status
- Fix priorities
- Regression prevention

---

## Future Roadmap

### Phase 1: Stabilization (Current)
- Fix critical bugs
- Improve test coverage
- Performance optimization
- Documentation completion

### Phase 2: Feature Completion
- Complete all core modules
- Advanced reporting
- Mobile app support
- API documentation

### Phase 3: Scale & Expansion
- New industry modules (Healthcare, Manufacturing)
- Advanced analytics
- AI/ML integration
- Multi-region support

---

## References

- [Core Architecture](../PLATFORM_DOCS/CORE_ARCHITECTURE.md)
- [Backend Build](../PLATFORM_DOCS/BACKEND_BUILD.md)
- [Frontend Build](../PLATFORM_DOCS/FRONTEND_BUILD.md)
- [Multi-Tenancy](../PLATFORM_DOCS/MULTI_TENANCY.md)
- [Codebase Map](./CODEBASE_MAP.md)
- [Graphify Mappings](../mappings/)

---

**Document Owner:** Development Team  
**Review Cycle:** Weekly during stabilization phase
