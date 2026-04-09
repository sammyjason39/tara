# Endpoint Map: Procurement

## 1. Public / Protected API
Base Path: `/procurement`

| Method | Path | Description | Roles Required |
| ---- | ---- | ---- | ---- |
| `GET` | `/overview` | Get procurement stats and contributions. | `ADMIN`, `HOD` |
| `GET` | `/suppliers` | List all suppliers for the tenant. | `ADMIN`, `PROCUREMENT` |
| `POST` | `/suppliers` | Onboard a new supplier. | `ADMIN`, `PROCUREMENT` |
| `GET` | `/branches` | List all supplier branches. | `ADMIN`, `PROCUREMENT` |
| `POST` | `/branches` | Add a branch to a supplier. | `PROCUREMENT` |
| `GET` | `/categories` | List procurement categories. | `PROCUREMENT`, `STAFF` |
| `POST` | `/categories/upsert`| Create/Update a category. | `ADMIN`, `PROCUREMENT` |
| `GET` | `/requisitions` | List PRs for the tenant. | `STAFF`, `HOD`, `PROCUREMENT` |
| `POST` | `/requisitions` | Create a new Purchase Requisition. | `STAFF`, `HOD` |
| `PUT` | `/requisitions/:id/approve-requester-hod` | Approve PR by Dept Head. | `HOD` |
| `PUT` | `/requisitions/:id/approve-final` | Final Finance/Management approval. | `FINANCE_HOD`, `ADMIN` |
| `POST` | `/draft-pos` | Create a draft PO from a PR. | `PROCUREMENT` |
| `PUT` | `/draft-pos/:id/confirm-quote` | Attach supplier quote to draft. | `SUPPLIER`, `PROCUREMENT` |
| `POST` | `/purchase-orders/release` | Convert draft to final PO. | `PROCUREMENT`, `ADMIN` |
| `POST` | `/receipts` | Record goods receipt. | `STOREHOST`, `PROCUREMENT` |
| `POST` | `/risk-scan` | Trigger risk scan. | `ADMIN`, `AUDITOR` |

## 2. Supplier Portal (Conceptual)
| Method | Path | Description |
| ---- | ---- | ---- |
| `GET` | `/portal-messages` | Retrieve messages for supplier. |
| `POST` | `/portal-messages` | Send message to supplier. |

## 3. Governance
| Method | Path | Description |
| ---- | ---- | ---- |
| `GET` | `/audit-events` | Fetch procurement audit log. |
| `GET` | `/spend-insights` | Spend analytics by category. |
