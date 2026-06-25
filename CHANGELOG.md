# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
