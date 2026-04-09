# Missing Endpoints: Procurement

## 1. Functional Gaps
- **PR Cancellation**: `DELETE /requisitions/:id`. No endpoint to cancel an accidental or rejected PR.
- **Supplier Update**: `PUT /suppliers/:id`. No endpoint to update supplier contact info or tax IDs.
- **Branch Management**: `GET /suppliers/:supplierId/branches`. No specific endpoint to fetch branches only for a given supplier (must use global `/branches` and filter).
- **PO Amendment**: `PUT /purchase-orders/:id`. No endpoint to amend a PO after it's been released.

## 2. Governance Gaps
- **Bulk Import**: `POST /suppliers/import`. No bulk import for supplier catalogs or products.
- **Export**: `GET /requisitions/export`. No CSV/Excel export for PRs or POs.
- **Workflow Overrides**: `POST /requisitions/:id/override`. No "Super Admin" endpoint to force-push a PR stuck in HOD approval.

## 3. Integration Gaps
- **Budget Lookup**: `GET /finance/budget-status`. No endpoint to display budget availability before submitting a PR.
- **Tax Calculation**: `POST /taxes/calculate`. No specific tax calculation endpoint for multi-regional procurement.

## 4. Operational Gaps
- **Attachment Upload**: `POST /requisitions/:id/attachments`. No specific endpoint for document uploads; relies on global `Support` module (inferred).
- **Partial Reception Management**: `GET /purchase-orders/:id/receptions`. No summary endpoint for split-shipment history.
- **Quality Control**: `POST /quality-inspections`. No formal QC/QA step between receipt and intake.
- **Supplier Portal Auth**: `POST /auth/supplier/login`. No authentication endpoint for external supplier access.
- **Vendor Portal Feedback**: `PUT /suppliers/:id/profile`. No self-service portal for vendors.
