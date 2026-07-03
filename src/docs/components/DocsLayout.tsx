import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, BookOpen, ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { DocsSidebar } from "@/docs/components/DocsSidebar";
import { cn } from "@/lib/utils";

export function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { companyName } = useBranding();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/docs" className="flex items-center gap-2 shrink-0">
            <BookOpen className="h-5 w-5 text-primary hidden sm:block" />
            <span className="font-display font-semibold text-sm sm:text-base">
              Dokumentasi TARA
            </span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-2xs text-muted-foreground truncate max-w-[140px]">
                  {user?.full_name} · {user?.role}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/web")}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Aplikasi</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Login
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1400px] w-full mx-auto">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)] p-4">
          <DocsSidebar />
        </aside>

        {/* Sidebar — mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <aside className="relative w-[min(100%,20rem)] bg-background border-r border-border overflow-y-auto p-4 shadow-xl">
              <div className="mb-4 pb-4 border-b border-border">
                <CompanyLogo size="sm" subtitle={companyName} />
              </div>
              <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className={cn("flex-1 min-w-0 px-4 py-8 lg:px-10 lg:py-10")}>
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-border py-4 px-6 text-center text-2xs text-muted-foreground">
        TARA HR · {companyName} ·{" "}
        <a href="https://tara.ralali.io" className="hover:text-foreground">
          tara.ralali.io
        </a>
      </footer>
    </div>
  );
}
