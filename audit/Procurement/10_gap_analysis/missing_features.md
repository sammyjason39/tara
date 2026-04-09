# Missing Features: Procurement

## 1. Governance & Control
- **Approval Thresholds**: Dynamic approval routing based on transaction value (e.g., <$500 = Auto, >$10k = CFO). Currently, all PRs require two HOD approvals.
- **Budget Lock**: Integration with Finance to "Reserve" budget when a PR is approved, preventing overspending.
- **Enforced Compliance**: Guarding `PO Release` against suppliers with `PENDING` or `FAILED` compliance status.

## 2. Supplier Lifecycle
- **Supplier Portal**: External interface for vendors to submit quotes, sign contracts, and check payment status. 
- **Catalog Management**: Importers for bulk CSV/Excel supplier prices.
- **Performance Thresholds**: Auto-flagging or suspending suppliers whose `global_rating` drops below a certain point (e.g., < 40).

## 3. Operations
- **Partial PO Management**: Ability to split a single PR into multiple POs for different suppliers.
- **PO Amendments**: formal versioning and re-approval for PO changes after release.
- **Currencies**: Exchange rate support for international procurement.

## 4. Automation
- **Auto-Requisition**: Low-stock triggers from Inventory automatically creating PR drafts.
- **AI-Driven Risk**: Predictive analysis of supplier reliability based on history (partially started with `procurement_risk_signals`).
- **OCR Invoicing**: Reading supplier invoices to automatically match against PO line items.
