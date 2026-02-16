// ============================================================================
// APP ENTRY ROUTER (PHASE 3)
// ============================================================================
//
// Rules:
// - App.tsx contains ZERO module logic
// - Routes come ONLY from runtime builders
// - No mock module instances
// - No hardcoded module pages
//
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import { AppProvider } from "@/contexts/AppContext";
import { CoreLayout } from "@/layouts/CoreLayout";
import { ModuleLayout } from "@/layouts/ModuleLayout";
import { buildCoreRoutes } from "@/core/runtime/coreRoutes";
import { buildModuleRoutes } from "@/core/runtime/moduleRoutes";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<Navigate to="/core/dashboard" replace />} />

          {/* Core (Administrative Backbone) */}
          <Route path="/core/*" element={<CoreLayout />}>
            {buildCoreRoutes()}
          </Route>

          {/* Industry Modules (Contract-Driven) */}
          <Route path="/m/:moduleId/*" element={<ModuleLayout />}>
            {buildModuleRoutes()}
          </Route>

          {/* Enforcement */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
