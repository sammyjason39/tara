import { useState } from "react";
import type { ElementType } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppSwitcher } from "@/components/shared/AppSwitcher";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Puzzle,
  BarChart3,
  Link2,
  Settings,
  Shield,
  Wallet,
  CreditCard,
  Package,
  ShoppingCart,
  ShieldCheck,
  Users2,
  Inbox,
  Wrench,
  FolderOpen,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

type NavItem = {
  path: string;
  icon: ElementType;
  label: string;
  end?: boolean;
};
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "WorkSuite",
    items: [
      { path: "/core", icon: LayoutDashboard, label: "Dashboard", end: true },
      { path: "/core/operations", icon: ClipboardList, label: "Operations" },
      { path: "/core/workflow", icon: Inbox, label: "Workflow" },
      { path: "/core/tools", icon: Wrench, label: "WorkTools" },
    ],
  },
  {
    title: "Management",
    items: [
      { path: "/core/finance", icon: Wallet, label: "Finance" },
      { path: "/core/payment", icon: CreditCard, label: "Payment" },
      { path: "/core/procurement", icon: ShoppingCart, label: "Procurement" },
      { path: "/core/inventory", icon: Package, label: "Inventory" },
      { path: "/core/hr", icon: Users2, label: "HR" },
      { path: "/core/it", icon: ShieldCheck, label: "IT" },
    ],
  },
  {
    title: "Commerce & Growth",
    items: [
      { path: "/core/sales", icon: BarChart3, label: "Sales" },
      { path: "/core/marketing", icon: Link2, label: "Marketing" },
    ],
  },
  {
    title: "Backbone",
    items: [
      { path: "/core/admin", icon: Shield, label: "Administration" },
      { path: "/core/staff", icon: Users, label: "Staff" },
      { path: "/core/modules", icon: Puzzle, label: "Modules" },
      { path: "/core/reports", icon: BarChart3, label: "Reports" },
      { path: "/core/integrations", icon: Link2, label: "Integrations" },
      { path: "/core/security", icon: ShieldCheck, label: "Security" },
      { path: "/core/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function CoreLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state, toggleTheme } = useApp();
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <LayoutDashboard
                  size={18}
                  className="text-sidebar-primary-foreground"
                />
              </div>
              <span className="font-bold text-lg">OpsCore</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-4">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                    {section.title}
                  </p>
                  {section.items.map(({ path, icon: Icon, label, end }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon size={18} />
                      {label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            <OfflineIndicator showText className="text-sidebar-foreground/70" />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent"
                onClick={toggleTheme}
              >
                {state.theme === "dark" ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent"
                onClick={logout}
              >
                <LogOut size={18} />
              </Button>
            </div>

            {state.currentUser && (
              <div className="pt-2">
                <p className="text-sm font-medium text-sidebar-foreground">
                  {state.currentUser.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {state.currentUser.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-14 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <AppSwitcher />
          </div>

          <div className="flex items-center gap-2">
            <OfflineIndicator showText={false} className="hidden sm:flex" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
