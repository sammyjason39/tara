import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessDocsSection,
  SECTION_LABELS,
  type DocsAudience,
} from "@/docs/docs-access";
import { findDocPage, getDefaultDocPath, DOC_SECTIONS } from "@/docs/docs-config";
import { getDocContent } from "@/docs/docs-loader";
import { DocsAccessDenied } from "@/docs/components/DocsSidebar";
import { DocsMarkdown } from "@/docs/components/DocsMarkdown";
import { NotFoundPage } from "@/pages/NotFoundPage";

const VALID_SECTIONS = new Set(["employee", "supervisor", "hr", "admin"]);

export function DocsIndexPage() {
  return <Navigate to={getDefaultDocPath()} replace />;
}

export function DocsArticlePage() {
  const { section, slug } = useParams<{ section: string; slug: string }>();
  const { user, isAuthenticated } = useAuth();

  if (!section || !slug || !VALID_SECTIONS.has(section)) {
    return <NotFoundPage />;
  }

  const audience = section as DocsAudience;
  const found = findDocPage(section, slug);

  if (!found) {
    return <NotFoundPage />;
  }

  if (!canAccessDocsSection(audience, user?.role, isAuthenticated)) {
    return <DocsAccessDenied section={audience} />;
  }

  const content = getDocContent(audience, slug);
  if (!content) {
    return <NotFoundPage />;
  }

  const { section: sectionMeta, page } = found;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-2xs text-muted-foreground mb-6 flex-wrap">
        <Link to="/docs" className="hover:text-foreground">
          Docs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{SECTION_LABELS[audience]}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{page.title}</span>
      </nav>

      {page.description && (
        <p className="text-sm text-muted-foreground mb-6 -mt-2">{page.description}</p>
      )}

      <DocsMarkdown content={content} />

      {/* Prev/next within section */}
      <DocPager sectionId={sectionMeta.id} currentSlug={slug} />
    </div>
  );
}

function DocPager({ sectionId, currentSlug }: { sectionId: DocsAudience; currentSlug: string }) {
  const section = DOC_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;

  const idx = section.pages.findIndex((p) => p.slug === currentSlug);
  const prev = idx > 0 ? section.pages[idx - 1] : null;
  const next = idx < section.pages.length - 1 ? section.pages[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-12 pt-6 border-t border-border flex justify-between gap-4">
      {prev ? (
        <Link
          to={`/docs/${sectionId}/${prev.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/docs/${sectionId}/${next.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground text-right"
        >
          {next.title} →
        </Link>
      ) : null}
    </div>
  );
}
