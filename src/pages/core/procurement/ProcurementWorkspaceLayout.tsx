import * as React from "react";
import {
  ShoppingCart,
  Users,
  Building2,
  FileSignature,
  GitBranch,
  Settings2,
  ClipboardList,
  Monitor,
  Clock,
  UserCircle,
  History,
  ShieldCheck,
  Cpu,
  Archive,
  ArrowDownLeft,
  LayoutGrid,
  AlertTriangle,
  Truck
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Procurement Command", to: "/core/procurement/insights", icon: LayoutGrid },
      { label: "Risk Matrix", to: "/core/procurement/risk", icon: AlertTriangle },
    ],
  },
  {
    title: "Sourcing",
    items: [
      { label: "Supplier Desk", to: "/core/procurement/suppliers", icon: Building2 },
      { label: "Contract Vault", to: "/core/procurement/contracts", icon: FileSignature },
      { label: "Portal Inbox", to: "/core/procurement/portal", icon: Monitor },
    ],
  },
  {
    title: "Fulfillment",
    items: [
      { label: "Requisition Queue", to: "/core/procurement/prs", icon: ClipboardList },
      { label: "PO Release Hub", to: "/core/procurement/po-release", icon: ShoppingCart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/procurement/schedule", icon: Users },
      { label: "Staff Portal", to: "/core/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/procurement/prs?dept=PROCUREMENT", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=PROCUREMENT", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/stock?dept=PROCUREMENT", icon: Archive },
      { label: "Attendance", to: "/core/procurement/attendance", icon: Clock },
      { label: "Log", to: "/core/logs?scope=PROCUREMENT", icon: History },
      { label: "Audit", to: "/core/audit?scope=PROCUREMENT", icon: ShieldCheck },
      { label: "Workflow", to: "/core/workflow?scope=PROCUREMENT", icon: GitBranch },
      { label: "Administrative", to: "/core/procurement/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/procurement/", ""), item.label]),
  ),
);

export default function ProcurementWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Procurement Command"
      subtitle="Strategic Sourcing & Supply Chain Integrity Matrix"
      headerIcon={ShoppingCart}
      accentColor="amber"
      engineName="PROCUREMENT ENGINE"
      pulseLabel="Supply Telemetry"
      pulseIcon={Truck}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/procurement"
    />
  );
}
