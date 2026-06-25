# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-06-26

### Added
- **Hermes SDK** (`packages/hermes-sdk/`): Standalone TypeScript SDK for Hermes agents on a separate VPS
  - `HermesClient`: REST client for actions, queries, suggestions, event replay
  - `EventStream`: WebSocket client with auto-reconnect for real-time events
  - `SSHTunnel`: Built-in SSH tunnel (connects to TARA VPS via port 22 when HTTP ports are blocked)
  - `SETUP_INSTRUCTIONS.md`: Complete step-by-step guide for team integration
  - Example agents: `basic-agent.ts`, `agent-with-ssh-tunnel.ts`
  - `.env.example` with TARA VPS connection settings
- **HermesModule.forRoot()**: Refactored Hermes from flat providers to a self-contained NestJS dynamic module
  - Injection tokens for NotificationService, IntegrationService, EventBus, WhatsApp (all pluggable)
  - Host apps just call `HermesModule.forRoot({ ... })` instead of registering 12+ providers manually
- **WhatsApp Agent Integration** (Kapso): Per-user WhatsApp number with OTP verification
  - Inbound/outbound messaging, session management, 30-min auto-timeout
  - Hermes actions: `send_whatsapp_reply`, `query_whatsapp_conversation`
  - 90-day message retention with daily cleanup cron
- **SOP Document Management**: Upload, manage, and view Standard Operating Procedure PDFs
  - Single and bulk PDF upload (up to 20 files, 50MB each)
  - Categorized document list with search and filtering
  - Inline PDF viewer modal (web) and full-screen viewer (mobile)
  - Backend storage with Prisma persistence and disk file storage
  - Configurable `SOP_UPLOAD_DIR` env for VPS persistent storage
  - Database migration: `sop_documents` table with indexes
- **Company Profile Settings**: View and edit company name, legal name, industry, NPWP, email, phone, website, address
- **Employee Detail Page**: Click employee row to see full profile (fixes 404 on `/web/employees/:id`)
- **Dashboard Stats Wired**: Dashboard now fetches real stats (total employees, present today, pending leave, late today)
- **Editable Offices/Branches**: Edit and delete office locations from Settings > Organisasi
- **Editable Departments**: Edit and delete departments from Settings > Organisasi
- **Enhanced Akun & Akses**: Users section shows full name, department, role badge, and status instead of opaque IDs
- SOP navigation item in both Web sidebar and Mobile bottom nav
- Backend demo endpoints for SOP, dashboard stats, company settings, and employee detail

### Changed
- Default theme changed from dark to light mode
- Company info updated to Ralali (Headquarter at Capital Cove Business Loft, BSD City)
- Settings page now opens on "Profil Perusahaan" section by default

### Fixed
- Employee row click returning 404 (missing route for `/web/employees/:id`)
- Dashboard showing placeholder "—" values instead of real data
- Users section in Settings only showing employee IDs without names

---

## [2.0.1] - 2026-06-25

### Fixed
- Mobile users now correctly land on the Mobile interface (`/m`) after login instead of the Web dashboard
- Root URL (`/`) now detects viewport and redirects to `/m` (mobile) or `/web` (desktop)

### Added
- `src/lib/useIsMobile.ts` — viewport detection hook used for adaptive routing

---

## [2.0.0] - 2026-06-25

### Added
- Full rewrite of TARA HR System (v2)
- Dual-interface design: Web (HR Admin/Supervisor) + Mobile PWA (Karyawan)
- Seven autonomous HR agents
- Attendance with biometric + geo-fencing (PostGIS)
- Leave management with real-time balance
- Payroll processing with slip generation
- Loan/kasbon management with auto-payroll deduction
- Schedule/shift management
- Multi-channel notifications (App, WhatsApp, Telegram, Email)
- Reporting & analytics dashboard
- Demo mode (tanpa database)
- App version control system (`src/lib/version.ts`)
- Application footer with copyright, company, and version display
- Light/Dark luxury theme (Ivory Champagne / Obsidian Navy)
- i18n support (Bahasa Indonesia & English)

---

## Version Control

The application version is managed in `src/lib/version.ts`. This is the single source of truth for version metadata displayed in the app footer.

### Releasing a new version

1. Update `APP_VERSION` in `src/lib/version.ts`
2. Update `APP_BUILD_DATE` in `src/lib/version.ts`
3. Update `version` in `package.json` to match
4. Add a new section to this CHANGELOG
5. Commit with message: `release: vX.Y.Z`
6. Tag the commit: `git tag vX.Y.Z`
