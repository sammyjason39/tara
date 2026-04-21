import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { CreditCard, Monitor, Calculator } from "lucide-react";
import { RequestModal } from "@/core/ui/RequestModal";
import { adminService } from "@/core/services/adminService";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";

type IntegrationItem = {
  id: string;
  name: string;
  description: string;
  status: "Connected" | "Disconnected" | "Error";
  locked?: boolean;
};

const paymentProviders: IntegrationItem[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Card payments, payouts, and reconciliation.",
    status: "Connected",
  },
  {
    id: "adyen",
    name: "Adyen",
    description: "Unified payments and global routing.",
    status: "Disconnected",
  },
  {
    id: "local-wallet",
    name: "Local Wallet",
    description: "Regional wallet for QR payments.",
    status: "Error",
  },
];

const posDevices: IntegrationItem[] = [
  {
    id: "terminal-sync",
    name: "Terminal Sync",
    description: "Device enrollment and health monitoring.",
    status: "Connected",
  },
  {
    id: "receipt-printers",
    name: "Receipt Printers",
    description: "Managed printer fleet configuration.",
    status: "Disconnected",
  },
  {
    id: "kds",
    name: "Kitchen Display",
    description: "Order routing for kitchen operations.",
    status: "Disconnected",
    locked: true,
  },
];

const accountingSystems: IntegrationItem[] = [
  {
    id: "netsuite",
    name: "NetSuite",
    description: "ERP accounting and consolidation.",
    status: "Disconnected",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Cloud accounting synchronization.",
    status: "Disconnected",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "General ledger and billing exports.",
    status: "Disconnected",
    locked: true,
  },
];

const statusTone = (status: IntegrationItem["status"]) => {
  if (status === "Connected") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Error") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

const IntegrationRow = ({
  item,
  icon,
}: {
  item: IntegrationItem;
  icon: React.ReactNode;
}) => (
  <div className="flex items-center justify-between rounded-lg border p-4">
    <div className="flex items-start gap-4">
      <div className="rounded-lg border bg-muted/40 p-2">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Badge variant="outline" className={statusTone(item.status)}>
        {item.status}
      </Badge>
      <Button size="sm" variant="outline" disabled={item.locked}>
        Configure
      </Button>
    </div>
  </div>
);

export default function CoreIntegrations() {
  const session = useSession();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRequestIntegration = async (data: { title: string; reason: string }) => {
    try {
      await adminService.createRequest(session.tenant_id, session, {
        type: "INTEGRATION_REQUEST",
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
        description: "Unable to process integration request.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Integrations"
          subtitle="Connect enterprise systems to keep finance, operations, and devices aligned."
          primaryAction={<Button onClick={() => setIsModalOpen(true)}>Request new integration</Button>}
          secondaryActions={<Button onClick={() => window.location.reload()} variant="outline">Sync all</Button>}
        />
      }
    >
      <div className="space-y-6">
        <WorkspacePanel
          title="Payment providers"
          description="Gateways and wallets connected to the platform."
        >
          <div className="space-y-3">
            {paymentProviders.map((item) => (
              <IntegrationRow
                key={item.id}
                item={item}
                icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
              />
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="POS devices"
          description="Hardware integrations across storefronts and kitchens."
        >
          <div className="space-y-3">
            {posDevices.map((item) => (
              <IntegrationRow
                key={item.id}
                item={item}
                icon={<Monitor className="h-5 w-5 text-muted-foreground" />}
              />
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Accounting systems"
          description="Exports and journals for finance teams."
        >
          <div className="space-y-3">
            {accountingSystems.map((item) => (
              <IntegrationRow
                key={item.id}
                item={item}
                icon={<Calculator className="h-5 w-5 text-muted-foreground" />}
              />
            ))}
          </div>
        </WorkspacePanel>
      </div>
      
      <RequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRequestIntegration}
        title="Request New Integration"
        description="Explain why you need this integration and our engineering team will review the request."
        defaultTitle="New Integration Request"
      />
    </PageShell>
  );
}
