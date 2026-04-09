# System Map: Procurement

## 1. Module Overview
The Procurement module is a core component of the Zenvix Business OS, responsible for supplier management, requisition (PR) workflows, contract lifecycle, and purchase order (PO) orchestration.

## 2. Component Inventory

### Controllers
- **ProcurementController**: Main API gateway for procurement actions. Handles multi-tenancy via `TenantInterceptor`.

### Services
- **ProcurementService**: Orchestrates business logic, audits actions via `AuditService`, and emits events via `EventBusService`.

### Repositories
- **IProcurementRepository**: Abstract interface defining the persistence contract.
- **ProcurementDbRepository**: Prisma-based implementation for PostgreSQL.
- **ProcurementMockRepository**: In-memory storage for development and testing.

### DTOs (Data Transfer Objects)
- `CreateSupplierDto`, `CreateRequisitionDto`, `CreateDraftPoDto`, `ConfirmQuoteDto`, `CreateContractDto`, `SignContractDto`, `ApproveFinalDto`, `CreateReceiptDto`, `UpsertSupplierProductDto`, `ReleasePoDto`, etc.

### Entities
- `Supplier`, `Requisition`, `PurchaseOrder`, `ProcurementRisk`.

## 3. Communication Patterns
- **Synchronous (REST)**: Controller to Service to Repository.
- **Asynchronous (Events)**: Emits `PO_RECEIVED` upon goods receipt for Inventory consumption.
- **Cross-Module**: Directly creates `Payable` records in the Finance module upon PO release.
