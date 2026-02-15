# Zenvix Attendance Workspace — Locked README  
**Module:** Attendance Engine + Settings Attendance Controls  
**Status:** Permanently Locked Specification  
**Scope:** Attendance Enforcement Only (Modular, Future-Proof)

---

## 1. Overview & Vision

The **Zenvix Attendance Engine** is the official workforce presence verification and compliance engine of Zenvix.

Attendance in Zenvix is not a simple clock-in tool.

It is a:

- Schedule-driven presence system  
- Device-trusted verification layer  
- Location-enforced compliance engine  
- Abnormal-case + proof-based workflow  
- Fully auditable antifraud system  

Attendance is treated as a **legal-grade operational record**.

---

## 2. Core Design Principles

Zenvix Attendance is built on these permanent rules:

- Attendance must always match schedule truth  
- Attendance is only valid from trusted registered devices  
- Location must match assigned workplace zones  
- Abnormal events require mandatory justification + proof  
- All events are immutable and audit-locked  
- Attendance remains modular and does not own payroll, sync, or scheduling  

---

## 3. Strict Modular Boundaries

Attendance Engine owns only attendance enforcement.

### Attendance Engine DOES Own

- Attendance event intake  
- Presence validation  
- Policy evaluation (late/no-show rules)  
- Location enforcement  
- Abnormal case creation  
- Justification + proof workflow  
- Supervisor exception cockpit  
- Fraud scoring + escalation  
- Attendance finalization state  
- Immutable audit logs  

---

### Attendance Engine DOES NOT Own

These are handled by separate Zenvix engines:

| Function | Owner Engine |
|---------|--------------|
| Device SDK + hardware integration | Settings Device Registry |
| Offline sync + reliability | Sync Engine |
| Shift generation + assignment | Schedule Engine |
| Payroll computation + salary impact | Payroll Engine |
| Data retention governance | Compliance/Data Governance Engine |

Attendance integrates only through contracts.

---

## 4. Supported Attendance Input Devices

Attendance can be recorded through registered devices only:

- Fingerprint terminals  
- Face recognition terminals  
- Store/office PC attendance kiosk  
- GPS mobile attendance for field teams  
- QR checkpoint mode (optional)  

All devices must be registered in **Settings → Device Registry**.

Unregistered devices are rejected.

---

## 5. Schedule Dependency (Attendance Backbone)

Attendance is meaningless without schedules.

Attendance evaluation depends on:

- Assigned shift window  
- Workplace/site assignment  
- Approved remote work rules  
- Leave and absence records  

Every attendance event references:

- Employee  
- Shift  
- Location zone  
- Device identity  
- Policy ruleset  

---

## 6. Attendance Lifecycle Events

Attendance is structured as immutable events:

| Event Type | Meaning |
|-----------|--------|
| Sign In | Shift presence begins |
| Sign Out | Shift presence ends |
| Break Start/End (optional) | Compliance enforcement |
| Auto Closure | System-enforced sign-out |
| Adjustment Request | Employee correction pipeline |

No event is overwritten.

Only append-based corrections are allowed.

---

## 7. Policy Evaluation Engine (Competitor-Grade)

Attendance includes an internal **Attendance Policy Engine**.

It determines:

- Normal attendance  
- Late classification  
- No-show threshold  
- Missing sign-out enforcement  
- Proof requirements  
- Escalation triggers  

Outputs:

- Attendance status  
- Required employee action  
- Risk score  

Grace period is policy-driven, never hardcoded.

---

## 8. Late, Absent, No-Show Detection

Attendance automatically evaluates:

### Late Arrival

- Sign-in after grace window  
- Employee must justify  

### No Show

- No sign-in by configured threshold  
- Supervisor escalation  

### Missing Sign-Out

- Sign-in exists but no sign-out  
- Auto closure + abnormal case created  

---

## 9. Smart Presence Detection (Anti-Fraud Differentiator)

Zenvix supports detection beyond punch logs.

### Scenario: “Present but Not Signed”

Employee is physically present but has no recorded sign-in.

Triggers:

- Device proximity presence  
- Store terminal login evidence  
- Supervisor confirmation  

Result:

- Unlogged Presence case created  
- Mandatory justification required  

This is a key Zenvix advantage over competitors.

---

## 10. Location Match Enforcement

Attendance must match assigned workplace location zones.

Validation modes:

- Exact geofence match  
- Allowed radius zone  
- Multi-site allowed list  
- Approved remote mode bypass  

Mismatch triggers:

- Abnormal attendance case  
- Mandatory employee justification  
- Fraud risk scoring  

---

## 11. Abnormal Attendance Enforcement (Mandatory Workflow)

Abnormal attendance is never passive.

Each abnormal event becomes a formal compliance case.

Examples:

- Late beyond grace  
- No-show  
- Location mismatch  
- Device anomaly  
- Missing sign-out  
- Fraud risk escalation  

---

### Automatic Employee Notification

System immediately notifies employee via:

- Mobile push  
- Dashboard alert  
- Email (optional policy)

Notification includes:

- Abnormal type  
- Shift reference  
- Required deadline for response  

---

### Mandatory Justification + Proof Upload

Employee must submit:

- Reason category  
- Written explanation  
- Proof attachment (required by policy)

Allowed proof:

- PDF documents  
- Images (JPG/PNG)  
- Medical certificates  
- Supervisor letters  

Proof is stored permanently in the employee compliance profile.

Employees cannot delete evidence.

---

## 12. Supervisor Exception Cockpit

Managers receive an enterprise-grade exception dashboard.

Shows:

- Unresolved abnormal cases  
- Missing sign-outs  
- Location mismatches  
- No-shows  
- High-risk fraud events  

Features:

- SLA timers  
- Risk-ranked ordering  
- Bulk approvals/rejections  

---

## 13. Fraud Intelligence Layer

Attendance includes a dedicated fraud scoring engine.

Signals:

- Repeated location mismatches  
- Excessive manual corrections  
- Device anomalies  
- Unusual attendance patterns  
- Presence without sign-in frequency  

Outputs:

- Risk score  
- Escalation trigger  
- Compliance audit flag  

Competitors are weak here. Zenvix leads.

---

## 14. Attendance Finalization State (Payroll-Safe Boundary)

Attendance supports finalization without owning payroll.

States:

- Draft events  
- Exceptions unresolved  
- Period marked Final  

Payroll Engine consumes only finalized attendance records.

No retro edits without append-only correction protocol.

---

## 15. Immutable Audit & Compliance Logging

Every attendance event stores:

- Employee ID  
- Timestamp (server-signed)  
- Device ID  
- Location coordinates  
- Shift reference  
- Policy ruleset  
- Risk score  
- Approval chain (if abnormal)  

Logs are:

- Append-only  
- Tamper-resistant  
- Exportable for audits  

Attendance is a compliance record, not a UI feature.

---

---

# SETTINGS WORKSPACE — Attendance Controls (Locked)

Attendance enforcement depends on Settings UI governance.

Attendance Engine enforces only.  
Settings Workspace configures all control surfaces.

---

## S1. Attendance Policy Manager

Location:

**Settings → Attendance Policies**

Configurable fields:

| Policy | Scope |
|-------|------|
| Grace Period Minutes | Global / Branch |
| No-Show Trigger Threshold | Global / Branch |
| Missing Sign-Out Auto Closure | Branch |
| Proof Required Rules | Branch / Role |
| Manual Correction Limits | Global |
| Location Enforcement Strictness | Branch |

UI supports:

- Global default + override toggle  
- Effective start date  
- Approval workflow  
- Full audit history  

---

## S2. Workplace Location & Geofence Manager

Location:

**Settings → Locations & Geofences**

Purpose:

- Stores and offices relocate frequently  
- Geofence updates must be UI-driven, not code-driven  

---

### Location Entity Model

Each branch includes:

- Location name  
- Address  
- GPS anchor  
- Geofence boundary  
- Active/Inactive  
- Effective start date  

---

### Geofence Types Supported

#### Radius Mode (Simple)

- Center + radius meters  

#### Polygon Mode (Enterprise)

- Multi-point boundary drawing  

#### Multi-Zone Sites

- Main office  
- Warehouse  
- Restricted zones  

---

### Map-Based Geofence Editor UI

Branch admins can:

- Search address  
- Drop pin  
- Adjust radius slider  
- Draw polygon boundary  
- Save draft → submit approval  

No manual coordinate editing required.

---

### Relocation Workflow

When a store moves:

1. Admin selects branch  
2. Click “Update Geofence”  
3. Draw new boundary  
4. Set effective date  
5. Submit for approval  
6. Old zone archived automatically  

Attendance enforcement switches instantly on activation.

---

### Geofence Change Audit Logging

Every geofence update records:

- Old vs new boundary  
- Who changed it  
- Who approved it  
- Effective timestamp  
- Reason for change  

Prevents silent fraud expansion.

---

## S3. Attendance Device Assignment Console

Location:

**Settings → Attendance Devices**

Controls:

- Assign devices to branches  
- Restrict device attendance zones  
- Monitor device health  
- Lock compromised devices  

Fingerprint device example:

- Valid only inside Store A geofence  

---

## S4. Attendance Governance Roles & Permissions

Location:

**Settings → Roles & Attendance Governance**

| Role | Permissions |
|------|------------|
| Employee | Clock + justify only |
| Supervisor | Review abnormal cases |
| Branch Manager | Propose geofence changes |
| HR Admin | Approve policy/location updates |
| Compliance Officer | Audit all actions |

No single actor controls everything.

---

## S5. Attendance Exception Approval Rules

Location:

**Settings → Attendance Exceptions**

Configurable:

- Who can approve corrections  
- When HR co-sign is mandatory  
- Escalation for repeated anomalies  
- Fraud-trigger investigation thresholds  

---

## S6. Settings Audit History Viewer

All attendance-related settings changes are immutable:

- Policy edits  
- Geofence updates  
- Device reassignment  
- Role governance changes  

Compliance export supported.

---

# Final Lock Statement

The Zenvix Attendance Engine is permanently governed by:

- Schedule truth  
- Trusted registered devices  
- Location geofence enforcement  
- Mandatory abnormal justification + proof  
- Supervisor exception cockpit  
- Fraud intelligence scoring  
- Attendance finalization boundary  
- Immutable audit logging  
- Settings-controlled policy governance  

Attendance records cannot be erased.

Only append-based correction with full approval trace is permitted.

---

**Attendance Engine + Settings Attendance Controls are now permanently locked.**
