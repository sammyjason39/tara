import type { DocsAudience } from "./docs-access";

const modules = import.meta.glob("./content/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function contentKey(section: DocsAudience, slug: string): string {
  return `./content/${section}/${slug}.md`;
}

export function getDocContent(section: DocsAudience, slug: string): string | null {
  return modules[contentKey(section, slug)] ?? null;
}

export function hasDocContent(section: DocsAudience, slug: string): boolean {
  return contentKey(section, slug) in modules;
}
