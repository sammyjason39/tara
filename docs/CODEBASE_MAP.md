# Zenvix Business Flow Suite v2 - Codebase Map

**Last Updated:** 2026-05-22  
**Purpose:** Complete reference for navigating the codebase

---

## Directory Structure Overview

```
business-flow-suite-v2/
├── backend/                    # NestJS backend application
│   ├── src/
│   │   ├── core/              # Core business modules
│   │   ├── modules/           # Industry-specific modules
│   │   ├── shared/            # Shared services & utilities
│   │   ├── gateway/           # API gateway & middleware
│   │   ├── persistence/       # Database layer
│   │   └── agentic/           # AI/ML services
│   ├── prisma/                # Database schema & migrations
│   └── test/                  # Backend tests
├── src/                       # React frontend application
│   ├── core/                  # Core frontend logic
│   ├── pages/                 # Page components
│   ├── components/            # Reusable UI components
│   ├── modules/               # Industry module frontends
│   ├── layouts/               # Layout components
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Utilities & helpers
├── prisma/                    # Root Prisma config
├── docs/                      # Documentation
├── mappings/                  # Graphify module mappings
├── tests/                     # E2E & integration tests
├── PLATFORM_DOCS/             # Architecture documentation
└── .kiro/                     # Kiro AI specs & config
    └── specs/                 # Feature specifications
```

---

## Backend Structure (`backend/src/`)

### Core Modules (`backend/src/core/`)

#### Finance (`core/finance/`)
**Purpose:** General ledger, AR/AP, journal management

**Key Files:**
- `finance.service.ts` - Main finance service
- `services/ledger-posting.service.ts` - Journal entry posting (Line 1-500)
- `services/journal-reversal.service.ts` - Journal reversal logic (Line 45: double-reversal check)
- `services/fiscal-period.service.ts` - Period lifecycle management
- `services/ar-bill.service.ts` - Accounts receivable
- `services/ap-bill.service.ts` - Accounts payable
- `utils/hashing.service.ts` - Cryptographic hash chain
- `utils/journal-validation.service.ts` - Journal validation (Line 9: BALANCE_TOLERANCE = 0)

**Controllers:**
- `finance.controller.ts` - Main finance API
- `financial-dashboard.controller.ts` - Dashboard endpoints

**Repositories:**
- `repositories/journal-entry.repository.ts`
- `repositories/fiscal-period.repository.ts`
- `repositories/ar-invoice.repository.ts`

**Database Tables:**
- `finance_journal_entries`
- `finance_journal_lines`
- `finance_journal_reversals`
- `finance_fiscal_periods`
- `finance_chart_of_accounts`

---

#### Inventory (`core/inventory/`)
**Purpose:** Stock management, transfers, adjustments

**Key Files:**
- `inventory.service.ts` - Main inventory service (Line 435: receiveTransfer fix)
- `inventory.controller.ts` - Inventory API (Check for wildcard route deprecation)
- `item-image.service.ts` - Image management
- `sku-generator.service.ts` - SKU generation
- `label-template.service.ts` - Label printing

**Controllers:**
- `controllers/stock-transfer.controller.ts`
- `controllers/stock-adjustment.controller.ts`

**Repositories:**
- `repositories/item-master.repository.ts`
- `repositories/stock-level.repository.ts`
- `repositories/stock-movement.repository.ts`

**Database Tables:**
- `item_masters`
- `stock_levels`
- `stock_movements`
- `stock_reservations`
- `inventory_transfers`
- `inventory_adjustments`

---

#### HR (`core/hr/`)
**Purpose:** Employee management, payroll, attendance

**Key Files:**
- `hr.service.ts` - Main HR service
- `hr-attendance.service.ts` - Attendance tracking
- `hr-payroll.service.ts` - Payroll processing
- `payroll-engine.service.ts` - Payroll calculation
- `hr-recruitment.service.ts` - Recruitment management
- `compliance.service.ts` - Compliance tracking

**Controllers:**
- `hr.controller.ts` - Main HR API
- `controllers/attendance.controller.ts`
- `controllers/payroll.controller.ts`

**Database Tables:**
- `employees`
- `hr_attendance_records`
- `hr_payroll_runs`
- `payroll_lines`
- `leave_requests`

---

#### Procurement (`core/procurement/`)
**Purpose:** Purchase requisitions, POs, supplier management

**Key Files:**
- `procurement.service.ts` - Main procurement service
- `procurement.controller.ts` - Procurement API

**Database Tables:**
- `procurement_requisitions`
- `procurement_final_pos`
- `procurement_receipts`
- `supplier_masters`

---

#### Sales (`core/sales/`)
**Purpose:** Lead management, opportunities, quotes

**Key Files:**
- `sales.service.ts` - Main sales service
- `sales-management.service.ts` - Pipeline management
- `sales-operational.service.ts` - Operational tasks

**Database Tables:**
- `sales_leads`
- `sales_opportunities`
- `sales_quotes`
- `sales_orders`

---

#### Marketing (`core/marketing/`)
**Purpose:** Campaigns, leads, automation

**Key Files:**
- `marketing.service.ts` - Main marketing service
- `automation-engine.service.ts` - Marketing automation
- `social-sync.service.ts` - Social media integration

**Database Tables:**
- `marketing_campaigns`
- `marketing_leads`
- `marketing_contacts`

---

#### Payment (`core/payment/`)
**Purpose:** Payment processing, refunds, settlements

**Key Files:**
- `payment.service.ts` - Main payment service (Check for offline payment matrix enforcement)
- `payment.reconciliation.service.ts` - Settlement reconciliation
- `payment.controller.ts` - Payment API

**Database Tables:**
- `payment_transactions`
- `payment_refunds`
- `payment_disputes`
- `payment_settlements`

---

#### IT (`core/it/`)
**Purpose:** Device management, system health

**Key Files:**
- `it.service.ts` - Main IT service
- `webhook.service.ts` - External integrations

**Database Tables:**
- `it_devices`
- `it_device_events`
- `it_system_health`

---

#### Auth (`core/auth/`)
**Purpose:** Authentication & authorization

**Key Files:**
- `auth.service.ts` - Authentication logic
- `auth.controller.ts` - Auth API
- `guards/jwt-auth.guard.ts` - JWT validation

**Database Tables:**
- `users`
- `user_companies`

---

### Industry Modules (`backend/src/modules/`)

#### Retail (`modules/retail/`)
**Purpose:** POS, shift management, e-commerce sync

**Key Files:**
- `retail.service.ts` - Main retail service
- `retail.controller.ts` - Retail API (Check for shift lifecycle guard)
- `retail-gateway.service.ts` - Multi-channel sync
- `retail-print.service.ts` - Receipt printing
- `ecommerce-hub.service.ts` - E-commerce integration

**Database Tables:**
- `retail_orders`
- `retail_order_items`
- `retail_shifts`
- `retail_customers`
- `retail_channels`

---

#### FnB (`modules/fnb/`)
**Purpose:** Food & Beverage operations

**Key Files:**
- `fnb.service.ts` - Main FnB service
- `fnb.controller.ts` - FnB API

**Database Tables:**
- `fnb_recipes`
- `fnb_ingredients`

---

#### Clinic (`modules/clinic/`)
**Purpose:** Healthcare operations

**Key Files:**
- `clinic.service.ts` - Main clinic service
- `clinic.controller.ts` - Clinic API

**Database Tables:**
- `clinic_reservations`

---

#### Farming (`modules/farming/`)
**Purpose:** Agricultural operations

**Key Files:**
- `farming.service.ts` - Main farming service
- `iot-gateway.service.ts` - IoT sensor integration

**Database Tables:**
- `farming_sensor_logs`

---

### Shared Services (`backend/src/shared/`)

#### Audit (`shared/audit/`)
**Purpose:** Immutable audit trail

**Key Files:**
- `audit.service.ts` - Audit logging
- `audit-chain.service.ts` - Hash chain integrity

**Database Tables:**
- `audit_logs`
- `audit_hash_anchors`
- `audit_chain_repairs`

---

#### Comms (`shared/comms/`)
**Purpose:** Communication services

**Key Files:**
- `chat.service.ts` - Real-time chat
- `mail.service.ts` - Internal mail
- `bulletin.service.ts` - Bulletin board
- `notification.service.ts` - Notifications
- `chat.gateway.ts` - WebSocket gateway

**Database Tables:**
- `chat_rooms`
- `chat_members`
- `comms_chat_messages`
- `mail_messages`
- `bulletin_posts`
- `notifications`

---

#### License (`shared/license/`)
**Purpose:** Module licensing

**Key Files:**
- `license.service.ts` - License management
- `license.guard.ts` - Access enforcement

**Database Tables:**
- `module_licenses`
- `module_license_logs`

---

#### Workflow (`shared/workflow/`)
**Purpose:** Approval workflows

**Key Files:**
- `workflow.service.ts` - Workflow management
- `workflow-orchestrator.service.ts` - Workflow execution

**Database Tables:**
- `workflow_definitions`
- `workflow_instances`
- `workflow_requests`

---

#### Events (`shared/events/`)
**Purpose:** Event-driven architecture

**Key Files:**
- `event-bus.service.ts` - Event bus
- `local-emitter.service.ts` - Local event emitter

---

#### Logger (`shared/logger/`)
**Purpose:** System logging

**Key Files:**
- `logger.service.ts` - Logging service
- `http-log.interceptor.ts` - HTTP request logging

**Database Tables:**
- `system_logs`

---

### Gateway Layer (`backend/src/gateway/`)

**Key Files:**
- `tenant.middleware.ts` - Tenant context extraction
- `tenant.interceptor.ts` - Tenant context injection
- `health.controller.ts` - Health check endpoint

---

### Persistence Layer (`backend/src/persistence/`)

**Key Files:**
- `prisma.service.ts` - Prisma client wrapper

---

## Frontend Structure (`src/`)

### Core (`src/core/`)

#### Identity (`core/identity/`)
**Purpose:** User session & tenant context

**Key Files:**
- `context.tsx` - Identity context provider
- `storage.ts` - Local storage utilities

---

#### Security (`core/security/`)
**Purpose:** Authorization & access control

**Key Files:**
- `roles.ts` - Role definitions
- `permissions.ts` - Permission matrix
- `ProtectedRoute.tsx` - Route guard component

---

#### Services (`core/services/`)

**Finance:**
- `finance/ledger.service.ts`
- `finance/ar.service.ts`
- `finance/ap.service.ts`

**Inventory:**
- `inventory/stock.service.ts`
- `inventory/transfer.service.ts`

**HR:**
- `hr/employee.service.ts`
- `hr/payroll.service.ts`

**Retail:**
- `retail/pos.service.ts`
- `retail/shift.service.ts`

---

#### Runtime (`core/runtime/`)
**Purpose:** Dynamic routing & module resolution

**Key Files:**
- `moduleResolver.ts` - Module resolution logic
- `coreRoutes.tsx` - Core route definitions
- `moduleRoutes.tsx` - Module route definitions

---

### Pages (`src/pages/`)

#### Core Pages (`pages/core/`)

**Finance:**
- `finance/MoneyDesk.tsx` - Cash management
- `finance/Ledger.tsx` - General ledger
- `finance/ARInvoices.tsx` - Accounts receivable
- `finance/APBills.tsx` - Accounts payable

**Inventory:**
- `inventory/StockController.tsx` - Stock dashboard
- `inventory/ReceivingDock.tsx` - Goods receipt
- `inventory/AdjustmentDesk.tsx` - Stock adjustments
- `inventory/TransferHub.tsx` - Stock transfers

**HR:**
- `HR/EmployeeDirectory.tsx` - Employee list
- `HR/Attendance.tsx` - Attendance tracking
- `HR/Payroll.tsx` - Payroll management
- `HR/Recruitment.tsx` - Recruitment pipeline

**Tools:**
- `tools/Explorer.tsx` - File explorer (Line 1391: JSX tag mismatch - NEEDS FIX)
- `tools/Workflows.tsx` - Workflow management
- `tools/Audit.tsx` - Audit trail viewer

---

#### Retail Pages (`pages/retail/`)

**Operational:**
- `operational/POS.tsx` - Point of sale
- `operational/Kiosk.tsx` - Self-service kiosk
- `operational/ShiftControl.tsx` - Shift management

**Management:**
- `management/Dashboard.tsx` - Retail dashboard
- `management/Products.tsx` - Product management
- `management/Channels.tsx` - Channel sync

---

### Components (`src/components/`)

#### UI (`components/ui/`)
**Purpose:** shadcn/ui components

**Key Files:**
- `button.tsx`
- `dialog.tsx`
- `table.tsx`
- `form.tsx`
- (50+ UI components)

---

#### Shared (`components/shared/`)
**Purpose:** Reusable business components

**Key Files:**
- `ConnectivityStatus.tsx` - Online/offline indicator
- `NotificationCenter.tsx` - Notification panel
- `ExportButton.tsx` - Data export
- `ImportDialog.tsx` - Data import

---

### Layouts (`src/layouts/`)

**Key Files:**
- `CoreLayout.tsx` - Core module layout
- `ModuleLayout.tsx` - Industry module layout
- `POSLayout.tsx` - POS-specific layout

---

## Database Schema (`prisma/schema.prisma`)

### Core Tables

**Tenants & Identity:**
- `tenants` - Tenant master
- `users` - User accounts
- `companies` - Company entities
- `user_companies` - User-company associations

**Finance:**
- `finance_journal_entries` - Journal entries
- `finance_journal_lines` - Journal line items
- `finance_journal_reversals` - Reversal tracking
- `finance_fiscal_periods` - Fiscal periods
- `finance_chart_of_accounts` - Chart of accounts
- `finance_ar_invoices` - AR invoices
- `finance_ar_payments` - AR payments

**Inventory:**
- `item_masters` - Item master data
- `stock_levels` - Stock levels per location
- `stock_movements` - Stock movement history
- `stock_reservations` - Stock reservations
- `inventory_transfers` - Stock transfers
- `inventory_adjustments` - Stock adjustments
- `locations` - Location master

**HR:**
- `employees` - Employee master
- `hr_attendance_records` - Attendance logs
- `hr_payroll_runs` - Payroll runs
- `payroll_lines` - Payroll line items
- `leave_requests` - Leave requests
- `performance_reviews` - Performance reviews

**Retail:**
- `retail_orders` - Retail orders
- `retail_order_items` - Order line items
- `retail_shifts` - Shift records
- `retail_customers` - Customer master
- `retail_channels` - Sales channels

**Audit:**
- `audit_logs` - Audit trail
- `audit_hash_anchors` - Hash chain anchors
- `audit_chain_repairs` - Chain repair log

---

## Key Integration Points

### Finance ↔ Inventory
- **Trigger:** Stock movement
- **Action:** Create journal entry for inventory valuation
- **Service:** `InventorySubledgerService` → `LedgerPostingService`

### Finance ↔ HR
- **Trigger:** Payroll run completion
- **Action:** Create journal entry for payroll expense
- **Service:** `HRPayrollService` → `LedgerPostingService`

### Finance ↔ Retail
- **Trigger:** Order completion
- **Action:** Create AR invoice
- **Service:** `RetailService` → `ARBillService`

### Inventory ↔ Retail
- **Trigger:** Order creation
- **Action:** Reserve stock
- **Service:** `RetailService` → `InventoryService.reserveStock()`

### Inventory ↔ Procurement
- **Trigger:** Goods receipt
- **Action:** Increase stock levels
- **Service:** `ProcurementService` → `InventoryService.receiveStock()`

---

## Critical Bug Locations

### BUG-1: Inventory Stock Transfer Receive ✅ FIXED
**File:** `backend/src/core/inventory/inventory.service.ts`  
**Line:** 435  
**Status:** Fixed - uses `transfer.to_location_id` as fromLocationId

### BUG-2: Explorer.tsx JSX Tag Mismatch ⚠️ NEEDS FIX
**File:** `src/pages/core/tools/Explorer.tsx`  
**Line:** 1391  
**Issue:** `</div>` doesn't match `<DepartmentWorkspaceLayout>` at line 524

### BUG-3: Subledger-to-Ledger Desync ❌ NOT FIXED
**File:** `backend/src/core/finance/services/ar-bill.service.ts`  
**Issue:** No automated detection for orphaned entries

### BUG-4: Double-Reversal ✅ FIXED
**File:** `backend/src/core/finance/services/journal-reversal.service.ts`  
**Line:** 45  
**Status:** Fixed - checks for existing reversal

### BUG-5: Fiscal Period Hard-Lock Bypass ❌ NOT FIXED
**File:** `backend/src/core/finance/services/fiscal-period.service.ts`  
**Issue:** No automatic voiding of DRAFT journals on HARD_LOCK

### BUG-6: Ledger Hash Chain Contamination ⚠️ NEEDS VERIFICATION
**File:** `backend/src/core/finance/utils/hashing.service.ts`  
**Issue:** Need to verify MOCK-HASH detection

### BUG-7: Journal Balance Tolerance ✅ FIXED
**File:** `backend/src/core/finance/services/journal-validation.service.ts`  
**Line:** 9  
**Status:** Fixed - BALANCE_TOLERANCE = 0

### BUG-8: Wildcard Route Deprecation ⚠️ NEEDS VERIFICATION
**File:** `backend/src/core/inventory/inventory.controller.ts`  
**Issue:** Check for `@Get("images/*")` deprecated syntax

### BUG-9: Bundle Size ❌ NOT FIXED
**File:** `vite.config.ts`  
**Issue:** No code-splitting implemented

### BUG-10: Shift Lifecycle Guard ❌ NOT FIXED
**File:** `backend/src/modules/retail/retail.controller.ts`  
**Issue:** No shift validation at backend API layer

### BUG-11: Offline Payment Matrix ❌ NOT FIXED
**File:** `backend/src/core/payment/payment.service.ts`  
**Issue:** No offline payment matrix enforcement

---

## Testing Locations

### Unit Tests
- `backend/src/core/finance/__test__/` - Finance unit tests
- `backend/test/` - Backend unit tests

### Integration Tests
- `tests/integration/` - API integration tests
- `tests/integration/core-bugfix-exploration.spec.ts` - Bug exploration tests

### E2E Tests
- `tests/playwright/` - Playwright E2E tests

### System Simulation
- `tests/system-simulation/` - Multi-tenant simulation tests

---

## Configuration Files

### Root Level
- `package.json` - Frontend dependencies & scripts
- `vite.config.ts` - Vite build configuration (NEEDS: code-splitting)
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `docker-compose.yml` - Docker orchestration
- `.env.example` - Environment variable template

### Backend
- `backend/package.json` - Backend dependencies
- `backend/tsconfig.json` - Backend TypeScript config
- `backend/nest-cli.json` - NestJS CLI config

### Database
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Database migrations

---

## Documentation Locations

### Platform Documentation
- `PLATFORM_DOCS/CORE_ARCHITECTURE.md` - Architecture overview
- `PLATFORM_DOCS/BACKEND_BUILD.md` - Backend architecture
- `PLATFORM_DOCS/FRONTEND_BUILD.md` - Frontend architecture
- `PLATFORM_DOCS/MULTI_TENANCY.md` - Multi-tenancy design

### Specifications
- `.kiro/specs/core-retail-stabilization/` - Current stabilization spec
  - `bugfix.md` - Bug requirements
  - `tasks.md` - Implementation tasks
  - `IMPLEMENTATION_STATUS.md` - Status tracking

### Module Mappings
- `mappings/Finance.json` - Finance module map
- `mappings/Inventory.json` - Inventory module map
- `mappings/HR.json` - HR module map
- `mappings/Retail.json` - Retail module map
- (+ 5 more module mappings)

---

## Quick Reference: Common Tasks

### Adding a New API Endpoint
1. Create DTO in `backend/src/core/{module}/dto/`
2. Add method to service in `backend/src/core/{module}/{module}.service.ts`
3. Add controller method in `backend/src/core/{module}/{module}.controller.ts`
4. Add repository method if needed in `backend/src/core/{module}/repositories/`

### Adding a New Page
1. Create page component in `src/pages/core/{module}/`
2. Register route in `src/core/runtime/coreRoutes.tsx`
3. Add navigation item in layout component

### Adding a New Database Table
1. Add model to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name {migration_name}`
3. Create repository in `backend/src/core/{module}/repositories/`
4. Create entity interface in `backend/src/core/{module}/entities/`

### Running the Application
```bash
# Development
npm run dev  # Runs both frontend and backend

# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Build
npm run build

# Tests
npm run test
```

---

**Document Maintainer:** Development Team  
**Last Review:** 2026-05-22  
**Next Review:** Weekly during stabilization
