# Architecture Map - Inventory Department

## Core Components

| Component | Responsibility | Base File |
| --- | --- | --- |
| **Controller** | API Gateway, Input Validation, Tenant Scoping | `inventory.controller.ts` |
| **Service** | Orchestration, Business Rules, Event Emission | `inventory.service.ts` |
| **Repository** | Data Persistence, ACID Transactions, Row Locking | `inventory.db.repository.ts` |
| **SKU Engine** | Automated SKU and Barcode Generation | `sku-generator.service.ts` |
| **Label Engine** | ZPL and HTML Label Generation | `label-template.service.ts` |

## Data Flow
1. **API Request** → `InventoryController` (Auth/Tenant/Module Guards)
2. **Business Logic** → `InventoryService` (Role Validation / Multi-step Logic)
3. **Audit Trail** → `AuditService.log` (Synchronous logging of intent)
4. **Data Persistence** → `InventoryDbRepository` (SQL Transaction / Locking)
5. **Event Emission** → `EventBusService.publish` (Asynchronous notification)

## Integration Points
- **Retail Module**: Real-time stock decrement on sales.
- **Procurement Module**: Stock intake on receipt of goods.
- **Finance Module**: Inventory valuation and ledger adjustments.
- **IT Module**: Asset tracking for hardware devices.
