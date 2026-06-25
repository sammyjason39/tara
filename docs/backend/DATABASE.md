# Database Schema

## Overview

TARA uses PostgreSQL 14+ with PostGIS extension for geo-spatial operations. The ORM is Prisma.

**Schema file:** `backend/prisma/schema.prisma`

## Tables

### Core HR

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `employees` | Employee master data | id, employee_code, full_name, email, role_id, department_id, supervisor_id, office_location_id |
| `departments` | Organizational units | id, name, description, manager_id |
| `roles` | Role definitions + permissions (JSONB) | id, role_name, permissions |

### Attendance

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `attendance` | Daily clock-in/out records | employee_id, attendance_date, clock_in_time, clock_out_time, is_tardy, tardiness_minutes, clock_in_source |
| `office_locations` | Geo-fence center points | latitude, longitude, geofence_radius_meters |
| `absence_records` | Unexcused absences (Alpha/No Info) | employee_id, absence_date, absence_type, resolved |

### Leave Management

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `leave_requests` | Leave submissions + approval workflow | employee_id, leave_type, is_paid, start_date, end_date, status, approved_by |
| `leave_balances` | Annual entitlement tracking | employee_id, year, total_entitlement, used_days, remaining_days, carryover_days |

### Payroll

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `payroll_periods` | Monthly pay periods | period_name, start_date, end_date, status |
| `payslips` | Per-employee per-period slip | employee_id, period_id, base_salary, total_additions, total_deductions, net_salary |
| `payslip_items` | Line items (additions + deductions) | payslip_id, item_type, item_name, amount |
| `payroll_components` | Reusable component templates | component_name, component_type, category, default_amount, is_mandatory |

### Loans

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `loans` | Employee loan/kasbon requests | employee_id, loan_type, amount, remaining_balance, status, installment_amount |
| `loan_repayments` | Payment history | loan_id, amount, payment_date, payment_method |

### Schedule

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `work_schedules` | Shift definitions | schedule_name, start_time, end_time, work_days (JSON array) |
| `schedule_assignments` | Employee ↔ Schedule mapping | employee_id, schedule_id, effective_from, effective_to |

### Notifications & Warnings

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `notifications` | In-app notifications (private + public) | recipient_id, notification_type, visibility, title, content, is_read |
| `warning_letters` | Disciplinary records (SP1/SP2/SP3) | employee_id, warning_level, reason, issued_by, expiry_date |

### System Configuration

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `system_settings` | Key-value config (JSONB) | setting_key, setting_value, setting_category |
| `agent_configs` | Agent enable/disable + health | agent_name, is_enabled, health_status, configuration (JSONB) |
| `public_holidays` | National holidays | holiday_date, holiday_name |
| `company_holidays` | Company-specific holidays | holiday_date, holiday_name, is_recurring |

### Event & Audit

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `event_bus_logs` | Event stream persistence (90-day retention) | event_type, actor_id, entity_id, event_payload (JSONB), delivery_status |
| `audit_logs` | Immutable action log (3-year retention) | action_type, actor_id, target_entity_type, changes (JSONB), action_context |
| `offline_action_queue` | PWA offline sync queue | employee_id, action_type, action_payload, sync_status |

### Integrations

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `aws_device_mappings` | AWS fingerprint device ↔ Employee mapping | aws_employee_id, tara_employee_id, aws_device_id |

### Documents

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `sop_documents` | Standard Operating Procedure PDFs | title, description, category, file_name, file_path, file_size, mime_type, uploaded_by |

## Key Constraints

- `attendance`: UNIQUE(employee_id, attendance_date)
- `leave_balances`: UNIQUE(employee_id, year)
- `weekly_checkins`: UNIQUE(employee_id, week_start_date)
- `payslips`: UNIQUE(employee_id, period_id)

## Indexing Strategy

All tables have indexes on foreign keys and commonly-filtered columns. Composite indexes are used for:
- `attendance(employee_id, attendance_date)` — daily lookup
- `notifications(recipient_id, is_read)` — unread count
- `event_bus_logs(event_type, event_timestamp)` — replay queries
- `audit_logs(actor_id, created_at DESC)` — user activity

## Migrations

```bash
cd backend
npx prisma migrate dev --name <description>   # Create migration
npx prisma migrate deploy                      # Apply in production
npx prisma studio                              # Visual DB browser
```
