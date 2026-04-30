import { useState } from "react";
import type { ElementType } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { getSettings } from "@/lib/local-storage";
import { getAllModuleContracts } from "@/core/runtime/moduleRegistry";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import { JVWorkspaceSwitcher } from "@/core/ui/JVWorkspaceSwitcher";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
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
  Megaphone,
  Mail,
  MessageSquare,
  FileText,
} from "lucide-react";

type NavItem = {
  path: string;
  icon: ElementType;
  label: string;
  end?: boolean;
  badgeKey?: 'notifications' | 'chat' | 'mail';
};
type NavSection = { title: string; items: NavItem[] };

const baseNavSections: NavSection[] = [
  {
    title: "WorkSuite",
    items: [
      { path: "/core", icon: LayoutDashboard, label: "Dashboard", end: true },
      { path: "/core/tools", icon: Wrench, label: "WorkTools" },
      { path: "/core/bulletin", icon: Megaphone, label: "Bulletin" },
      { path: "/core/mail", icon: Mail, label: "Mail", badgeKey: 'mail' },
      { path: "/core/chat", icon: MessageSquare, label: "Chat", badgeKey: 'chat' },
      { path: "/core/portal", icon: LayoutDashboard, label: "Staff Portal" },
    ],
  },
  {
    title: "Management",
    items: [
      { path: "/core/finance", icon: Wallet, label: "Finance" },
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
      { path: "/retail", icon: ShoppingCart, label: "Retail" },
      { path: "/core/reports", icon: BarChart3, label: "Reports" },
      { path: "/core/audit", icon: ShieldCheck, label: "Audit Logs" },
      { path: "/core/logs", icon: FileText, label: "System Logs" },
      { path: "/core/security", icon: ShieldCheck, label: "Security" },
      { path: "/core/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function CoreLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Dynamic Industry Modules
  const { state: appState, toggleTheme } = useApp();
  const { logout } = useAuth();
  const { unreadCounts } = useNotifications();
  const location = useLocation();
  const { settings } = appState;
  const activatedIds = settings.activatedModuleIds || [];
  const allContracts = getAllModuleContracts();
  const activatedModules = allContracts
    .filter(c => activatedIds.includes(c.id))
    .map(c => ({
      path: `/m/${c.id}/${c.getPages(c.getDefaultConfig())[0]?.id || ''}`,
      icon: c.id === 'retail' ? ShoppingCart : Puzzle,
      label: c.name
    }));

  const navSections = [
    ...baseNavSections.slice(0, 3), // WorkSuite, Management, Commerce
    ...(activatedModules.length > 0 ? [{
      title: "Activated Modules",
      items: activatedModules
    }] : []),
    baseNavSections[3] // Backbone
  ];

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
              <span className="font-bold text-lg">{settings?.businessName || "OpsCore"}</span>
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
                  {section.items.map(({ path, icon: Icon, label, end, badgeKey }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive || (path !== '/core' && location.pathname.startsWith(path))
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{label}</span>
                      {badgeKey && unreadCounts && unreadCounts[badgeKey] > 0 && (
                        <span className="h-5 min-w-[20px] px-1 bg-primary text-[10px] font-black text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 animate-in zoom-in">
                          {unreadCounts[badgeKey] > 9 ? '9+' : unreadCounts[badgeKey]}
                        </span>
                      )}
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
                {settings.theme === "dark" ? (
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

            {appState.currentUser && (
              <div className="pt-2">
                <p className="text-sm font-medium text-sidebar-foreground">
                  {appState.currentUser.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {appState.currentUser.role}
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
            <JVWorkspaceSwitcher />
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
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
