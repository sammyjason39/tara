import * as React from "react";
import {
  Link2,
  LayoutGrid,
  ShieldCheck,
  GitBranch,
  Settings2,
  Megaphone,
  Zap,
  Layers,
  HeartPulse,
  Mail,
  Share2,
  BarChart3,
  Calendar,
  FileText,
  Target
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Marketing Command", to: "/core/marketing/dashboard", icon: LayoutGrid },
      { label: "Impact Matrix", to: "/core/marketing/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "Customer 360", to: "/core/marketing/customer-360", icon: HeartPulse },
      { label: "Lead Capture", to: "/core/marketing/leads", icon: Target },
      { label: "Funnel Matrix", to: "/core/marketing/funnels", icon: Layers },
    ],
  },
  {
    title: "Omnichannel",
    items: [
      { label: "Campaign Studio", to: "/core/marketing/campaigns", icon: Megaphone },
      { label: "Nurture Hub", to: "/core/marketing/nurture", icon: Mail },
      { label: "Social Connect", to: "/core/marketing/accounts", icon: Share2 },
      { label: "Execution Desk", to: "/core/marketing/execution", icon: Zap },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Creative Library", to: "/core/marketing/creative", icon: FileText },
      { label: "Appointment Desk", to: "/core/marketing/appointments", icon: Calendar },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Workflow", to: "/core/workflow?scope=Marketing", icon: GitBranch },
      { label: "Audit Vault", to: "/core/marketing/audit", icon: ShieldCheck },
      { label: "Administration", to: "/core/marketing/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/marketing/", ""), item.label]),
  ),
);

export default function MarketingWorkspaceLayout({ children }: { children?: React.ReactNode }) {
  return (
    <DepartmentWorkspaceLayout
      title="Marketing Command"
      subtitle="Omnichannel Growth & Audience Intelligence Matrix"
      headerIcon={Link2}
      accentColor="purple"
      engineName="MARKETING ENGINE"
      pulseLabel="Growth Pulse"
      pulseIcon={Zap}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/marketing"
    >
      {children}
    </DepartmentWorkspaceLayout>
  );
}
