import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Lock, Settings2 } from "lucide-react";
import { RequestModal } from "@/core/ui/RequestModal";
import { adminService } from "@/core/services/adminService";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";

type ModuleItem = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  locked: boolean;
};

const moduleGroups: { title: string; items: ModuleItem[] }[] = [
  {
    title: "Commerce",
    items: [
      {
        id: "retail-pos",
        name: "Retail POS",
        description: "Unified sales, receipts, and in-store workflows.",
        status: "Active",
        locked: false,
      },
      {
        id: "fnb-pos",
        name: "F&B POS",
        description: "Order management and kitchen operations.",
        status: "Active",
        locked: false,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        id: "inventory",
        name: "Inventory",
        description: "Stock tracking, replenishment, and audit trails.",
        status: "Active",
        locked: false,
      },
      {
        id: "workforce",
        name: "Workforce",
        description: "Scheduling, attendance, and labor compliance.",
        status: "Inactive",
        locked: true,
      },
    ],
  },
  {
    title: "Growth",
    items: [
      {
        id: "crm",
        name: "Customer CRM",
        description: "Customer lifecycle and loyalty automation.",
        status: "Inactive",
        locked: true,
      },
      {
        id: "analytics",
        name: "Analytics Studio",
        description: "Advanced reporting and predictive insights.",
        status: "Inactive",
        locked: true,
      },
    ],
  },
];

export default function CoreModules() {
  const session = useSession();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRequestAccess = async (data: { title: string; reason: string }) => {
    try {
      await adminService.createRequest(session.tenant_id, session, {
        type: "MODULE_ACCESS",
        title: data.title,
        description: data.reason,
      });
      toast({
        title: "Request Sent",
        description: `Your request for ${data.title} has been logged.`,
      });
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: "Unable to process module request.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Modules"
          subtitle="Control which capabilities are enabled for each tenant."
          primaryAction={<Button onClick={() => setIsModalOpen(true)}>Request module access</Button>}
          secondaryActions={<Button onClick={(e) => { e.preventDefault(); alert("Detailed View:\n\nMetadata: " + (typeof window !== "undefined" ? window.location.pathname : "N/A")); }} variant="outline">View licensing</Button>}
        />
      }
    >
      <div className="space-y-6">
        {moduleGroups.map((group) => (
          <WorkspacePanel
            key={group.title}
            title={group.title}
            description="Manage availability, licensing, and configuration."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((module) => (
                <div key={module.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {module.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                    <Badge variant={module.status === "Active" ? "default" : "secondary"}>
                      {module.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    {module.locked ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        Locked
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Settings2 className="h-4 w-4" />
                        Configurable
                      </div>
                    )}
                    <Button size="sm" variant="outline" disabled={module.locked}>
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        ))}
      </div>
      
      <RequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRequestAccess}
        title="Request Module Access"
        description="Submit a request to the system administrator to enable new capabilities for your tenant."
        defaultTitle="Module Access Request"
      />
    </PageShell>
  );
}
