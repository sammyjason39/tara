# Zenvix HR Workspace

The **Zenvix HR Workspace** is the canonical HR operating system inside Core. It is **tenant-safe**, **role-safe**, **audit-first**, and **DB-ready** for a future Postgres adapter.

This workspace is not a demo. It is the permanent, enterprise-grade template for all future Core workspaces.

## Zenvix HR Product Names

- **PulseDesk**: Operational command inbox for HR workstreams  
- **RosterGrid**: Workforce directory (enterprise-grade staff management)  
- **PeopleCore**: Employee 360 record (human-centric profile + timeline)  
- **OrgMap**: Org structure intelligence  
- **VaultSpace**: HR document vault  
- **FlowGate**: Approval routing OS  
- **TalentFlow**: Recruitment ATS pipeline  
- **SkillTrack**: Training + compliance tracking  
- **GrowthCycle**: Performance OS  
- **PayCycle Studio**: Payroll preparation and approvals  
- **LexBoard**: Legal + contract intelligence  
- **InsightLayer**: Workforce analytics and intelligence  
- **CaseDesk**: HR case management

## Folder Layout

`src/pages/core/HR/`

- `HRWorkspaceLayout.tsx`  
  Workspace shell with sidebar, breadcrumbs, role gating, and `<Outlet />`.

- `PulseDesk.tsx`  
  Operational inbox for approvals, compliance, payroll, and attendance signals.

- `RosterGrid.tsx`  
  Workforce directory with search, filters, bulk actions, create/edit flows, and workflow routing.

- `PeopleCore.tsx`  
  Employee 360 record with tabs (identity, attendance, payroll, contracts, performance) and activity stream.

- `OrgMap.tsx`  
  Department intelligence with staffing risk and requisition routing.

- `VaultSpace.tsx`  
  Secure document workspace with contract creation, attachment flows, and FlowGate routing.

- `FlowGate.tsx`  
  Approval routing OS with decision panel, audit trail, and workflow creation.

- `TalentFlow.tsx`  
  Recruitment pipeline with requisitions, interview scheduling, and approvals.

- `SkillTrack.tsx`  
  Training and compliance management with assignment + escalation workflows.

- `GrowthCycle.tsx`  
  Performance review cycles and calibration actions.

- `PayCycleStudio.tsx`  
  Payroll preparation, approval routing to Finance, and journal export.

- `LexBoard.tsx`  
  Legal and contract management, visa alerts, and renewal routing.

- `InsightLayer.tsx`  
  Workforce intelligence with report generation and routing.

`src/pages/core/HR/Cases/`

- `CaseDesk.tsx`  
  Case management workspace with escalation flows.

- `CaseDetail.tsx`  
  Full case view with activity stream and FlowGate routing.

## Routing

Routes are registered in `src/core/runtime/coreRoutes.tsx` under `/core/hr/*`:

- `/core/hr`
- `/core/hr/roster`
- `/core/hr/people/:id`
- `/core/hr/org-map`
- `/core/hr/vault`
- `/core/hr/flowgate`
- `/core/hr/cases`
- `/core/hr/cases/:id`
- `/core/hr/talent`
- `/core/hr/skilltrack`
- `/core/hr/growth`
- `/core/hr/paycycle`
- `/core/hr/lexboard`
- `/core/hr/insights`

All routes are protected by `ProtectedRoute`.

## Core Dependencies

### UI Foundations

`src/core/ui/`
- `PageShell`
- `PageHeader`
- `WorkspacePanel`

### Shared Tools

`src/core/tools/`
- `DataTableShell`
- `FilterBar`
- Workflow utilities (`src/core/tools/workflows`)
- Activity stream utilities (`src/core/tools/activity`)

### Security & RBAC

`src/core/security/`
- `session.ts`
- `roles.ts`
- `policy.ts`
- `ProtectedRoute.tsx`

### HR Services

`src/core/services/hr/`
- `staffService`
- `peopleService`
- `orgService`
- `legalService`
- `trainingService`
- `performanceService`
- `payrollService`
- `recruitmentService`
- `analyticsService`
- `caseService`
- `workflowService`

All mutations must flow through these services and are logged to the audit ledger.

## Workflow + Audit

FlowGate is powered by Workflow V2:

`src/core/tools/workflows/`
- `workflowTypes.ts`
- `workflowEngine.ts`
- `workflowRepository.ts`
- `mockWorkflowRepo.ts`
- `approvalInbox.tsx`

Audit logging is append-only:

`src/core/logging/`
- `audit.ts`
- `auditLedger.ts`

## Development Rules

- **No UI-level static arrays for data.** All data comes from service layer.
- **No mutations in UI.** Use services only.
- **Every mutation logs an audit event.**
- **All approvals route through FlowGate.**
- **Respect tenant and role scope in every service call.**

## Extending the Workspace

When adding new HR features:

1. Extend domain types in `src/core/types/hr/`.
2. Update repository interfaces in `src/core/repositories/hr/`.
3. Add or update service methods in `src/core/services/hr/`.
4. Build UI in `src/pages/core/HR/` using `PageHeader`, `WorkspacePanel`, `DataTableShell`, and `FilterBar`.
5. Update navigation and routes in `HRWorkspaceLayout.tsx` and `coreRoutes.tsx`.
6. Ensure `ProtectedRoute` and policy enforcement are correct.

## Troubleshooting

Common failure points:

- Missing `<Outlet />` in layout
- Incorrect permission or scope checks
- Service layer bypassed from UI
- Workflow created without audit log

This workspace is the template for future enterprise workspaces — keep it clean, scalable, and production-safe.
