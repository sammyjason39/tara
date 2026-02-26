# OpsCore — Modular Business Operations Platform

OpsCore is a **multi-tenant, modular, local-first business operations platform** designed to support multiple industries through **industry-specific modules** running on a shared, secure core.

The platform is architected to scale from small single-location businesses to multi-branch enterprises, while remaining configurable without hardcoded UI or business logic.

This repository represents **Version 1 (V1)** of OpsCore, focused on establishing a **production-grade foundation** and two initial industry modules: **Cafe** and **Retail**.

---

## 🎯 Core Vision

OpsCore is built around three non-negotiable principles:

1. **Core First** — Identity, licensing, configuration, and data safety are enforced centrally.
2. **Modules, Not Apps** — Industries are implemented as isolated modules, not standalone systems.
3. **Configuration Over Code** — Tenant-specific behavior is driven by configuration, not JSX or hardcoded logic.

Future industries (Healthcare, Manufacturing, Security, etc.) will be added **only after the core and existing modules are production-stable**.

---

## 🧱 Platform Architecture Overview

OpsCore is structured into **three architectural layers**:

### 1. Core Layer (System Foundation)

The Core layer is mandatory and always active. It is responsible for **safety, isolation, and orchestration**.

Responsibilities:

- Tenant identity & session management
- Role and permission enforcement
- Module licensing & access control
- Cross-module services and aggregation
- Configuration engine (tenant + module)
- Reporting and analytics aggregation

The Core **does not contain industry logic**.

---

### 2. Platform Layer (Runtime Control)

The Platform layer determines **how the application behaves at runtime**.

Responsibilities:

- Device detection (desktop, tablet, kiosk, shared screen)
- Runtime UI resolution (role + device + license)
- Dynamic routing and layout resolution

This layer ensures that **static routing and hardcoded layouts are avoided**.

---

### 3. Module Layer (Industry Logic)

Modules encapsulate **industry-specific operations, roles, and workflows**.

Each module:

- Defines its own roles and permissions
- Registers routes, pages, and configuration schema
- Emits standardized output events to the Core
- Cannot directly access other modules

Modules are enabled or disabled per tenant through licensing.

---

## 📦 Current Modules (V1 Scope)

### Cafe Module

Designed for cafe and restaurant operations.

Core roles:

- Waiter
- Kitchen
- Bar
- Cashier

Capabilities:

- Table-based ordering
- Kitchen Display System (KDS)
- Counter and table billing
- Cafe-specific inventory

---

### Retail Module

Designed for retail store operations.

Core roles:

- Cashier
- Supervisor
- Stock / Inventory Staff

Capabilities:

- Barcode-based checkout
- Shift management
- Cash drawer reconciliation
- Retail inventory workflows

---

## 🧠 Core System (Admin & Management)

The Core System is the **control plane** for OpsCore.

It is not an industry module. Instead, it manages:

- Tenant configuration
- User & role management
- Module licensing
- Cross-module reporting
- System-wide settings

The Core System aggregates data **from modules**, never the other way around.

---

## 🔗 Cross-Module Integration Model

Modules communicate with the Core through **standardized output events**.

| Core Capability       | Source Modules                                   |
| --------------------- | ------------------------------------------------ |
| Reports & Analytics   | Cafe, Retail (future: Healthcare, Manufacturing) |
| Inventory Aggregation | Retail, Cafe                                     |
| Finance & Accounting  | Sales & payroll events                           |
| Security & Audit      | All modules                                      |

Direct module-to-module communication is **not allowed**.

---

## 🛠 Technology Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **State Management:** Localized Context + Reducers (global state minimized)
- **Persistence:** Local Storage (tenant-scoped, offline-first)
- **Charts & Visualization:** Recharts
- **Routing:** React Router v6 (runtime-resolved)
- **Icons:** Lucide React

---

## 📁 Project Structure (Target Architecture)

```text
src/
├── core/                # Mandatory system foundation
│   ├── identity/        # Tenant, session, user context
│   ├── licensing/       # Module access enforcement
│   ├── services/        # Cross-module orchestration
│   ├── config/          # Configuration engine
│   └── types/           # Contracts & events
│
├── platform/            # Runtime behavior
│   ├── device-detection/
│   ├── runtime-ui/
│   └── routing/
│
├── modules/             # Industry modules
│   ├── cafe/
│   │   ├── index.ts
│   │   ├── roles.ts
│   │   ├── config.ts
│   │   └── components/
│   ├── retail/
│   │   ├── index.ts
│   │   ├── roles.ts
│   │   └── components/
│   └── shared/
│       └── contract.ts  # Locked module contracts
│
├── pages/               # Thin, declarative pages
│   ├── core/
│   ├── cafe/
│   └── retail/
│
├── layouts/
│   ├── CoreLayout.tsx
│   └── ModuleLayout.tsx
└── lib/                 # Utilities & local persistence
```

---

## 🚀 Getting Started

```text
bash
Copy code
npm install
npm run dev
npm run build
```

---

## 🚀 Deployment (GitHub & Render)

This project is configured for automated deployment using **Render Blueprints**.

### 1. GitHub Preparation

1. Create a new repository on GitHub.
2. Ensure `.env` is ignored (already in `.gitignore`).
3. Use the `.env.example` (root) and `backend/.env.example` as templates for your production settings.
4. Push the code to your repository.

### 2. Render Deployment

1. Connect your GitHub account to [Render](https://render.com).
2. Create a new **Blueprint Instance**.
3. Select this repository. Render will automatically detect `render.yaml`.
4. Render will provision:
   - **Backend (Web Service)**: Running on NestJS.
   - **Frontend (Static Site)**: Running the Vite build.

### 3. Required Environment Variables

After the first build (which may fail due to missing vars), set these in the Render Dashboard:

**Backend Service:**

- `ALLOWED_ORIGINS`: Your Render frontend URL (e.g., `https://zenvix-frontend.onrender.com`).
- `JWT_SECRET`: A secure random string for signing tokens.

**Frontend Service:**

- `VITE_API_URL`: Your Render backend URL (e.g., `https://zenvix-backend.onrender.com`).

---

### 👥 Demo Accounts (Development Only)

Email | Password | Scope

```text
admin@opscore.com admin123 Core System (Admin)
manager@opscore.com manager123 Core System (Manager)
retail@opscore.com retail123 Retail Module (Cashier)
retail.manager@opscore.com retail123 Retail Module (Manager)
cafe@opscore.com cafe123 Cafe Module (Staff)
cafe.manager@opscore.com cafe123 Cafe Module (Manager)
```

---

### 🧭 Future Modules (Planned, Not Implemented)

The following modules are planned but intentionally excluded from V1:

- **Healthcare** — Clinics, patient flow, medical inventory
- **Manufacturing** — Production lines, BOM, quality control
- **Security** — Surveillance, access control, incident response

These modules will be developed one by one after:

- **Core stability**
- **Configuration engine completion**
- **Cafe & Retail modules reach production maturity**

---

### 📝 License

This project is currently provided for demonstration and architectural reference purposes.

---
