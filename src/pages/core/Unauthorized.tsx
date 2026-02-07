import { Button } from "@/components/ui/button";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <PageShell
      header={
        <PageHeader
          title="Access restricted"
          subtitle="You do not have permission to view this workspace."
          primaryAction={
            <Button asChild>
              <Link to="/core">Return to dashboard</Link>
            </Button>
          }
        />
      }
    >
      <WorkspacePanel>
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
          <div className="rounded-full border bg-muted/40 p-3">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              Permission required
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator if you believe this is a mistake.
            </p>
          </div>
        </div>
      </WorkspacePanel>
    </PageShell>
  );
}
