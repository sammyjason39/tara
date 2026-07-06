import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { BrandingProvider, useBranding } from "@/contexts/BrandingContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/lib/useIsMobile";

// Layouts
import { WebLayout } from "@/layouts/WebLayout";
import { MobileLayout } from "@/layouts/MobileLayout";

// Auth
import { LoginPage } from "@/pages/auth/LoginPage";

// Web pages
import { DashboardPage } from "@/pages/web/DashboardPage";
import { EmployeesPage } from "@/pages/web/EmployeesPage";
import { AttendancePage } from "@/pages/web/AttendancePage";
import { LeavesPage } from "@/pages/web/LeavesPage";
import { NotificationsPage } from "@/pages/web/NotificationsPage";
import { SettingsPage } from "@/pages/web/SettingsPage";
import { ProfilePage } from "@/pages/web/ProfilePage";
import { PayrollPage } from "@/pages/web/PayrollPage";
import { SchedulePage } from "@/pages/web/SchedulePage";
import { EmployeeDetailPage } from "@/pages/web/EmployeeDetailPage";
import { SopPage } from "@/pages/web/SopPage";
import { AiLogsPage } from "@/pages/web/AiLogsPage";

// Mobile pages
import { MobileHomePage } from "@/pages/mobile/MobileHomePage";
import { MobileClockPage } from "@/pages/mobile/MobileClockPage";
import { MobileLeavePage } from "@/pages/mobile/MobileLeavePage";
import { MobileNotificationsPage } from "@/pages/mobile/MobileNotificationsPage";
import { MobileProfilePage } from "@/pages/mobile/MobileProfilePage";
import { MobileSchedulePage } from "@/pages/mobile/MobileSchedulePage";
import { MobileSopPage } from "@/pages/mobile/MobileSopPage";

// Misc
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DocsLayout } from "@/docs/components/DocsLayout";
import { DocsIndexPage, DocsArticlePage } from "@/pages/docs/DocsPage";
import { StatusPage } from "@/pages/StatusPage";
import { ForcePasswordChangeModal } from "@/components/ForcePasswordChangeModal";
import { SitePermissionsGate } from "@/components/SitePermissionsGate";
import { PinRotationPrompt } from "@/components/PinRotationPrompt";
import { PwaInstallPromptModal } from "@/components/PwaInstallPromptModal";
import { SitePermissionsProvider } from "@/contexts/SitePermissionsContext";
import { FeatureGate, MobileFeatureGate } from "@/components/FeatureGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

/** Redirects to /m or /web based on viewport size, or /login if not authenticated */
function RootRedirect() {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isMobile ? "/m" : "/web"} replace />;
}

function ThemedApp() {
  const { branding } = useBranding();

  return (
    <ThemeProvider
      themeConfig={{
        dark_mode_enabled: branding.dark_mode_enabled,
        forced_theme: branding.forced_theme,
        default_theme: branding.default_theme,
      }}
    >
      <AuthProvider>
        <SitePermissionsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/docs" element={<DocsLayout />}>
              <Route index element={<DocsIndexPage />} />
              <Route path=":section/:slug" element={<DocsArticlePage />} />
            </Route>
            <Route path="/web" element={<WebLayout />}>
              <Route index element={<FeatureGate feature="dashboard"><DashboardPage /></FeatureGate>} />
              <Route path="employees" element={<FeatureGate feature="employees"><EmployeesPage /></FeatureGate>} />
              <Route path="employees/:id" element={<FeatureGate feature="employees"><EmployeeDetailPage /></FeatureGate>} />
              <Route path="attendance" element={<FeatureGate feature="attendance"><AttendancePage /></FeatureGate>} />
              <Route path="leaves" element={<FeatureGate feature="leave"><LeavesPage /></FeatureGate>} />
              <Route path="notifications" element={<FeatureGate feature="notifications"><NotificationsPage /></FeatureGate>} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="payroll" element={<FeatureGate feature="payroll"><PayrollPage /></FeatureGate>} />
              <Route path="schedule" element={<FeatureGate feature="schedule"><SchedulePage /></FeatureGate>} />
              <Route path="sop" element={<FeatureGate feature="sop"><SopPage /></FeatureGate>} />
              <Route path="ai-logs" element={<FeatureGate feature="ai_logs"><AiLogsPage /></FeatureGate>} />
            </Route>
            <Route path="/m" element={<MobileLayout />}>
              <Route index element={<MobileFeatureGate feature="dashboard"><MobileHomePage /></MobileFeatureGate>} />
              <Route path="clock" element={<MobileFeatureGate feature="attendance"><MobileClockPage /></MobileFeatureGate>} />
              <Route path="leave" element={<MobileFeatureGate feature="leave"><MobileLeavePage /></MobileFeatureGate>} />
              <Route path="notifications" element={<MobileFeatureGate feature="notifications"><MobileNotificationsPage /></MobileFeatureGate>} />
              <Route path="profile" element={<MobileProfilePage />} />
              <Route path="sop" element={<MobileFeatureGate feature="sop"><MobileSopPage /></MobileFeatureGate>} />
            </Route>
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ForcePasswordChangeModal />
          <SitePermissionsGate />
          <PinRotationPrompt />
          <PwaInstallPromptModal />
          <Toaster />
        </BrowserRouter>
        </SitePermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <FeatureFlagsProvider>
          <ThemedApp />
        </FeatureFlagsProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}
