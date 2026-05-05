import * as React from "react";
import {
  ShieldCheck,
  LayoutGrid,
  Activity,
  Server,
  ShoppingCart,
  Clock,
  UserCircle,
  ArrowDownLeft,
  Archive,
  History,
  GitBranch,
  Briefcase,
  Network,
  Fingerprint,
  Cpu
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "IT Command", to: "/core/it", icon: LayoutGrid },
      { label: "System Health", to: "/core/it/health", icon: Activity },
    ],
  },
  {
    title: "Assets",
    items: [
      { label: "Device Desk", to: "/core/it/devices", icon: Server },
      { label: "Topology Map", to: "/core/it/topology", icon: Network },
      { label: "Tech Shop", to: "/core/it/shop", icon: ShoppingCart },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Role Registry", to: "/core/it/roles", icon: Fingerprint },
      { label: "Account Control", to: "/core/it/accounts", icon: ShieldCheck },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/it/schedule", icon: Briefcase },
      { label: "Staff Portal", to: "/core/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/procurement/prs?dept=IT", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=IT", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/stock?dept=IT", icon: Archive },
      { label: "Attendance", to: "/core/it/attendance", icon: Clock },
      { label: "Log", to: "/core/logs?scope=IT", icon: History },
      { label: "Audit", to: "/core/audit?scope=IT", icon: ShieldCheck },
      { label: "Workflow", to: "/core/workflow?scope=IT", icon: GitBranch },
      { label: "Administrative", to: "/core/it/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/it/", ""), item.label]),
  ),
);

export default function ITWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="I.T. Command"
      subtitle="Systems Governance & Digital Infrastructure Integrity Matrix"
      headerIcon={ShieldCheck}
      accentColor="slate"
      engineName="I.T. ENGINE"
      pulseLabel="System Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/it"
    />
  );
}
