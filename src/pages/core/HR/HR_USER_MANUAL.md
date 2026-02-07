# Zenvix HRIS User Manual

This guide is written for HR teams, department heads, and administrators who operate Zenvix HR on a daily basis.

## 1) Getting Started

### Access
1. Open Core → **HR**.
2. Your access is determined by role and department:
   - **HR Admin / Company Admin / Owner**: full HR access.
   - **Dept Head**: department-scoped access.
   - **Staff**: self-only access.

### Navigation Overview
Use the left sidebar inside HR:
- **PulseDesk**: Workstream inbox
- **RosterGrid**: Staff directory
- **PeopleCore**: Employee 360 record
- **OrgMap**: Department intelligence
- **VaultSpace**: HR document vault
- **FlowGate**: Approvals and routing
- **TalentFlow**: Recruitment ATS
- **SkillTrack**: Training + compliance
- **GrowthCycle**: Performance cycles
- **PayCycle Studio**: Payroll prep
- **LexBoard**: Legal + contracts
- **InsightLayer**: Analytics
- **CaseDesk**: HR case management

## 2) PulseDesk (Operational Inbox)

**Purpose:** Immediate visibility into critical HR actions.

How to use:
1. Use the search bar to locate urgent items.
2. Click any item card to open FlowGate for approvals.
3. Use "Create Request" to start a new approval route.

## 3) RosterGrid (Staff Directory)

**Purpose:** Manage and act on workforce records.

### Search + Filters
Use `FilterBar` for:
- Search by name, role, or email
- Department filter
- Status filter
- Role filter

### Create Employee
1. Click **New Employee**.
2. Fill the form (name, department, role, status, salary).
3. Click **Save Employee**.

### Edit Employee
1. Open row actions → **Edit Profile**.
2. Update fields and save.

### Termination Workflow
1. Open row actions → **Request Termination**.
2. This sends a FlowGate request for approval.

### Bulk Actions
Use WorkQueue buttons to:
- Assign training
- Request performance review
- Open payroll case
- Import staff CSV
- Export staff report

## 4) PeopleCore (Employee 360)

**Purpose:** Full employee record across HR domains.

Tabs:
- **Identity**: employment details
- **Attendance**: attendance history
- **Payroll**: payroll run history
- **Contracts**: legal status
- **Performance**: review cycles

### Start Workflow
1. Click **Start Workflow**.
2. Choose entity type, destination dept, and add notes.
3. Submit to FlowGate.

### Escalate / Send to FlowGate
These actions create approvals tied to the employee record.

## 5) OrgMap (Department Intelligence)

**Purpose:** Department health, staffing, and requisitions.

Actions:
- **New Department**: creates a new department record.
- **Escalate Staffing Risk**: routes to HR via FlowGate.
- **Open Requisition**: creates a requisition in TalentFlow.

## 6) VaultSpace (HR Document Vault)

**Purpose:** Secure storage for HR documents.

Actions:
- **Generate Contract**: creates a new contract record.
- **Attach Document**: logs a document into VaultSpace.
- **Export Staff Report**: exports vault data (audit logged).

## 7) FlowGate (Approvals)

**Purpose:** Approval routing OS.

Actions:
- **Approve / Reject / Modify** directly in FlowGate.
- **New Route**: create approval requests by entity type.

Every action creates an immutable audit entry.

## 8) TalentFlow (Recruitment ATS)

**Purpose:** Recruitment pipeline + requisition approvals.

Actions:
- **Create Requisition**: starts a new hiring request.
- **Schedule Interview**: logs interview scheduling.
- **Send to FlowGate**: routes candidate decisions.

## 9) SkillTrack (Training & Compliance)

**Purpose:** Training assignment and compliance tracking.

Actions:
- **Assign Training**: assign program to employee.
- **Bulk Assign**: assign to multiple employees.
- **Export Compliance**: export tracking data.
- **Escalate**: send compliance gaps to FlowGate.

## 10) GrowthCycle (Performance OS)

**Purpose:** Review cycles and performance management.

Actions:
- **Create Review Cycle**
- **Launch Cycle**
- **Run Calibration**
- **Send Review to FlowGate**

## 11) PayCycle Studio (Payroll Prep)

**Purpose:** Payroll readiness and approvals.

Actions:
- **Create Payroll Run**
- **Lock Attendance**
- **Submit to FlowGate**
- **Approve (Finance)**
- **Export Journal**

## 12) LexBoard (Legal & Contracts)

**Purpose:** Legal compliance, contracts, and visa tracking.

Actions:
- **Create Contract**
- **Request Renewal**
- **Route to FlowGate**

## 13) InsightLayer (Analytics)

**Purpose:** Workforce intelligence and risk forecasting.

Actions:
- **Generate Report**
- **Share to Exec**
- **Route to FlowGate**

## 14) CaseDesk (HR Cases)

**Purpose:** Manage disputes, corrections, and escalations.

Actions:
- **New Case**
- **Assign Owner**
- **Escalate**
- **Case Detail**: track resolution and activity

## 15) Audit & Workflow Behavior

All mutations:
- Create an audit log entry
- Route through FlowGate when approvals are required
- Respect tenant + role scope

## 16) Best Practices

- Use FlowGate for approvals instead of email
- Log all critical actions
- Keep employee records updated to maintain payroll accuracy
- Use VaultSpace for official HR documents

## 17) Troubleshooting

If a page is blank or missing data:
1. Verify your role permissions.
2. Ensure your tenant has access.
3. Check that the FlowGate workflow is created.

If approvals do not show:
1. Confirm destination dept is correct.
2. Check Workflow Inbox for your department.

---

Zenvix HRIS is designed to be consistent, auditable, and safe under enterprise compliance rules.
