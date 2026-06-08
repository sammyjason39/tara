# Zenvix Business Flow Suite v2 — E2E Production Readiness Test Plan

**Date:** 2026-06-08  
**Target:** http://150.109.15.108:3010  
**Framework:** Playwright (Chromium, 1 worker, baseURL inherited from playwright.config.ts)  
**Auth User:** hansel@zenvix.id (Super Admin / Owner role)  
**Scope:** Full platform — Retail ↔ Core sync, all modules, production-grade readiness

---

## 1. Test Objectives

Determine whether the Zenvix BFS v2 platform is:
1. **Navigable** — every registered route loads without crashes or blank pages
2. **API-coherent** — all backend endpoints return correct shapes and status codes
3. **Functionally complete** — critical user flows (Auth, POS, Finance, HR, etc.) can be exercised end-to-end
4. **Cross-domain consistent** — Retail inventory/orders are in sync with Core inventory/orders
5. **Error-free at JS runtime** — no ReferenceErrors / TypeErrors on any route

---

## 2. Test File Structure

```
tests/playwright/
├── setup/
│   └── auth.setup.ts              ← existing; creates .auth/user.json
├── utils/
│   └── helpers.ts                 ← shared session/API helpers (new)
├── 01_auth.spec.ts                ← Auth: login, register, logout, roles
├── 02_company.spec.ts             ← Company/tenant onboarding + branches
├── 03_hr.spec.ts                  ← HR: recruitment, training, payroll, schedules
├── 04_it.spec.ts                  ← IT: accounts, devices, roles, health
├── 05_finance.spec.ts             ← Finance: ledger, JV, payables, payroll
├── 06_payment.spec.ts             ← Payment: execution, refunds, disputes, audit
├── 07_procurement.spec.ts         ← Procurement: PRs, POs, suppliers, contracts
├── 08_sales.spec.ts               ← Sales: leads, pipeline, orders, forecast
├── 09_marketing.spec.ts           ← Marketing: campaigns, funnels, analytics
├── 10_inventory.spec.ts           ← Inventory: stock, transfers, opname, adjustments
├── 11_settings_security.spec.ts   ← Settings, Security, Audit, Logs, Tools
├── 12_retail_core.spec.ts         ← Retail ↔ Core sync (cross-domain integration)
├── 13_retail_management.spec.ts   ← Retail Management: all pages + API smoke
├── 14_retail_operational.spec.ts  ← Retail POS, Shift, Receiving, Refund, Opname
├── retail_e2e.spec.ts             ← existing (retained, not replaced)
```

---

## 3. Test Coverage Matrix

### 3.1 Auth (01_auth.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Login page loads | Nav | P0 |
| Login with valid credentials → dashboard | Functional | P0 |
| Login with invalid credentials → error message | Functional | P0 |
| Logout → redirected to /auth/login | Functional | P0 |
| Register page loads | Nav | P1 |
| Forgot password page accessible | Nav | P2 |
| Unauthenticated redirect to login | Security | P0 |

### 3.2 Company / Onboarding (02_company.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Onboarding page accessible | Nav | P1 |
| Core Dashboard renders tenant name | Functional | P0 |
| Settings page loads | Nav | P1 |
| White-label settings accessible | Nav | P2 |

### 3.3 HR (03_hr.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| HR workspace layout loads | Nav | P0 |
| PulseDesk (Attendance Dashboard) | Nav | P1 |
| RosterGrid (People directory) | Nav | P1 |
| PeopleCore | Nav | P1 |
| OrgMap | Nav | P2 |
| VaultSpace (Documents) | Nav | P2 |
| FlowGate (Leave) | Nav | P1 |
| TalentFlow (Recruitment) | Nav | P1 |
| SkillTrack (Training) | Nav | P1 |
| GrowthCycle (Performance) | Nav | P2 |
| PayCycleStudio (Payroll) | Nav | P0 |
| SchedulingStudio | Nav | P1 |
| LexBoard (Policy) | Nav | P2 |
| InsightLayer (HR Analytics) | Nav | P2 |
| CaseDesk (HR Cases) | Nav | P2 |
| API: GET /hr/employees | API | P0 |
| API: GET /hr/departments | API | P1 |

### 3.4 IT (04_it.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| IT workspace + dashboard | Nav | P0 |
| AccountDesk | Nav | P1 |
| DeviceDesk | Nav | P1 |
| SystemHealth | Nav | P0 |
| TopologyMap | Nav | P2 |
| RoleGovernance | Nav | P1 |
| TechShop | Nav | P2 |
| API: GET /it/devices | API | P1 |

### 3.5 Finance (05_finance.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Finance workspace layout | Nav | P0 |
| CFO Dashboard | Nav | P0 |
| MoneyDesk | Nav | P0 |
| LedgerCore | Nav | P0 |
| PayFlow | Nav | P0 |
| ReceivableDesk (AR) | Nav | P0 |
| PayableDesk (AP) | Nav | P0 |
| JVDesk (Journal Voucher) | Nav | P0 |
| InvoiceCapture | Nav | P0 |
| ClosePeriodStudio | Nav | P1 |
| TreasuryMap | Nav | P1 |
| Assets | Nav | P1 |
| PolicyManager | Nav | P2 |
| FinanceDocs | Nav | P2 |
| AuditVault | Nav | P1 |
| FinanceInsights | Nav | P2 |
| PayslipStudio | Nav | P1 |
| API: GET /finance/accounts | API | P0 |
| API: GET /finance/ledger/entries | API | P0 |
| API: GET /finance/invoices | API | P0 |

### 3.6 Payment (06_payment.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Payment workspace + dashboard | Nav | P0 |
| PaymentExecutionHub | Nav | P0 |
| ProviderRoutingDesk | Nav | P1 |
| DeviceRoutingDesk | Nav | P1 |
| RefundDesk | Nav | P0 |
| DisputeCenter | Nav | P1 |
| PaymentAuditVault | Nav | P1 |

### 3.7 Procurement (07_procurement.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Procurement workspace | Nav | P0 |
| PurchaseRequestDesk | Nav | P0 |
| PoReleaseDesk | Nav | P0 |
| SupplierDesk | Nav | P0 |
| ContractDesk | Nav | P1 |
| SupplierPortalDesk | Nav | P1 |
| ProcurementRiskCenter | Nav | P2 |
| ProcurementInsights | Nav | P2 |
| API: GET /procurement/purchase-requests | API | P0 |
| API: GET /procurement/suppliers | API | P0 |

### 3.8 Sales (08_sales.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Sales workspace + overview | Nav | P0 |
| SalesDashboard | Nav | P0 |
| LeadDesk | Nav | P0 |
| PipelineBoard | Nav | P0 |
| OpportunityDesk | Nav | P1 |
| QuoteDesk | Nav | P0 |
| SalesOrderDesk | Nav | P0 |
| ForecastDesk | Nav | P1 |
| IncentiveDesk | Nav | P2 |
| SalesIntelligenceEngine | Nav | P2 |
| Customer360Desk | Nav | P1 |
| API: GET /sales/leads | API | P0 |
| API: GET /sales/orders | API | P0 |

### 3.9 Marketing (09_marketing.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Marketing workspace + dashboard | Nav | P0 |
| CampaignDesk | Nav | P0 |
| LeadCaptureDesk | Nav | P1 |
| NurtureStudio | Nav | P1 |
| MarketingAnalytics | Nav | P1 |
| ExecutionDesk | Nav | P1 |
| FunnelBuilderDesk | Nav | P2 |
| OmnichannelInbox | Nav | P1 |
| CreativeLibrary | Nav | P2 |
| Customer360 | Nav | P1 |
| AutomationLab | Nav | P2 |
| StrategyControlDesk | Nav | P2 |
| ConnectedAccountsDesk | Nav | P2 |

### 3.10 Inventory (10_inventory.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Inventory workspace + dashboard | Nav | P0 |
| InventoryStockHub | Nav | P0 |
| InventoryReceiving | Nav | P0 |
| InventoryAdjustments | Nav | P0 |
| TransferDesk | Nav | P1 |
| InventoryStockOpname | Nav | P1 |
| InventoryAuditLog | Nav | P1 |
| InventoryInsights | Nav | P2 |
| IotEventFeed | Nav | P2 |
| Warehouse dashboard | Nav | P2 |
| API: GET /inventory/stock | API | P0 |
| API: GET /inventory/stats | API | P0 |

### 3.11 Settings, Security, Audit, Logs, Tools (11_settings_security.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Core Settings page | Nav | P0 |
| Security page | Nav | P0 |
| AuditHub | Nav | P0 |
| LogHub | Nav | P0 |
| ToolsHome | Nav | P1 |
| DocumentTool | Nav | P2 |
| SpreadsheetTool | Nav | P2 |
| CalculatorTool | Nav | P2 |
| ExportTool | Nav | P2 |
| WorkflowInbox | Nav | P1 |
| WhiteLabelSettings | Nav | P2 |

### 3.12 Retail ↔ Core Cross-Domain Integration (12_retail_core.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| Retail inventory stats == core inventory API shape | Cross-domain | P0 |
| Retail products list aligned with core products | Cross-domain | P0 |
| Retail orders cross-reference with core orders | Cross-domain | P0 |
| Retail shift creates financial transaction in core | Cross-domain | P0 |
| Retail POS transaction visible in core finance ledger | Cross-domain | P1 |
| Core finance payment refund visible in retail refund list | Cross-domain | P1 |

### 3.13 Retail Management (13_retail_management.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| All 14 management pages load | Nav | P0 |
| Store Dashboard KPIs render | Functional | P0 |
| Inventory page shows table/empty state | Functional | P0 |
| Search/filter inputs present on inventory | Functional | P1 |
| Order fulfillment page loads | Functional | P0 |
| Pricing & Promo page loads | Functional | P0 |
| Staff assignments page loads | Functional | P1 |
| Shift control page loads | Functional | P0 |
| Ecommerce analytics page loads | Functional | P1 |
| API smoke: 11 retail endpoints return 200 + success:true | API | P0 |
| No ReferenceErrors on management routes | JS Errors | P0 |

### 3.14 Retail Operational (14_retail_operational.spec.ts)

| Test | Type | Priority |
|------|------|----------|
| All 9 operational pages load | Nav | P0 |
| POS shows product grid or shift warning | Functional | P0 |
| Shift Open terminal renders form | Functional | P0 |
| Shift Close terminal renders form | Functional | P0 |
| Receiving terminal loads | Functional | P0 |
| Refund/Return Desk loads | Functional | P0 |
| Stock Opname Scanner loads | Functional | P1 |
| Cash Movement Terminal loads | Functional | P1 |
| Self-Service Kiosk loads | Functional | P2 |
| No JS errors on operational routes | JS Errors | P0 |

---

## 4. Pass/Fail Criteria

| Criterion | Pass | Fail |
|-----------|------|------|
| Page load | Content > 500 chars, no "Application Error" | Blank page or crash |
| API response | HTTP 200/201/204, `success: true`, `data` defined | 4xx/5xx, `success: false` |
| JS console errors | 0 ReferenceError/TypeError | Any fatal JS error |
| Auth flow | Redirects correctly, session persists | Redirect loop, session lost |
| Cross-domain sync | Both APIs return 200 with data | Shape mismatch or 4xx |

---

## 5. Known Constraints

- **1 worker** — tests run sequentially to avoid rate limiting on remote server
- **No mock data** — all tests hit the live production server at 150.109.15.108:3010
- **Auth state** — reused from `auth.setup.ts` storageState; manual re-login on redirect
- **POS** — requires open shift; tests accept both product grid and shift-warning states
- **Permissions** — hansel@zenvix.id is Owner role; some endpoints may return 403 for lower roles (not tested here)

---

## 6. How to Run

```bash
# Full suite
npx playwright test

# Single file
npx playwright test tests/playwright/05_finance.spec.ts

# With UI
npx playwright test --ui

# Show report
npx playwright show-report
```

---

*Plan version: 1.0 — 2026-06-08*
