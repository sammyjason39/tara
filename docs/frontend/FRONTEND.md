# Frontend Architecture

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build and dev server
- **Tailwind CSS** with custom design tokens
- **shadcn/ui** component patterns
- **React Router v6** for routing
- **TanStack React Query** for server state
- **Sonner** for toast notifications
- **Framer Motion** for animations
- **Lucide React** for icons

## Project Structure

```
src/
├── App.tsx                    # Root component, routing
├── main.tsx                   # Entry point
├── index.css                  # Theme variables, Tailwind base
├── components/
│   ├── ui/                    # Base UI components (shadcn)
│   ├── AppFooter.tsx          # App footer (copyright, version)
│   └── LanguageSelector.tsx   # i18n language picker
├── contexts/
│   ├── AuthContext.tsx         # JWT auth state, login/logout
│   └── ThemeContext.tsx        # Dark/Light mode persistence
├── layouts/
│   ├── WebLayout.tsx           # Desktop sidebar + top bar + footer
│   └── MobileLayout.tsx        # Mobile bottom tab navigation + footer
├── pages/
│   ├── auth/LoginPage.tsx      # Login screen
│   ├── web/                    # Desktop pages (HR/Supervisor)
│   │   ├── DashboardPage.tsx
│   │   ├── EmployeesPage.tsx
│   │   ├── EmployeeDetailPage.tsx
│   │   ├── AttendancePage.tsx
│   │   ├── LeavesPage.tsx
│   │   ├── PayrollPage.tsx
│   │   ├── SchedulePage.tsx
│   │   ├── SopPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── ProfilePage.tsx
│   ├── mobile/                 # Phone pages (All Employees)
│   │   ├── MobileHomePage.tsx
│   │   ├── MobileClockPage.tsx
│   │   ├── MobileLeavePage.tsx
│   │   ├── MobileSopPage.tsx
│   │   ├── MobileNotificationsPage.tsx
│   │   └── MobileProfilePage.tsx
│   └── NotFoundPage.tsx
└── lib/
    ├── api.ts                  # HTTP client with auth header
    ├── useIsMobile.ts          # Mobile viewport detection hook (<768px)
    ├── utils.ts                # cn() helper for Tailwind
    └── version.ts              # App version (single source of truth)
```

## Routing

| Path | Layout | Page | Access |
|------|--------|------|--------|
| `/` | — | RootRedirect | — |
| `/login` | None | LoginPage | Public |
| `/web` | WebLayout | DashboardPage | HR/Supervisor |
| `/web/employees` | WebLayout | EmployeesPage | HR |
| `/web/employees/:id` | WebLayout | EmployeeDetailPage | HR |
| `/web/attendance` | WebLayout | AttendancePage | HR/Supervisor |
| `/web/leaves` | WebLayout | LeavesPage | HR/Supervisor |
| `/web/payroll` | WebLayout | PayrollPage | HR |
| `/web/schedule` | WebLayout | SchedulePage | HR |
| `/web/sop` | WebLayout | SopPage | All |
| `/web/notifications` | WebLayout | NotificationsPage | All |
| `/web/settings` | WebLayout | SettingsPage | HR |
| `/web/profile` | WebLayout | ProfilePage | All |
| `/m` | MobileLayout | MobileHomePage | All |
| `/m/clock` | MobileLayout | MobileClockPage | All |
| `/m/leave` | MobileLayout | MobileLeavePage | All |
| `/m/sop` | MobileLayout | MobileSopPage | All |
| `/m/notifications` | MobileLayout | MobileNotificationsPage | All |
| `/m/profile` | MobileLayout | MobileProfilePage | All |

### Adaptive Routing (Mobile Detection)

After login, the app automatically routes users to the correct interface based on viewport width:

- **Mobile (< 768px):** Redirects to `/m` (MobileLayout with bottom tab navigation)
- **Desktop (≥ 768px):** Redirects to `/web` (WebLayout with sidebar navigation)

This detection is handled by the `useIsMobile` hook (`src/lib/useIsMobile.ts`) which uses `window.matchMedia` to listen for viewport changes. The hook is used in two places:

1. **LoginPage** — navigates to `/m` or `/web` after successful authentication
2. **RootRedirect** (in `App.tsx`) — redirects the `/` route based on device + auth state

## Design System

### Theme

Two themes: Light (default) and Dark. Controlled via CSS variables in `index.css`.

**Light mode:** Warm ivory base, deep navy primary, champagne accents
**Dark mode:** Deep charcoal with warm undertone, gold accent signature

### Colors

| Token | Purpose |
|-------|---------|
| `--primary` | Main action buttons, links |
| `--gold` | Premium accent, active states, highlights |
| `--success` | Positive states (on-time, approved) |
| `--warning` | Caution states (pending, late) |
| `--destructive` | Negative states (rejected, error) |

### Typography

| Font | Usage |
|------|-------|
| `font-display` (Playfair Display) | Headings, hero text |
| `font-sans` (Inter) | Body text, UI labels |
| `font-mono` (JetBrains Mono) | Timestamps, codes |

### Utility Classes

| Class | Purpose |
|-------|---------|
| `surface-elevated` | Card with border + shadow |
| `surface-inset` | Sunken/recessed surface |
| `text-luxury-heading` | Display heading style |
| `text-luxury-label` | Uppercase label style |
| `divider-luxury` | Gradient horizontal divider |
| `gold-accent` | Left gold border accent |

## State Management

- **Auth:** React Context (`AuthContext`) — token in localStorage
- **Theme:** React Context (`ThemeContext`) — preference in localStorage
- **Server state:** TanStack React Query — automatic caching, refetching
- **Form state:** Local `useState` — simple and direct

## API Communication

All API calls go through `src/lib/api.ts` which:
1. Prepends `/api` base path (proxied by Vite to backend)
2. Attaches Bearer token from localStorage
3. Handles 401 → redirect to login
4. Returns typed JSON response

## Version & Footer

The application version is managed in `src/lib/version.ts`:

```ts
export const APP_VERSION = "2.0.0";
export const APP_BUILD_DATE = "2026-06-25";
export const APP_NAME = "TARA";
export const APP_COMPANY = "PT. Maju Bersama";
export const APP_COPYRIGHT_YEAR = new Date().getFullYear();
```

The `AppFooter` component renders at the bottom of both WebLayout and MobileLayout:
- Shows: `© 2026 PT. Maju Bersama · v2.0.0`
- On mobile (`< sm`), the version wraps to a second line for compact display
- Uses theme tokens (`border-border/40`, `bg-muted/30`, `text-muted-foreground`)
- On MobileLayout it sits above the bottom navigation bar

Update `src/lib/version.ts` and `CHANGELOG.md` on each release.
