// ============================================================================
// MODULE ROUTE BUILDER (PHASE 3)
// ============================================================================
//
// Purpose:
// - Build runtime module routes from Module Contracts
// - No hardcoded module routing in App.tsx
// - Modules own their pages + components
//
// This is the enforcement layer:
//
//   ModuleContract.getPages()
//        ↓
//     <Route> generation
//
// ============================================================================

import { Route } from "react-router-dom";
import { getAllModuleContracts } from "./moduleRegistry";
import { DeviceAwareGuard } from "./DeviceAwareGuard";
import { RetailRootLayout } from "@/pages/retail/layout/RetailRootLayout";

/**
 * Build all module routes.
 *
 * RULES:
 * - Derived ONLY from registered modules
 * - Uses ModulePageDefinition.component
 * - No manual routes allowed
 * - [HARD LOCK] Wrapped in DeviceAwareGuard for hardware-level security
 */
export function buildModuleRoutes(): JSX.Element[] {
  const contracts = getAllModuleContracts();

  const allRoutes: JSX.Element[] = [];

  for (const module of contracts) {
    const pages = module.getPages(module.getDefaultConfig());
    const moduleRoutes: JSX.Element[] = [];

    for (const page of pages) {
      const Component = page.component;

      moduleRoutes.push(
        <Route
          key={`${module.id}:${page.id}`}
          path={page.route.replace(`/m/${module.id}/`, "")}
          element={
            <DeviceAwareGuard 
              supportedDevices={page.supportedDeviceTypes} 
              moduleName={module.id}
            >
              <Component />
            </DeviceAwareGuard>
          }
        />,
      );
    }

    // Special Case: Retail Module uses a Dual-Navigation Shell (Management + Operational)
    if (module.id === "retail") {
      allRoutes.push(
        <Route key="retail-root" element={<RetailRootLayout />}>
          {moduleRoutes}
        </Route>
      );
    } else {
      allRoutes.push(...moduleRoutes);
    }
  }

  return allRoutes;
}
