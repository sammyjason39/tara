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
  Layers,
  Clock,
  UserCircle,
  ShoppingCart,
  ArrowDownLeft,
  Archive,
  History,
  ShieldCheck,
  Cpu,
  GitBranch,
  Zap
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
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/sales/schedule", icon: Briefcase },
      { label: "Staff Portal", to: "/core/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/procurement/prs?dept=SALES", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=SALES", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/stock?dept=SALES", icon: Archive },
      { label: "Attendance", to: "/core/sales/attendance", icon: Clock },
      { label: "Log", to: "/core/logs?scope=SALES", icon: History },
      { label: "Audit", to: "/core/audit?scope=SALES", icon: ShieldCheck },
      { label: "Workflow", to: "/core/workflow?scope=SALES", icon: GitBranch },
      { label: "Administrative", to: "/core/sales/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/sales/", ""), item.label]),
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
