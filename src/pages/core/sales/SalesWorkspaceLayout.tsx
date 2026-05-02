import * as React from "react";
import {
  TrendingUp,
  LayoutGrid,
  Users,
  GitMerge,
  Target,
  FileText,
  BadgeDollarSign,
  Briefcase,
  GitBranch,
  Settings2,
  Rocket,
  Zap,
  Layers
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Sales Command", to: "/core/sales/dashboard", icon: LayoutGrid },
      { label: "Revenue Matrix", to: "/core/sales/overview", icon: TrendingUp },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { label: "Lead Ingestion", to: "/core/sales/leads", icon: Users },
      { label: "Funnel Matrix", to: "/core/sales/pipeline", icon: Layers },
      { label: "Opportunity Vault", to: "/core/sales/opps", icon: Target },
    ],
  },
  {
    title: "Execution",
    items: [
      { label: "Quote Studio", to: "/core/sales/quotes", icon: FileText },
      { label: "Customer 360", to: "/core/sales/customers", icon: GitMerge },
      { label: "Commission Desk", to: "/core/sales/commissions", icon: BadgeDollarSign },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Workflow", to: "/core/workflow?scope=Sales", icon: GitBranch },
      { label: "Staff Schedule", to: "/core/sales/schedule", icon: Briefcase },
      { label: "Administration", to: "/core/sales/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/sales/", ""), item.label]),
  ),
);

export default function SalesWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Sales Command"
      subtitle="Revenue Growth & Market Acquisition Matrix"
      headerIcon={TrendingUp}
      accentColor="orange"
      engineName="SALES ENGINE"
      pulseLabel="Revenue Pulse"
      pulseIcon={Zap}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/sales"
    />
  );
}
