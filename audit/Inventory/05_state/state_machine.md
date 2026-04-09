# State Machine - Inventory Department

## 1. Inventory Adjustment Lifecycle
Formal reconciliation of recorded stock vs physical count.

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL: POST /adjustments
    PENDING_APPROVAL --> APPROVED: POST /approve
    PENDING_APPROVAL --> REJECTED: POST /reject
    APPROVED --> [*]: Stock Updated
    REJECTED --> [*]: Request Terminated
```

## 2. Stock Reservation Lifecycle
Soft-locking mechanism for retail orders or internal projects.

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /reservations
    PENDING --> CONFIRMED: POST /confirm-reservation
    PENDING --> EXPIRED: System Cron Task
    PENDING --> CANCELLED: POST /cancel-reservation
    CONFIRMED --> [*]: Stock Consumption
    EXPIRED --> [*]: Soft lock released
    CANCELLED --> [*]: Soft lock released
```

## 3. Inventory Item Status
Global status of the Item Master.

- **DRAFT**: Created via system ingestion, requires verification.
- **ACTIVE**: Ready for stock moves and sales.
- **INACTIVE**: Temporarily hidden from UI but records preserved.
- **DELETED**: Logical deletion (marked as `deleted_at`).
