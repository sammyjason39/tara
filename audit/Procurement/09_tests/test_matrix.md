# Test Matrix: Procurement

## 1. Feature Coverage

| Feature | Unit Tests | Integration Tests | E2E Tests | Gaps |
| ---- | ---- | ---- | ---- | ---- |
| Supplier Creation | [x] | [ ] | [ ] | Integration test needed for compliance flow. |
| PR Creation | [x] | [x] | [ ] | Validation of `amount < 0` needed. |
| PR Approval (HOD) | [x] | [x] | [ ] | Role-based check needed. |
| PR Approval (Finance) | [x] | [x] | [ ] | Budget check needed. |
| Draft PO Creation | [ ] | [x] | [ ] | Line item calculation unit test needed. |
| PO Release | [x] | [x] | [ ] | Idempotency test (double release) needed. |
| Goods Receipt | [x] | [ ] | [ ] | Interaction with Inventory needed. |
| Supplier Rating | [x] | [ ] | [ ] | Global rating calculation unit test needed. |
| Risk Signals | [ ] | [ ] | [ ] | Scan engine tests needed. |

## 2. Security Test Coverage

| Scenario | Tested? | Result |
| ---- | ---- | ---- |
| Cross-Tenant PR Access | [x] | 404 (Pass) |
| Non-HOD PR Approval | [ ] | **FAIL (Missing Guard)** |
| Double PO Release | [ ] | **FAIL (Missing Idempotency)** |
| Negative Amount PR | [ ] | **FAIL (Missing Validation)** |

## 3. Resilience Test Coverage

| Scenario | Tested? | Result |
| ---- | ---- | ---- |
| DB Timeout during Release | [ ] | **FAIL (No Transaction)** |
| Event Bus down during Receipt | [ ] | **FAIL (No Retry)** |
| Finance API 500 during release | [ ] | **FAIL (No Saga)** |
| PR deleted during Draft | [ ] | **FAIL (Missing Check)** |
| Admin Override PR | [ ] | **FAIL (Missing Feature)** |
