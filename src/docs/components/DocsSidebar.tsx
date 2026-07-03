import { Link, useLocation } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessDocsSection,
  SECTION_DESCRIPTIONS,
  SECTION_LABELS,
  type DocsAudience,
} from "@/docs/docs-access";
import { DOC_SECTIONS } from "@/docs/docs-config";
import { cn } from "@/lib/utils";

interface DocsSidebarProps {
  onNavigate?: () => void;
}

export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();

  return (
    <nav className="space-y-6">
      {DOC_SECTIONS.map((section) => {
        const allowed = canAccessDocsSection(section.id, user?.role, isAuthenticated);
        const isRestricted = section.id !== "employee";

        return (
          <div key={section.id}>
            <div className="flex items-center gap-2 px-3 mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {SECTION_LABELS[section.id]}
              </h3>
              {isRestricted && !allowed && (
                <Lock className="h-3 w-3 text-muted-foreground/60" aria-hidden />
              )}
            </div>
            <p className="px-3 text-2xs text-muted-foreground/80 mb-2 leading-snug">
              {SECTION_DESCRIPTIONS[section.id]}
            </p>
            <ul className="space-y-0.5">
              {section.pages.map((page) => {
                const href = `/docs/${section.id}/${page.slug}`;
                const active = pathname === href;
                const pageAllowed = allowed;

                if (!pageAllowed) {
                  return (
                    <li key={page.slug}>
                      <span
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed",
                        )}
                        title="Login diperlukan"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{page.title}</span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={page.slug}>
                    <Link
                      to={href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {page.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function DocsAccessDenied({ section }: { section: DocsAudience }) {
  const { pathname } = useLocation();
  const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">Login diperlukan</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Dokumentasi <strong>{SECTION_LABELS[section]}</strong> hanya dapat diakses setelah login
        dengan role yang sesuai ({section === "supervisor" && "Supervisor"}
        {section === "hr" && "HR Admin"}
        {section === "admin" && "Admin"}).
      </p>
      <Link
        to={loginUrl}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <LogIn className="h-4 w-4" />
        Login ke TARA
      </Link>
      <Link to="/docs/employee/memulai" className="mt-4 text-sm text-muted-foreground hover:text-foreground">
        ← Kembali ke panduan karyawan
      </Link>
    </div>
  );
}
