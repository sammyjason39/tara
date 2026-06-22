/**
 * Security Module Layout Test
 *
 * Task 15.1 — full-module-production-audit spec
 * **Validates: Requirements 15.1, 15.2, 15.3, 15.4**
 *
 * Verifies that rendering the Security page within CoreLayout produces
 * exactly one <main> landmark element in the DOM (no duplicates).
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — minimal stubs for dependencies
// ---------------------------------------------------------------------------

const mockSession = {
  tenant_id: "test-tenant",
  location_id: "loc-1",
  user_id: "test-user",
  role: "admin",
  first_name: "Test",
  last_name: "User",
  permissions: ["core.security.access"],
};

vi.mock("@/core/security/session", () => ({
  useSession: () => mockSession,
}));

vi.mock("@/contexts/AppContext", () => ({
  useApp: () => ({
    state: {
      currentUser: { name: "Test User", role: "admin" },
      settings: { businessName: "TestCo", theme: "light", activatedModuleIds: [] },
    },
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => ({ unreadCounts: { notifications: 0, chat: 0, mail: 0 } }),
}));

vi.mock("@/core/runtime/moduleRegistry", () => ({
  getAllModuleContracts: () => [],
}));

vi.mock("@/components/shared/NotificationCenter", () => ({
  NotificationCenter: () => React.createElement("div", { "data-testid": "notification-center" }),
}));

vi.mock("@/components/shared/OfflineIndicator", () => ({
  OfflineIndicator: () => null,
}));

vi.mock("@/components/shared/PageErrorBoundary", () => ({
  PageErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/core/ui/JVWorkspaceSwitcher", () => ({
  JVWorkspaceSwitcher: () => React.createElement("div", { "data-testid": "workspace-switcher" }),
}));

vi.mock("@/core/services/adminService", () => ({
  adminService: {
    getSecurityRoles: vi.fn().mockResolvedValue({ roles: [], totalUsers: 0, privilegedUsers: 0 }),
    createRequest: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/core/services/auditService", () => ({
  auditService: {
    getLogs: vi.fn().mockResolvedValue([]),
    verifyChain: vi.fn().mockResolvedValue({ valid: true, checkedRecords: 0 }),
    repairChain: vi.fn().mockResolvedValue({ success: true, repairedCount: 0 }),
  },
}));

vi.mock("@/core/services/it/itService", () => ({
  itService: {
    getSystemHealth: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/core/services/reportingService", () => ({
  reportingService: {
    generateReport: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/core/ui/RequestModal", () => ({
  RequestModal: () => null,
}));

vi.mock("@/core/ui/SidebarIdentityCard", () => ({
  SidebarIdentityCard: () => React.createElement("div", { "data-testid": "sidebar-identity" }),
}));

vi.mock("@/components/shared/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

// ---------------------------------------------------------------------------
// Import components under test
// ---------------------------------------------------------------------------

import { CoreLayout } from "@/layouts/CoreLayout";
import CoreSecurity from "@/pages/core/Security";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Security Module — single <main> landmark", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders exactly one <main> element when Security page is displayed within CoreLayout", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/core/security"]}>
        <Routes>
          <Route path="/core" element={<CoreLayout />}>
            <Route path="security" element={<CoreSecurity />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const mainElements = container.querySelectorAll("main");
    expect(mainElements).toHaveLength(1);
  });

  test("Security page does not render nested <main> elements inside CoreLayout's <main>", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/core/security"]}>
        <Routes>
          <Route path="/core" element={<CoreLayout />}>
            <Route path="security" element={<CoreSecurity />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // CoreLayout provides exactly one <main>
    const mainElements = container.querySelectorAll("main");
    expect(mainElements).toHaveLength(1);

    // The <main> content area should not contain a nested <main>
    const mainEl = mainElements[0];
    const nestedMains = mainEl.querySelectorAll("main");
    expect(nestedMains).toHaveLength(0);
  });
});
