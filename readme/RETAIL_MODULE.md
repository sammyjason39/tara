# Zenvix Retail Operations Module: Technical Specification & Overview

## 1. System Architecture & Integrated Logic

The Retail module is designed as a high-performance, contract-driven industry module within the Zenvix ecosystem. It balances high-velocity operational tasks (POS) with strict management governance and fiscal integrity.

### 1.1 Retail as the "Commerce Authority" [HARD LOCK]
The Retail module is the ONLY authority for selling and commerce within Zenvix.
- **Unified Commerce**: Every storefront or digital channel (Web, Mobile, App, Marketplace) exists *exclusively* as a child of the Retail module.
- **No Direct Core Integration**: No storefront or sales channel is permitted to integrate directly with Core Finance or Inventory; they must interface via Retail commerce adapters.
- **Module Lifecycle Enforcement**: If the Retail license expires or is frozen, all selling activity across all associated channels is immediately suspended.

### 1.2 Core Architecture Patterns
- **Contract-Driven Design**: Implements `ModuleContract` ensuring the core runtime treats it as a first-class industry plug-in.
- **Repository Pattern**: Both frontend and backend utilize repository interfaces to decouple business logic from data-persistence.
- **Multi-Tenancy & Isolation**: In addition to tenant isolation, Retail enforces **Store-Level Isolation**.
    - **Isolation Scope**: `scope = tenant_id + store_id + shift_id`.
    - **Enforcement Rules**:
        - Store context is immutable at the session level; it cannot be bypassed.
        - Store selection is functional, not cosmetic; it determines inventory pool and pricing.
        - Operational pages (POS, Kiosk) remain locked until a valid `shift_id` is established.

### 1.3 Cross-Service Dependencies
| Dependency | Purpose | Integration Point |
|------------|---------|-------------------|
| **HR Service** | Staff Roles & Schedules | `validateAccess` checks if an employee is scheduled/authorized for the current store. |
| **Finance Service** | Payments & Audits | `processPayment` triggers financial ledger entries and audit logging. |
| **Inventory Core** | SKU Governance | `listInventory` and `submitOpname` synchronize with the global warehouse. |
| **Security/Session**| Identity & Roles | Uses `useSession` and `SessionContext` for RBAC enforcement on pages. |

---

## 2. Folder Structure

The module is distributed across the frontend and backend to provide a seamless full-stack experience.

### 2.1 Frontend Structure (`/src`)
- **`core/runtime/`**: Registration of the Retail module (`moduleRegistry.ts`) and dynamic route building (`moduleRoutes.tsx`).
- **`modules/retail/`**: Contains the canonical module definition (`index.ts`) and specific module logic.
- **`pages/retail/`**:
  - **`management/`**: Tactical Governance pages (Dashboard, Pricing, Audit, etc.).
  - **`operational/`**: High-speed productivity pages (POS, Kiosk, Opname, etc.).
- **`core/services/retail/`**: React-agnostic business logic (`retailService.ts`).
- **`core/types/retail/`**: Strong TypeScript definitions (`retail.ts`).
- **`core/repositories/retail/`**: Frontend data access layer (`retailRepo.ts`).

---

## 3. UI Ecosystem & Device Enforcement

The Retail UI is built using the **Nexus Design System**, focusing on premium aesthetics and role-based device ergonomics.

### 3.1 Device-Aware Routing [HARD LOCK]
Visibility and routing are strictly governed by the recognized `device_mode`. Access to management vs. operational screens is enforced at the router level.

| Device Mode | Routing Pattern | Accessible Pages |
|-------------|-----------------|-------------------|
| **ADMIN_PC**| `/m/retail/management/*` | Dashboard, Pricing, Compliance, Settings. |
| **POS**     | `/m/retail/operational/pos` | Cashier Terminal (POS) only. |
| **SCANNER** | `/m/retail/operational/opname` | Inventory Audit/Intake only. |
| **KIOSK**   | `/m/retail/operational/kiosk`| Self-Service Kiosk UI only. |

**Role Enforcement Rules**:
- **Cashier Isolation**: Employees assigned to `POS` or `KIOSK` modes never see management dashboards.
- **Hardware Lock**: Scanners are routed directly to inventory pages and cannot access checkout or management.

### 3.2 Component Suite
- **Management Plane**: Strategic oversight (Dashboard, Catalog, Channel Sync, Audit).
- **Operational Plane**: High-speed execution (POS, Kiosk, Opname, Receiving, Shift Close).

---

## 4. Payment & Operational Hard Rules

### 4.1 Offline Payment Matrix [HARD LOCK]
To prevent fiscal discrepancies, offline settlement is strictly limited to local, non-verifiable tokens.

| Payment Type | Offline Allowed | Reason |
|--------------|-----------------|--------|
| **Cash**     | **Yes**         | Local physical settlement. |
| **Voucher**  | **Yes**         | Local physical token validation. |
| **Card**     | **No**          | Requires real-time bank network authorization. |
| **QRIS/E-Wallet** | **No**       | Requires third-party provider verification. |
| **Loyalty Pts** | **No**         | Requires central database balance lock. |

### 4.2 Key Logic Flows
- **Order Lifecycle**: `Scan SKU` → `Context Check (Tenant/Store/Shift)` → `Calculate Tax` → `Process Payment (Matrix Enforcement)` → `Audit Log`.
- **Shift Lifecycle**: `Shift Control (Open)` → `Worker Assignment` → `POS Unlock` → `Operational Usage` → `Shift Close Terminal (Reconciliation)`.
- **Promotion Sync**: `Create Proposal (Pricing Desk)` → `Impact Simulation` → `Approval` → `Active Promotion` → `Device Broadcast`.
