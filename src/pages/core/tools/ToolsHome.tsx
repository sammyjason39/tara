import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { listTools } from "@/core/tools/toolRegistry";

export default function ToolsHome() {
  const session = useSession();
  const tools = listTools(session.tenantId);

  return (
    <PageShell
      header={
        <PageHeader
          title="WorkSuite"
          subtitle="Shared office tools for documents, spreadsheets, and exports."
        />
      }
    >
      <div className="space-y-6">
        <WorkspacePanel title="Available tools" description="Platform-wide productivity suite.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold text-foreground">Explorer</p>
              <p className="text-xs text-muted-foreground">Department-scoped file manager</p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/core/tools/explorer">Open</Link>
                </Button>
              </div>
            </div>
            {tools.map((tool) => {
              const route =
                tool.category === "documents"
                  ? "docs"
                  : tool.category === "spreadsheets"
                    ? "sheets"
                    : tool.category === "presentations"
                      ? "slides"
                      : tool.category === "calculators"
                        ? "calculators"
                        : "exports";
              return (
              <div key={tool.id} className="rounded-lg border p-4">
                <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                <p className="text-xs text-muted-foreground">Category: {tool.category}</p>
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/core/tools/${route}`}>
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
            )})}
          </div>
        </WorkspacePanel>
      </div>
    </PageShell>
  );
}
