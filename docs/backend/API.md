# API Reference

## Base URL

- Development: `http://localhost:3001/v1`
- Production: `https://<domain>/v1`

## Authentication

All endpoints (except `POST /auth/login`) require a Bearer token:
```
Authorization: Bearer <jwt_token>
```

Tokens expire after 8 hours.

---

## Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/login` | Public | Login with email + password |
| POST | `/auth/register` | Public | Register new account |
| GET | `/auth/me` | Authenticated | Get current user profile |
| POST | `/auth/change-password` | Authenticated | Change own password |
| POST | `/auth/reset-password` | HR_Admin | Reset another user's password |

### POST /auth/login
```json
// Request
{ "email": "sari@majubersama.com", "password": "demo123" }

// Response
{ "success": true, "token": "eyJ...", "user": { "id": "...", "full_name": "...", "role": "HR_Admin" } }
```

---

## Employees

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/employees` | HR_Admin | List all employees |
| GET | `/employees/me` | Authenticated | Get own profile |
| POST | `/employees` | HR_Admin | Create employee |
| PUT | `/employees/:id` | HR_Admin | Update employee |

---

## Attendance

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/attendance/dashboard` | HR_Admin | Today's attendance summary |
| GET | `/attendance/my-history` | Authenticated | Own attendance history |
| POST | `/attendance/clock-in` | Authenticated | Record clock-in |
| POST | `/attendance/clock-out` | Authenticated | Record clock-out |

### POST /attendance/clock-in
```json
{ "timestamp": "2026-06-25T02:00:00Z", "latitude": -6.2088, "longitude": 106.8456 }
```

---

## Leave Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/leaves/pending?status=pending` | HR_Admin | Filtered leave requests |
| GET | `/leaves/my-requests` | Authenticated | Own leave history |
| GET | `/leaves/my-balance` | Authenticated | Own leave balance |
| POST | `/leaves/request` | Authenticated | Submit leave request |
| PUT | `/leaves/:id/approve` | HR_Admin/Supervisor | Approve request |
| PUT | `/leaves/:id/reject` | HR_Admin/Supervisor | Reject request |

---

## Payroll

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/payroll/periods` | HR_Admin | List pay periods |
| POST | `/payroll/periods` | HR_Admin | Create period |
| POST | `/payroll/periods/:id/process` | HR_Admin | Generate payslips |
| GET | `/payroll/my-payslips` | Authenticated | Own payslips |
| GET | `/payroll/components` | HR_Admin | List payroll components |
| POST | `/payroll/components` | HR_Admin | Create component |
| GET | `/payroll/loans` | HR_Admin | List all loans |
| GET | `/payroll/my-loans` | Authenticated | Own loans |
| POST | `/payroll/loans/request` | Authenticated | Request loan |
| POST | `/payroll/loans/:id/approve` | HR_Admin | Approve loan |

---

## Schedule

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/payroll/schedules` | Authenticated | List work schedules |
| POST | `/payroll/schedules` | HR_Admin | Create schedule |
| GET | `/payroll/my-schedule` | Authenticated | Own current schedule |
| GET | `/payroll/absences` | HR_Admin | List absence records |
| POST | `/payroll/absences` | HR_Admin | Record absence |
| GET | `/payroll/company-holidays` | Authenticated | Company holidays |

---

## Notifications

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/notifications/my-notifications` | Authenticated | Own notifications |
| GET | `/notifications/public` | Authenticated | Public announcements |
| PUT | `/notifications/:id/read` | Authenticated | Mark as read |

---

## Admin Settings

All admin endpoints require `HR_Admin` or `SuperAdmin` role.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/admin/offices` | Office locations CRUD |
| GET/POST/PUT/DELETE | `/admin/departments` | Departments CRUD |
| GET/POST/PUT/DELETE | `/admin/roles` | Roles CRUD |
| GET | `/admin/users` | List all users (full name, dept, role) |
| GET/PUT | `/admin/notification-channels` | Channel config |
| GET/PUT | `/admin/hermes` | Hermes AI config |
| GET/PUT | `/admin/attendance-config` | Attendance source config |
| GET | `/settings/agents` | Agent status |
| GET/PUT | `/settings/company` | Company profile info |

---

## SOP Documents

Standard Operating Procedure document management with PDF file storage.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/sop/upload` | HR_Admin | Upload single PDF (multipart/form-data) |
| POST | `/sop/upload-bulk` | HR_Admin | Upload multiple PDFs (up to 20 files) |
| GET | `/sop` | Authenticated | List all SOP documents |
| GET | `/sop/:id` | Authenticated | Get SOP metadata |
| GET | `/sop/:id/file` | Authenticated | Download/view PDF file |
| PUT | `/sop/:id` | HR_Admin | Update SOP metadata (title, description, category) |
| DELETE | `/sop/:id` | HR_Admin | Delete SOP document and file |

### POST /sop/upload
```
Content-Type: multipart/form-data

Fields:
- file: (required) PDF file (max 50MB)
- title: (optional) Document title (defaults to filename)
- description: (optional) Short description
- category: (optional) e.g. "HR", "IT", "Operations"
```

### POST /sop/upload-bulk
```
Content-Type: multipart/form-data

Fields:
- files: (required) Multiple PDF files (max 20, each max 50MB)
- category: (optional) Applied to all uploaded files
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "SOP Pengajuan Cuti",
    "description": "Prosedur pengajuan cuti",
    "category": "HR",
    "file_name": "sop-cuti.pdf",
    "file_size": 245000,
    "mime_type": "application/pdf",
    "created_at": "2026-06-26T00:00:00Z"
  }
}
```

---

## Dashboard

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard/stats` | Authenticated | Dashboard summary stats |

### GET /dashboard/stats Response
```json
{
  "success": true,
  "data": {
    "total_employees": 6,
    "present_today": 4,
    "pending_leave": 2,
    "late_today": 2
  }
}
```

---

## Response Format

All responses follow this shape:
```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

## Rate Limiting

- Auth endpoints: 5 requests/minute per IP
- General API: 100 requests/minute per user

---

## Event Bus — SOP Events

All SOP actions emit events to the Event Bus (persisted in `event_bus_logs`). These events are available to Hermes AI and other downstream consumers.

| Event Type | Trigger |
|---|---|
| `sop.document.uploaded` | Single PDF uploaded |
| `sop.document.bulk_uploaded` | Multiple PDFs uploaded |
| `sop.document.updated` | Metadata edited |
| `sop.document.deleted` | Document removed |
| `sop.document.viewed` | Document accessed/downloaded |
| `sop.catalog.response` | SOP Agent responds to Hermes catalog query |
| `sop.context.provided` | SOP context pushed to Hermes |
