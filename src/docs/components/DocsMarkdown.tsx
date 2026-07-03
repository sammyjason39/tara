import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface DocsMarkdownProps {
  content: string;
  className?: string;
}

export function DocsMarkdown({ content, className }: DocsMarkdownProps) {
  return (
    <article
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        "prose-headings:font-display prose-headings:scroll-mt-24",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
        "prose-table:text-sm",
        "prose-th:bg-muted",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
