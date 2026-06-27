import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppFooter } from "@/components/AppFooter";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Sun,
  Moon,
  Banknote,
  CalendarClock,
  User,
  ChevronDown,
  FileText,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/web", icon: LayoutDashboard, labelKey: "nav.dashboard", end: true },
  { to: "/web/employees", icon: Users, labelKey: "nav.employees" },
  { to: "/web/attendance", icon: Clock, labelKey: "nav.attendance" },
  { to: "/web/leaves", icon: CalendarDays, labelKey: "nav.leaves" },
  { to: "/web/payroll", icon: Banknote, labelKey: "nav.payroll" },
  { to: "/web/schedule", icon: CalendarClock, labelKey: "nav.schedule" },
  { to: "/web/sop", icon: FileText, labelKey: "nav.sop" },
  { to: "/web/ai-logs", icon: ScrollText, labelKey: "nav.aiLogs" },
  { to: "/web/notifications", icon: Bell, labelKey: "nav.notifications" },
  { to: "/web/settings", icon: Settings, labelKey: "nav.settings" },
];

export function WebLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">T</span>
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-sidebar-foreground">TARA</p>
              <p className="text-2xs text-muted-foreground tracking-luxury uppercase">HR System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-luxury"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <LanguageSelector />
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? t("sidebar.light_mode") : t("sidebar.dark_mode")}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-destructive w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("sidebar.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm">
          {/* User info with dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 hover:bg-accent px-2 py-1.5 rounded-md transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium">{user?.full_name || "—"}</p>
                <p className="text-2xs text-muted-foreground">{user?.role || "—"} • {user?.department || "—"}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {profileOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-md border border-border bg-card shadow-luxury-lg py-1 z-50 animate-fade-in">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/web/profile"); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  {t("profile.my_profile")}
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate("/web/settings"); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  {t("profile.settings")}
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t("profile.logout")}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/web/notifications")}
              className="relative p-2 rounded-md hover:bg-accent transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>

        {/* Footer */}
        <AppFooter />
      </main>
    </div>
  );
}
