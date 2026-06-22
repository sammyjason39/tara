# Requirements Document

## Introduction

The Zenvix web client is a Vite + React 18 + TypeScript single-page application that serves as
the human-facing surface for the platform whose backend was just stabilized. It is built on
shadcn/ui (Radix primitives), Tailwind, and a glassmorphic design system driven by HSL theme
tokens, with light ("Ultra Clean Light Tactical") and dark ("Deep Space Dark Premium") modes
toggled through next-themes. Its pages are organized into groups — Auth/Onboarding, Core,
Retail, F&B, Industry (Clinic, Farming), and Portal — and rendered through three layouts
(CoreLayout, ModuleLayout, POSLayout). Routes are produced dynamically by runtime route
builders (`buildCoreRoutes`, `buildModuleRoutes`) rather than hardcoded, and data flows through
`@tanstack/react-query` against the now-stabilized backend APIs.

The user's goal is to test the entire frontend and ensure that every page and component is
working, uniform, and properly displayed for real human usage. In practice this means: every
route renders without runtime errors and is reachable through navigation; every interactive
control (button, form, dialog, table, filter) functions and gives the user clear feedback
through loading, empty, error, and disabled states; views bind to real backend data with no
placeholder or mock data leaking into production screens; the visual presentation is uniform
across the design system (theme tokens instead of hardcoded colors, consistent button
variants, consistent glass-card usage, spacing, and typography) in both light and dark modes;
layouts are responsive; and accessibility basics (labels, focus, keyboard navigation) hold.

A concrete frontend/backend contract gap is already known: the backend payment create lifecycle
state was renamed from `APPROVAL_PENDING` to `REQUEST_CREATED`, but the web UI
(`src/pages/core/payment/PaymentExecutionHub.tsx`) still gates its Approve action on the old
`APPROVAL_PENDING` value. Contract alignment of this kind is captured as a cross-cutting
requirement.

The work is organized into independently testable and deployable **phases**, one phase per page
group: Phase 1 Auth & Onboarding, Phase 2 Core, Phase 3 Retail, Phase 4 F&B, Phase 5 Industry,
Phase 6 Portal. Each phase satisfies the cross-cutting requirements (render reliability,
interactive control functionality, async state handling, real-data binding, contract alignment,
visual uniformity, responsiveness, accessibility) for the pages in that group. This mirrors the
phased structure of the backend stabilization spec.

The system is a live production deployment on a VPS; changes deploy via git push to `main`
followed by a Docker rebuild. Verification targets the live VPS deployment (the Live_Environment)
and primarily exercises the Web_App through freshly provisioned Synthetic_Organizations — a new
tenant with its company, branch/location, users, and module activations created for each run — so
the application is tested end to end exactly as a brand-new real customer would use it, including
the full onboarding flow, rather than relying solely on the pre-existing accumulated tenant. The
legacy fixed tenant `tnt-3rlhko` is retained as a backend regression tenant. Verification combines
static checks (build, type-check, lint), the existing audit pipeline, component tests
(Vitest + Testing Library), and Playwright end-to-end runs.

This document defines WHAT correct, stabilized frontend behavior is. Implementation details
(specific component rewrites, exact selectors, and per-page fixes) are deferred to the design
phase.

## Glossary

- **Web_App**: The Zenvix React single-page application served from `src/`, comprising its
  pages, layouts, components, contexts, hooks, and the design system.
- **Route**: A URL path served by the React Router configuration in `App.tsx`, including
  dynamically generated routes from `buildCoreRoutes` and `buildModuleRoutes`.
- **Page**: The top-level React component rendered for a Route, located under `src/pages` or
  `src/modules`.
- **Page_Group**: One of the named collections of Pages — Auth, Core, Retail, F&B, Industry,
  or Portal — used to scope the phased requirements.
- **Layout**: One of the three shell components — CoreLayout, ModuleLayout, or POSLayout — that
  wraps Pages and provides navigation chrome.
- **Navigation_Control**: Any in-app element (sidebar link, menu item, tab, breadcrumb, or
  in-page link) whose activation changes the active Route.
- **Interactive_Control**: Any user-operable UI element including buttons, links, form inputs,
  selects, checkboxes, switches, sliders, dialog and dropdown triggers, table controls
  (sort, paginate, row actions), and filters.
- **Form**: A composed set of inputs with submission, typically built with react-hook-form and
  zod validation.
- **Dialog**: A modal or popover surface (Radix dialog, alert-dialog, sheet, popover, or
  dropdown) that opens over the current Page.
- **Async_State**: The state of a data-driven view with respect to a backend request, one of:
  loading, populated, empty, or error.
- **Loading_Indicator**: A visible affordance (spinner, skeleton, or disabled-with-progress
  state) shown while a backend request for a view is in flight.
- **Empty_State**: A visible affordance shown when a successfully completed backend request
  returns no records for a view.
- **Error_State**: A visible affordance shown when a backend request for a view fails.
- **Feedback_Message**: A user-visible confirmation or error surfaced through the toast system
  (sonner) or inline message after an Interactive_Control action completes.
- **Backend_API**: The stabilized HTTP API of the Zenvix platform that the Web_App consumes via
  its data-fetching layer.
- **Backend_Contract**: The agreed shape of a Backend_API request or response — field names,
  types, and enumerated values — that the Web_App relies on for binding and control logic.
- **Real_Data**: Data retrieved at runtime from the Backend_API within the authenticated
  tenant scope, as opposed to placeholder, mock, hardcoded, or sample data.
- **Placeholder_Data**: Hardcoded, mock, or sample values (for example values sourced from
  `src/lib/mock-data.ts`) presented as if they were Real_Data.
- **Design_System**: The shared visual language of the Web_App — Tailwind utility classes,
  shadcn/ui components, glass-card surfaces, button variants, spacing scale, and typography
  scale — defined against the theme tokens.
- **Theme_Token**: A named HSL design variable defined in `src/index.css` (for example
  `--background`, `--foreground`, `--primary`, `--card`) consumed through Tailwind semantic
  utility classes.
- **Hardcoded_Color**: Any color value expressed directly in markup or styles (hex, rgb, hsl
  literal, or a fixed Tailwind palette class such as `text-red-500`) rather than through a
  Theme_Token.
- **Theme_Mode**: The active visual mode of the Web_App, either light ("Ultra Clean Light
  Tactical") or dark ("Deep Space Dark Premium"), controlled by next-themes.
- **Glass_Card**: The standard glassmorphic surface component of the Design_System used to
  group content on a Page.
- **Button_Variant**: One of the defined shadcn/ui button styles (for example default,
  secondary, destructive, outline, ghost, link) applied consistently to convey action intent.
- **Responsive_Breakpoint**: A Tailwind viewport breakpoint (for example `sm`, `md`, `lg`,
  `xl`) at which the Web_App adjusts layout.
- **Accessible_Name**: The programmatically determinable label of an Interactive_Control,
  derived from its visible text, `aria-label`, or associated `<label>`.
- **Verification_Suite**: The combined set of frontend checks — production build, TypeScript
  type-check, ESLint lint, the audit pipeline, Vitest component tests, and Playwright
  end-to-end tests — used to validate the Web_App.
- **Live_Test_Tenant**: The legacy fixed tenant `tnt-3rlhko`, retained for Backend_API
  regression checks against the live production environment, while frontend verification
  provisions fresh Synthetic_Organizations instead of relying on this accumulated tenant.
- **Live_Environment**: The live VPS production deployment of the Zenvix platform (the Web_App
  web client plus the Backend_API) that the Verification_Suite targets, reached at the deployed
  web URL; changes reach it via git push to `main` followed by a Docker rebuild.
- **Synthetic_Organization**: A freshly provisioned end-to-end test fixture created on the
  Live_Environment for a verification run — a new tenant with its company, branch/location, an
  owner/admin user (and any role-specific users needed), and the module activations required by
  the phase under test — used to simulate a brand-new real customer.

## Requirements

### Requirement 1: Route and Page Render Reliability

**User Story:** As a user of the platform, I want every page to load and display without
breaking, so that I can use any screen the navigation offers me.

#### Acceptance Criteria

1. WHEN a user opens a defined Route, THE Web_App SHALL render the corresponding Page to a
   visible, interactive state and SHALL NOT emit an uncaught JavaScript runtime error during
   render.
2. WHEN a Page renders, THE Web_App SHALL present one of the defined Async_State presentations
   for that Page — populated content, an Empty_State, a Loading_Indicator, or an Error_State —
   rather than a blank screen or a bare error stack.
3. IF a Page encounters a render-time error, THEN THE Web_App SHALL display an error boundary
   surface that identifies that the Page failed, SHALL provide a recovery control that retries
   the render or returns the user to a defined Route, and SHALL keep the surrounding Layout and
   Navigation_Control elements operable.
4. WHEN a user navigates to an undefined Route, THE Web_App SHALL render the NotFound Page
   without an uncaught runtime error and SHALL provide a control that returns the user to the
   authenticated landing Route, or to the login Route when the user is unauthenticated.
5. WHEN a user is unauthenticated and opens a guarded Route, THE Web_App SHALL redirect the
   user to the login Route without rendering guarded Page content.
6. WHEN a user is authenticated without an active session and opens a guarded Route, THE
   Web_App SHALL redirect the user to the onboarding Route without rendering guarded Page
   content.
7. WHEN the production build runs, THE Web_App SHALL produce production assets with zero
   TypeScript type errors and zero ESLint errors.

### Requirement 2: Navigation Reachability

**User Story:** As a user, I want every page to be reachable through the app's navigation, so
that I never encounter a screen with no way in or out.

#### Acceptance Criteria

1. WHEN a user activates a Navigation_Control, THE Web_App SHALL change the active Route to the
   destination the Navigation_Control names and render that destination Page's primary content
   region within 1 second under nominal network conditions.
2. THE Web_App SHALL expose every Page that is intended for end-user access through at least one
   Navigation_Control that is reachable from within its Layout in no more than 3
   Navigation_Control activations starting from the authenticated landing Route.
3. WHEN a Page is displayed, THE Web_App SHALL render the Navigation_Control that targets the
   active Route in a visually distinct active state that differs from the inactive
   Navigation_Controls in its set, so that the user can identify the current location.
4. WHEN a user follows an in-app link that targets a defined Route, THE Web_App SHALL navigate
   without a full page reload.
5. IF a Navigation_Control targets a Route that requires a module to be active and that module
   is inactive for the tenant, THEN THE Web_App SHALL present that Navigation_Control in a
   visibly disabled or unavailable state and SHALL NOT change the active Route to that
   destination.
6. IF a user activates a Navigation_Control and navigation to its named Route does not complete,
   THEN THE Web_App SHALL keep the current Route and its Page operable and SHALL present an
   indication that the navigation did not complete.

### Requirement 3: Interactive Control Functionality and Feedback

**User Story:** As a user, I want buttons, forms, dialogs, tables, and filters to actually do
something and tell me what happened, so that I can complete tasks with confidence.

#### Acceptance Criteria

1. WHEN a user activates an Interactive_Control that has a defined action, THE Web_App SHALL
   invoke that action within 200 milliseconds of the activation.
2. WHEN a user activates an Interactive_Control that triggers a Backend_API request, THE Web_App
   SHALL present a Loading_Indicator for that control or its affected region within 300
   milliseconds of the activation if the request has not yet settled, and SHALL remove that
   Loading_Indicator within 200 milliseconds after the request settles.
3. WHEN a Backend_API request initiated by an Interactive_Control completes successfully, THE
   Web_App SHALL, within 500 milliseconds of the response, present a Feedback_Message or an
   updated view that reflects the result.
4. IF a Backend_API request initiated by an Interactive_Control fails, THEN THE Web_App SHALL,
   within 500 milliseconds of the failure, present a Feedback_Message that states that the
   action did not complete, SHALL re-enable that Interactive_Control, and SHALL preserve any
   user-entered input associated with the action so that the user can retry without re-entering
   data.
5. WHILE a Backend_API request initiated by an Interactive_Control is in flight, THE Web_App
   SHALL disable that control so that the user cannot submit the same action twice
   concurrently, and SHALL re-enable that control within 200 milliseconds after the request
   settles.
6. WHEN a user opens a Dialog through its trigger, THE Web_App SHALL render the Dialog content
   and move keyboard focus into the Dialog, and WHEN the user dismisses the Dialog, THE Web_App
   SHALL remove the Dialog content and return focus to the triggering Interactive_Control.
7. WHEN a user submits a Form whose inputs satisfy its validation rules, THE Web_App SHALL
   submit the Form's data to its action and reflect the outcome through the behavior defined in
   criteria 2 through 4.
8. IF a user submits a Form with one or more inputs that violate its validation rules, THEN THE
   Web_App SHALL display a validation message for each violating input, SHALL move focus to the
   first violating input, and SHALL NOT submit the Form.
9. WHEN a user operates a table control (sort, paginate, or row action) or a filter, THE
   Web_App SHALL apply the corresponding change to the displayed data set within 500
   milliseconds for a change resolved on the client, or, WHERE the change requires a
   Backend_API request, SHALL present the Loading_Indicator and feedback defined in criteria 2
   through 4.
10. THE Web_App SHALL NOT present an Interactive_Control whose activation produces no effect and
    no Feedback_Message.

### Requirement 4: Async Data State Handling

**User Story:** As a user, I want screens to clearly show whether data is loading, empty, or
failed, so that I am never left staring at a blank or frozen view.

#### Acceptance Criteria

1. WHILE a data-driven view is awaiting its initial Backend_API response, THE Web_App SHALL
   present a Loading_Indicator for that view within 1 second of the request starting and SHALL
   keep that Loading_Indicator visible until the request reaches a terminal state.
2. WHEN a data-driven view's Backend_API request completes successfully with one or more
   records, THE Web_App SHALL render those records and remove the Loading_Indicator.
3. WHEN a data-driven view's Backend_API request completes successfully with zero records, THE
   Web_App SHALL display an Empty_State that explains that no records exist rather than an empty
   container or a perpetual Loading_Indicator.
4. IF a data-driven view's Backend_API request fails, THEN THE Web_App SHALL display an
   Error_State that states the data could not be loaded and offers a retry control.
5. THE Web_App SHALL distinguish the Empty_State from the Error_State through distinct
   explanatory text, where the Error_State presents a retry control and the Empty_State does
   not, so that absence of data and failure to load data are not presented identically.
6. IF a data-driven view's initial Backend_API request does not settle within 30 seconds, THEN
   THE Web_App SHALL present the Error_State with a retry control.
7. WHEN a user activates the Error_State retry control, THE Web_App SHALL re-initiate the
   request and present the Loading_Indicator again.

### Requirement 5: Real Data Binding

**User Story:** As a user, I want every production screen to show my real data, so that I can
trust what the application displays.

#### Acceptance Criteria

1. WHEN a Page in a production build displays domain data, THE Web_App SHALL source that data
   from the Backend_API within the authenticated tenant scope.
2. THE Web_App SHALL NOT present Placeholder_Data as Real_Data on any Page in a production
   build.
3. WHEN the Web_App binds a Backend_API response field to a display element, THE Web_App SHALL
   map the field by its Backend_Contract name so that the displayed value corresponds to the
   intended field.
4. IF a Backend_API response omits an optional field that a view displays, THEN THE Web_App
   SHALL render a defined, non-empty visible fallback indicator for that field rather than
   rendering `undefined`, `null`, `NaN`, or an empty string as text.
5. WHEN the Web_App formats a value for display, THE Web_App SHALL render currency with a
   currency symbol or currency code and digit grouping, SHALL render numbers with digit
   grouping and consistent precision, and SHALL render dates in a consistent, locale-appropriate
   format.

### Requirement 6: Frontend and Backend Contract Alignment

**User Story:** As a user, I want the buttons and statuses I see to match what the backend
actually does, so that controls are enabled at the right time and statuses read correctly.

#### Acceptance Criteria

1. WHEN the Web_App gates an Interactive_Control on a Backend_API status or enumerated value,
   THE Web_App SHALL enable that Interactive_Control only when the received value equals the
   value defined by the current Backend_Contract, and SHALL otherwise disable that
   Interactive_Control.
2. WHEN the Web_App reads the payment create lifecycle state to gate the payment approval
   control, THE Web_App SHALL enable the approval control when the payment's create lifecycle
   state equals `REQUEST_CREATED` and SHALL disable the approval control otherwise.
3. THE Web_App SHALL NOT gate any Interactive_Control on a Backend_Contract enumerated value the
   Backend_API no longer produces, for example the obsolete payment state `APPROVAL_PENDING`.
4. WHEN the Web_App displays a status label sourced from the Backend_API, THE Web_App SHALL
   render a label that corresponds to the current Backend_Contract value.
5. THE Web_App SHALL send request payloads to the Backend_API using the field names and value
   formats defined by the current Backend_Contract.
6. IF the Backend_API returns an enumerated value the current Backend_Contract does not define,
   THEN THE Web_App SHALL render a defined fallback label, SHALL NOT render the raw, undefined,
   or null value as a status, and SHALL NOT enable a control gated on that value.

### Requirement 7: Visual Uniformity Through the Design System

**User Story:** As a user, I want the interface to look consistent everywhere, so that the
product feels like one coherent, polished application.

#### Acceptance Criteria

1. WHEN the Web_App applies a color to text, background, border, or surface, THE Web_App SHALL
   derive that color from a Theme_Token rather than a Hardcoded_Color.
2. WHEN a Page groups content into a card surface, THE Web_App SHALL use the Glass_Card
   component of the Design_System so that card surfaces are uniform across Pages.
3. WHEN the Web_App presents an action button, THE Web_App SHALL apply the Button_Variant whose
   defined meaning matches the action's intent, so that equivalent actions share a variant
   across Pages.
4. THE Web_App SHALL apply spacing and typography from the Design_System scale so that headings,
   body text, and spacing are consistent across Pages within a Page_Group.
5. WHEN the Web_App renders the same category of element on different Pages, THE Web_App SHALL
   render it with consistent Design_System styling.
6. THE Web_App SHALL render icons from the shared lucide-react icon set rather than mixing icon
   sources for equivalent affordances.

### Requirement 8: Theme Mode Correctness

**User Story:** As a user, I want both light and dark modes to look right, so that I can use the
app comfortably in either theme.

#### Acceptance Criteria

1. WHILE the Web_App is in light Theme_Mode, THE Web_App SHALL render every Page using the light
   Theme_Token values with text and background combinations that remain legible.
2. WHILE the Web_App is in dark Theme_Mode, THE Web_App SHALL render every Page using the dark
   Theme_Token values with text and background combinations that remain legible.
3. WHEN a user switches Theme_Mode, THE Web_App SHALL re-render the current Page in the selected
   Theme_Mode without requiring a page reload.
4. IF an element uses a Hardcoded_Color, THEN THE Web_App SHALL be corrected to use a
   Theme_Token so that the element responds to Theme_Mode changes.
5. THE Web_App SHALL maintain a text-to-background contrast ratio of at least 4.5:1 for normal
   body text in both Theme_Modes.

### Requirement 9: Responsive Layout Correctness

**User Story:** As a user on different screen sizes, I want layouts to adapt cleanly, so that
content stays usable and nothing overflows or overlaps.

#### Acceptance Criteria

1. WHEN the Web_App is viewed at or above the `lg` Responsive_Breakpoint, THE Web_App SHALL
   render each Page without content overflowing its container horizontally.
2. WHEN the Web_App is viewed below the `md` Responsive_Breakpoint, THE Web_App SHALL adapt each
   Page's layout so that primary content and primary actions remain reachable without
   horizontal scrolling of the page body.
3. WHILE the Web_App is viewed below the `md` Responsive_Breakpoint, THE Web_App SHALL present
   the Layout navigation in a form that can be opened and closed without obscuring primary
   content permanently.
4. THE Web_App SHALL NOT render overlapping or clipped Interactive_Control elements that prevent
   a user from activating them at any supported Responsive_Breakpoint.

### Requirement 10: Accessibility Basics

**User Story:** As a user who relies on labels, focus, and keyboard navigation, I want controls
to be properly labeled and operable, so that I can use the application without a mouse.

#### Acceptance Criteria

1. THE Web_App SHALL provide an Accessible_Name for every Interactive_Control.
2. WHEN a user navigates the Web_App with the keyboard, THE Web_App SHALL move focus through
   Interactive_Control elements in a logical order and SHALL render a visible focus indicator on
   the focused element.
3. WHEN a user activates an Interactive_Control using the keyboard, THE Web_App SHALL invoke the
   same action that pointer activation invokes.
4. WHEN a Dialog is open, THE Web_App SHALL place keyboard focus within the Dialog and SHALL
   return focus to the triggering control when the Dialog closes.
5. WHEN the Web_App renders a form input, THE Web_App SHALL associate a label with that input so
   that the input's purpose is programmatically determinable.

### Requirement 11: Verification Suite

**User Story:** As an engineer stabilizing the frontend, I want a repeatable verification suite,
so that each phase's correctness is proven and regressions are caught before deploy.

#### Acceptance Criteria

1. THE Verification_Suite SHALL include a production build, a TypeScript type-check, and an
   ESLint lint that all complete with zero errors.
2. THE Verification_Suite SHALL include Vitest component tests that exercise the Interactive_Control
   behavior and Async_State handling of the Pages in the phase under verification.
3. THE Verification_Suite SHALL run against the Live_Environment, the live VPS deployment of the
   Web_App and Backend_API, rather than against a local development server.
4. WHEN the Verification_Suite begins verifying a phase, THE Verification_Suite SHALL provision a
   fresh Synthetic_Organization — a new tenant with its company, branch/location, the required
   users, and the module activations the phase under verification needs — on the Live_Environment
   so that the run reflects a brand-new real customer.
5. WHEN the Verification_Suite verifies authentication and onboarding, THE Verification_Suite SHALL
   drive the actual sign-up and onboarding flow that creates the Synthetic_Organization rather
   than reusing pre-seeded credentials, WHERE the flow supports self-service creation.
6. WHERE bootstrapping a Synthetic_Organization requires a privileged or seed step the
   self-service flow does not expose, THE Verification_Suite SHALL perform that bootstrap step
   explicitly and SHALL document the step performed.
7. THE Verification_Suite SHALL include Playwright end-to-end tests that authenticate as a
   Synthetic_Organization user, load each Page in the phase under verification, exercise each Page
   with that Synthetic_Organization's Real_Data, and assert that the Page renders without an
   uncaught runtime error.
8. THE Verification_Suite SHALL keep each Synthetic_Organization's data isolated to that
   organization so that no cross-tenant interference occurs, and SHOULD label or namespace
   synthetic records so that the records are identifiable and cleanable.
9. WHEN the Verification_Suite performs Backend_API regression checks against the live production
   environment, THE Verification_Suite SHALL use the Live_Test_Tenant for that regression
   authentication and data.
10. IF any check in the Verification_Suite fails for the phase under verification, THEN the phase
    SHALL be treated as incomplete until the failure is resolved.

### Requirement 12: Auth and Onboarding Page Group Stabilization (Phase 1)

**User Story:** As a new or returning user, I want login, registration, onboarding, and password
recovery to work and look right, so that I can get into the application reliably.

#### Acceptance Criteria

1. WHEN a user opens the login, registration, or onboarding Route while unauthenticated, THE
   Web_App SHALL render the corresponding Page without an uncaught runtime error.
2. WHEN a user submits the login Form with valid credentials, THE Web_App SHALL authenticate the
   user against the Backend_API and navigate to the authenticated landing Route.
3. IF a user submits the login or registration Form with invalid or incomplete input, THEN THE
   Web_App SHALL display a validation or Error_State message and SHALL NOT navigate away from
   the Form.
4. WHEN a user opens the forgot-password Dialog and submits a recovery request, THE Web_App
   SHALL invoke the Backend_API recovery action and present a Feedback_Message describing the
   outcome.
5. WHEN a user completes the onboarding flow on the Live_Environment, THE Web_App SHALL provision
   a usable Synthetic_Organization comprising a tenant, its company, and its branch/location that
   subsequent phases reuse for verification.
6. WHEN a user completes the onboarding flow, THE Web_App SHALL place the newly onboarded user in
   an authenticated, operational state at the authenticated landing Route.
7. THE Web_App SHALL satisfy Requirements 1 through 11 for every Page in the Auth Page_Group in
   both Theme_Modes.

### Requirement 13: Core Page Group Stabilization (Phase 2)

**User Story:** As an operator, I want the Core department screens — dashboard, IT, procurement,
sales, marketing, payment, finance, HR, inventory, settings, and the rest — to work and display
correctly, so that I can run daily operations.

#### Acceptance Criteria

1. WHEN a user opens any Route in the Core Page_Group, THE Web_App SHALL render the corresponding
   Page through CoreLayout without an uncaught runtime error.
2. WHEN a Core Page displays domain data, THE Web_App SHALL bind Real_Data from the Backend_API
   within the authenticated tenant scope and SHALL NOT present Placeholder_Data.
3. WHEN a user views the payment execution screen and a payment is in the create lifecycle state
   `REQUEST_CREATED`, THE Web_App SHALL enable the approval control for that payment.
4. IF a Core Page's Backend_API request returns zero records, THEN THE Web_App SHALL display an
   Empty_State for that view rather than a perpetual Loading_Indicator.
5. THE Web_App SHALL satisfy Requirements 1 through 11 for every Page in the Core Page_Group in
   both Theme_Modes.

### Requirement 14: Retail Page Group Stabilization (Phase 3)

**User Story:** As a retail operator, I want the retail workspace, POS, and management screens to
work and display correctly, so that store operations run without breakage.

#### Acceptance Criteria

1. WHEN a user opens any Route in the Retail Page_Group, THE Web_App SHALL render the corresponding
   Page through its Layout without an uncaught runtime error.
2. WHEN a user performs a point-of-sale action through an Interactive_Control, THE Web_App SHALL
   present a Loading_Indicator while the Backend_API request is in flight and a Feedback_Message
   on completion.
3. WHEN a Retail Page displays domain data, THE Web_App SHALL bind Real_Data from the Backend_API
   within the authenticated tenant scope and SHALL NOT present Placeholder_Data.
4. IF a Retail Page's Backend_API request fails, THEN THE Web_App SHALL display an Error_State with
   a retry control.
5. THE Web_App SHALL satisfy Requirements 1 through 11 for every Page in the Retail Page_Group in
   both Theme_Modes.

### Requirement 15: F&B Page Group Stabilization (Phase 4)

**User Story:** As a food-and-beverage operator, I want the cashier, kitchen, tables, inventory,
history, and settings screens to work and display correctly, so that service runs smoothly.

#### Acceptance Criteria

1. WHEN a user opens any Route in the F&B Page_Group, THE Web_App SHALL render the corresponding
   Page through its Layout without an uncaught runtime error.
2. WHEN a user performs a cashier, kitchen, or table-management action through an
   Interactive_Control, THE Web_App SHALL invoke the action and present a Feedback_Message on
   completion.
3. WHEN an F&B Page displays domain data, THE Web_App SHALL bind Real_Data from the Backend_API
   within the authenticated tenant scope and SHALL NOT present Placeholder_Data.
4. IF an F&B Page's Backend_API request returns zero records, THEN THE Web_App SHALL display an
   Empty_State for that view.
5. THE Web_App SHALL satisfy Requirements 1 through 11 for every Page in the F&B Page_Group in
   both Theme_Modes.

### Requirement 16: Industry Page Group Stabilization (Phase 5)

**User Story:** As a clinic or farming operator, I want the industry module screens to work and
display correctly, so that I can run industry-specific workflows.

#### Acceptance Criteria

1. WHEN a user opens any Route in the Industry Page_Group (Clinic or Farming), THE Web_App SHALL
   render the corresponding Page through its Layout without an uncaught runtime error.
2. WHEN an Industry Page displays domain data, THE Web_App SHALL bind Real_Data from the
   Backend_API within the authenticated tenant scope and SHALL NOT present Placeholder_Data.
3. WHEN a user performs an industry-specific action through an Interactive_Control, THE Web_App
   SHALL invoke the action and present a Feedback_Message on completion.
4. IF an Industry module is inactive for the tenant, THEN THE Web_App SHALL convey the unavailable
   state rather than rendering a broken Page.
5. THE Web_App SHALL satisfy Requirements 1 through 11 for every Page in the Industry Page_Group
   in both Theme_Modes.

### Requirement 17: Portal Page Group Stabilization (Phase 6)

**User Story:** As an end user of the self-service portal, I want the portal screens to work and
display correctly, so that I can access my information without breakage.

#### Acceptance Criteria

1. WHEN a user opens any Route in the Portal Page_Group, THE Web_App SHALL render the corresponding
   Page through its Layout without an uncaught runtime error.
2. WHEN a Portal Page displays domain data, THE Web_App SHALL bind Real_Data from the Backend_API
   within the authenticated tenant scope and SHALL NOT present Placeholder_Data.
3. IF a Portal Page's Backend_API request fails, THEN THE Web_App SHALL display an Error_State with
   a retry control.
4. WHEN a user performs a portal action through an Interactive_Control, THE Web_App SHALL present
   a Loading_Indicator while the Backend_API request is in flight and a Feedback_Message on
   completion.
5. THE Web_App SHALL satisfy Requirements 1 through 11 for every Page in the Portal Page_Group in
   both Theme_Modes.
