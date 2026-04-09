# Integrity Risks: Procurement

## 1. Orphans and Loose Ends
- **`procurement_final_pos` vs `Payables`**: The integration is performed in the repository layer. If the `Payable.create` fails after `FinalPO.create` succeeds, we have an "Orphaned PO" with no record in Finance. **CRITICAL RISK**.
- **`PO_RECEIVED` Event**: If the `eventBus.publish` fails, the Inventory module will NOT be notified of incoming stock, resulting in a physical-logical stock mismatch.

## 2. Validation Gaps
- **`branch_code` Integrity**: The `supplier_branches` table lacks a `@unique([tenant_id, supplier_id, branch_code])` constraint. This could allow multiple branches with the same code (e.g., "JKT") for the same supplier, causing drafting errors.
- **`quoted_total` vs `line_items`**: `ProcurementDraftPO` stores both a `quoted_total` (sum) and `line_items` (array). There is no automated database-level constraint ensuring they sum correctly. **RISK**.

## 3. Precision Risks
- **`Decimal(15,2)`**: Standard for currency. Adequate for most industrial PRs but potentially problematic for multi-currency or crypto-assets (future).
- **Floating-point Math**: JavaScript `Number(p.unitPrice)` is used in the repository. This should be handled via a Decimal library to avoid cumulative rounding errors during large order calculations. **RISK**.

## 4. Lifecycle Risks
- **PR Status**: The PR status check in `ProcurementDbRepository.approveFinal` uses a string literal (`'FINANCE_HOD'`). This is brittle and should be based on an Enum/Type.
- **Contract Signed Status**: `PARTIAL_SIGNED` status is determined manually in code. If one field is updated without checking `allSigned`, the status could remain `PARTIAL_SIGNED` even if all parties have signed.
