# Module Boundaries: Procurement

## 1. Internal Boundaries
The Procurement module is organized into five sub-layers:
- **API (Controller)**: Handles HTTP requests, validation, and multi-tenancy.
- **Service (Strategy)**: Orchestrates business logic and audits actions.
- **Repository (Persistence)**: Abstractions for data storage (DB/Mock).
- **DTOs (Contracts)**: Defines incoming and outgoing data structures.
- **Audit (Traceability)**: Built-in event logging for every mutation.

## 2. External Touchpoints (Northbound)
- **Finance (Core)**: 
  - `ProcurementFinalPO` release triggers `Payable` creation inside `ProcurementDbRepository`.
  - Requisition approval flow often involves "FINANCE_HOD".
- **Inventory (Warehouse)**: 
  - `PO_RECEIVED` event published to `EventBusService` upon processing a manual receipt.
- **HR (Core)**: 
  - Employee IDs from HR are used as `requesterId`.
- **IT (Support)**: 
  - Asset tracking via PRs (future integration).

## 3. Data Flow Directionality
- **Inbound**: REST API calls from Frontend/Gateways.
- **Outbound**: 
  - Database (PostgreSQL via Prisma).
  - Webhooks (Supplier Portal messages).
  - Event Bus (Inventory).
  - Direct Cross-Model creation (Finance).

## 4. Coupling Risks
- **Tight Coupling**: `ProcurementDbRepository` directly imports `prisma.payable.create`, which violates strict module encapsulation but ensures transactional integrity in a "Legacy-Style" monolith.
- **Circular Dependencies**: None detected; the `ProcurementModule` is a leaf node in many dependency graphs.
