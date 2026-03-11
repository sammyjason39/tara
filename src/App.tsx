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
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Onboarding from "./pages/auth/Onboarding";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { BarcodeScannerProvider } from "@/contexts/BarcodeScannerContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CoreLayout } from "@/layouts/CoreLayout";
import { ModuleLayout } from "@/layouts/ModuleLayout";
import { buildCoreRoutes } from "@/core/runtime/coreRoutes";
import { buildModuleRoutes } from "@/core/runtime/moduleRoutes";

function AppRoutes() {
  const { isAuthenticated, isLoading, user, session } = useAuth();
  console.log("[AppRoutes] State:", {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    hasSession: !!session,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading Zenvix Environment...
      </div>
    );
  }

  // Guard routing logic
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/core/dashboard" replace />} />

      {/* Auth Routes */}
      <Route
        path="/auth/login"
        element={
          !isAuthenticated ? (
            <Login />
          ) : (
            <Navigate to="/core/dashboard" replace />
          )
        }
      />
      <Route
        path="/auth/register"
        element={
          !isAuthenticated ? (
            <Register />
          ) : (
            <Navigate to="/core/dashboard" replace />
          )
        }
      />

      {/* Onboarding Wizard (Authenticated, but without an active Company/Tenant) */}
      <Route
        path="/auth/onboarding"
        element={
          isAuthenticated && !session ? (
            <Onboarding />
          ) : (
            <Navigate to="/core/dashboard" replace />
          )
        }
      />

      {/* Guarded Core */}
      <Route
        path="/core/*"
        element={
          isAuthenticated ? (
            session ? (
              <CoreLayout />
            ) : (
              <Navigate to="/auth/onboarding" replace />
            )
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      >
        {buildCoreRoutes()}
      </Route>

      {/* Guarded Modules */}
      <Route
        path="/m/:moduleId/*"
        element={
          isAuthenticated ? (
            session ? (
              <ModuleLayout />
            ) : (
              <Navigate to="/auth/onboarding" replace />
            )
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      >
        {buildModuleRoutes()}
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <BarcodeScannerProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </BarcodeScannerProvider>
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}
