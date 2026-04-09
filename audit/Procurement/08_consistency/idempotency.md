# Idempotency: Procurement

## 1. Write Operation Audit
Idempotency is critical for finance-related modules to prevent duplicate spending or redundant records.

| Operation | Current Logic | Result |
| ---- | ---- | ---- |
| `POST /requisitions` | Creates new PR row with generic UUID. | **NOT IDEMPOTENT**. Multiple clicks create duplicate PRs. |
| `POST /suppliers` | Creates new Supplier row with generic UUID. | **NOT IDEMPOTENT**. |
| `PUT /requisitions/:id/approve` | Updates `status` to `FINAL_APPROVED`. | **IDEMPOTENT**. Repeated calls result in the same status. |
| `POST /purchase-orders/release`| Creates `FinalPO` and `Payable`. | **NOT IDEMPOTENT**. Multiple clicks create duplicate POs and duplicate debts. **CRITICAL RISK**. |
| `POST /receipts` | Creates record and updates rating. | **NOT IDEMPOTENT**. |

## 2. Global Idempotency Support
- **Resource**: `sys_idempotency_keys` table exists in the schema (Line 4134).
- **Check**: The `ProcurementController` and `ProcurementService` **DO NOT** use the idempotency key system.
- **Urgent Fix**: All `POST` operations must accept an `x-idempotency-key` header and be checked before execution.

## 3. Side-Effect Risks
- **`PO_RECEIVED` Event**: If emitted multiple times (e.g., due to retry logic in `/process-receipt`), the Inventory module might perform double-intake. 
- **Recommendation**: Event payloads should include a unique `receipt_uuid` that the Inventory consumer checks for idempotency.
