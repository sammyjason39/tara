import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
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
import { ForcePasswordChangeModal } from "@/components/ForcePasswordChangeModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

/** Redirects to /m or /web based on viewport size, or /login if not authenticated */
function RootRedirect() {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isMobile ? "/m" : "/web"} replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />

              {/* Web Interface (HR & Supervisors) */}
              <Route path="/web" element={<WebLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/:id" element={<EmployeeDetailPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="sop" element={<SopPage />} />
                <Route path="ai-logs" element={<AiLogsPage />} />
              </Route>

              {/* Mobile Interface (All Employees) */}
              <Route path="/m" element={<MobileLayout />}>
                <Route index element={<MobileHomePage />} />
                <Route path="clock" element={<MobileClockPage />} />
                <Route path="leave" element={<MobileLeavePage />} />
                <Route path="notifications" element={<MobileNotificationsPage />} />
                <Route path="profile" element={<MobileProfilePage />} />
                <Route path="sop" element={<MobileSopPage />} />
              </Route>

              {/* Default */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <ForcePasswordChangeModal />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
