# Zenvix Core Global Scheduling Engine (LOCKED)

## Universal Workforce Scheduling Backbone
**Company-Isolated • Auditable • Attendance-Grade • Payroll-Safe • Anti-Fraud**

---

## 1. Overview & Purpose
The **Zenvix Core Global Scheduling Engine (GSE)** is the single source of truth for:

- Workforce schedules  
- Attendance expectation  
- Payroll baseline  
- Leave and sick accounting  
- Commission and operational attribution  
- Anti-fraud enforcement  

This engine is universal across Zenvix, but strictly isolated per company.

---

## 2. Tenant Isolation Model (Non-Negotiable)

- Scheduling exists globally in Core  
- Every record is scoped to exactly one company  
- No cross-company schedule access is possible  
- All audit trails remain tenant-contained  

---

## 3. Governance & Role Permissions

| Role | Scope | Scheduling Authority |
|------|------|----------------------|
| Employee | Self | View schedule, submit requests/amendments |
| Dept Admin | Department | Draft schedules for department staff |
| Dept HOD | Department | Approve + lock department schedules |
| Operations HOD | Organization | Oversight across workforce planning |
| HR HOD | Organization | Consume schedules, monitor amendments/overrides |
| Owner | Organization | Full access across all departments |
| Superadmin | System | Global compliance and override authority |

---

## 4. Department Ownership Rule (Locked)

- Each department owns its own schedule  
- HOD may only schedule:
  - Employees under their department  
  - Themselves  
- Owner/Superadmin may schedule across all departments  
- Cross-department scheduling by normal HOD is forbidden

---

## 5. Core Scheduling Data Model

### ScheduleEntry
A schedule record contains:

- Employee ID  
- Department ID  
- Shift type  
- Start time / End time  
- Location / Workplace mode  
- Status: Draft / Pending / Approved / Locked  
- Created by  
- Approved by  
- Version hash  
- Immutable audit reference  

---

## 6. Schedule Lifecycle Workflow

### Phase 1 — Draft Creation
- Dept Admin or HOD prepares schedules  
- Status: `Draft`

### Phase 2 — Approval Required
- Schedule cannot become active without HOD approval  
- Status: `Pending Approval`

### Phase 3 — Approved + Locked
- HOD approval finalizes schedule  
- Schedule becomes immutable  
- Status: `Approved + Locked`

### Phase 4 — HR Consumption
HR uses locked schedules for:

- Attendance expectation  
- Payroll computation baseline  
- Leave validation  
- Compliance reporting  

---

## 7. Schedule Integrity Rule (Immutable Ledger)

Approved schedules:

- Cannot be edited directly  
- Cannot be overwritten  
- Only changeable via structured transactions:
  - Amendments  
  - Swaps  
  - Emergency Overrides  
- Schedules are workforce-grade ledgers

---

## 8. Employee Profile Integration

Each employee profile displays:

- Current approved schedule  
- Upcoming shifts  
- Approved leave days  
- Pending requests  
- Amendment and override history  
- Schedules become part of the employee’s operational identity

---

## 9. Employee Future Requests

Employees may request:

- Leave  
- Holiday  
- Shift adjustment  
- Planned absence  
- Schedule preference  

Requirements:

- Reason  
- Optional documentation  

Workflow:

`Submitted → Pending HOD Approval → Approved/Rejected`

---

## 10. Past Schedule Amendments (Strict)

Employees may request retroactive correction:

Examples:

- Sick justification  
- Missed attendance correction  
- Emergency absence documentation  

Requirements:

- Mandatory justification  
- Proof upload  
- HOD approval  
- HR notification  
- Payroll impact recalculation  

No retroactive edits without approval

---

# ✅ Shift Swap Engine (LOCKED)

## 11. Shift Swap as a First-Class Contract
A swap is not an edit. It is a two-party agreement requiring approval.

### ShiftSwapRequest Object

Contains:

- Requester employee  
- Target employee  
- Shift(s) involved  
- Swap type  
- Reason  
- Consent state  
- HOD approver  
- Payroll impact flag  
- Audit hash  

---

## 12. Swap Workflow

1. Employee initiates swap  
2. Counterparty accepts  
3. HOD approves  
4. System executes schedule re-issuance  
5. Attendance truth updates instantly  
6. HR notified if payroll-impacting  

No swap is valid without approval

---

# ✅ Emergency Coverage Override Engine (LOCKED)

## 13. Immediate Managerial Emergency Override

Operational reality requires:

- No-show events  
- Sudden emergencies  
- Last-minute staffing continuity  

Therefore, **Emergency Override is Immediate**, protecting:

- Payroll fairness  
- Operational continuity  
- Attendance truth consistency  

---

## 14. EmergencyCoverageOverride Object

Fields:

- Absent employee (A)  
- Covering employee (B)  
- Shift ID  
- Initiator (HOD/Admin)  
- Mandatory reason code  
- Free-text justification  
- Timestamp  
- HR notification flag  
- Payroll impact flag  
- Immutable audit hash  

---

## 15. Emergency Override Rules

- May be executed anytime during operational shift window  
- Requires mandatory justification  
- Only within department scope (Owner override allowed across departments)  
- Cannot be deleted, only reconciled

---

## 16. Payroll Protection Rule

- Covering employee B is paid from full shift start  
- No payroll deduction due to HOD submission delay  
- Attendance expectation updates immediately  

---

# ✅ Accountability Scoring System (LOCKED)

## 17. Overrides Create Accountability for Both Parties

### Employee A (Absent Party)

- Absence risk score increases  
- Must submit justification post-incident  
- Unresolved absence converts to unpaid/disciplinary workflow  

### Employee B (Covering Party)

- Coverage credit increases  
- Overtime monitored  
- Payroll entitlement protected  

### HOD (Initiator Party)

- Override frequency impacts governance score  
- Excessive overrides trigger escalation  
- Overrides require documentation enforcement  

---

## 18. Department Stability Metrics

Tracks:

- Overrides per month  
- Swap frequency  
- Amendment rates  
- Payroll anomaly index  
- Staffing stability score  

---

# ✅ Attendance + Sales + Commission Dependency (LOCKED)

## 19. Attendance Truth Priority Order

Attendance engine evaluates:

1. Approved schedule  
2. Approved swap  
3. Emergency override (highest priority, shortest lifetime)

Ensures:

- Device access authorization remains valid  
- Sales attribution stays correct  
- Commission eligibility remains enforceable  
- Event staffing truth remains consistent  

No attendance credit exists without an approved schedule layer

---

# ✅ HR Oversight + Compliance Ledger (LOCKED)

## 20. HR Notification Layer

HR is notified of:

- All amendments  
- All emergency overrides  
- Payroll-impacting changes  
- High-risk abuse patterns  

HR can escalate to:

- Operations HOD  
- Owner  
- Compliance review  

---

## 21. Audit Logging (Immutable)

Logs every transaction:

- Actor identity  
- Timestamp  
- Before/after values  
- Reason + attachments  
- Approval chain  
- Payroll delta impact  
- Fraud scoring updates  

Audit is:

- Immutable  
- Exportable  
- Compliance-grade  

---

# ✅ Anti-Fraud Enforcement (LOCKED)

## 22. Fraud Signals

- Excessive retroactive amendments  
- Overrides clustered near payroll cutoff  
- Commission-motivated coverage manipulation  
- Repeated no-show patterns  
- HOD override abuse  

## 23. Controls

- Threshold escalation  
- HR mandatory review above limits  
- Owner escalation for abnormal patterns  
- Immutable ledger enforcement  

---

# ✅ Final Locked Policy Statement

Schedules are immutable.  
Swaps are consensual and approved.  
Emergency Overrides are immediate, justified, scored, and audited.  
Attendance remains the operational source of truth across Zenvix.

---

# STATUS: PERMANENTLY LOCKED ✅
This specification is now treated as the Zenvix Core Scheduling Standard.
