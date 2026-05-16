import * as React from "react";
import {
  Package,
  LayoutGrid,
  BarChart3,
  Archive,
  ArrowDownLeft,
  RefreshCcw,
  Warehouse,
  Database,
  Clock,
  UserCircle,
  ShoppingCart,
  History,
  ShieldCheck,
  GitBranch,
  Users,
  Radio,
  Settings2
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Inventory Command", to: "/core/inventory", icon: LayoutGrid },
      { label: "Stock Insights", to: "/core/inventory/insights", icon: BarChart3 },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Stock Hub", to: "/core/inventory/stock", icon: Archive },
      { label: "Receiving Desk", to: "/core/inventory/receiving", icon: ArrowDownLeft },
      { label: "Transfer Desk", to: "/core/inventory/transfers", icon: RefreshCcw },
    ],
  },
  {
    title: "Automation",
    items: [
      { label: "IoT Feed", to: "/core/inventory/iot", icon: Radio },
      { label: "Adjustments", to: "/core/inventory/adjustments", icon: Database },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/inventory/schedule", icon: Users },
      { label: "Staff Portal", to: "/core/inventory/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/inventory/prs?dept=INVENTORY", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=INVENTORY", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/opname", icon: Archive },
      { label: "Attendance", to: "/core/inventory/attendance", icon: Clock },
      { label: "Log", to: "/core/inventory/logs?scope=INVENTORY", icon: History },
      { label: "Audit", to: "/core/inventory/audit-log?scope=INVENTORY", icon: ShieldCheck },
      { label: "Workflow", to: "/core/inventory/workflow?scope=INVENTORY", icon: GitBranch },
      { label: "Administrative", to: "/core/inventory/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/inventory/", ""), item.label]),
  ),
);

export default function InventoryWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Inventory Command"
      subtitle="Dynamic Stock Control & Supply Chain Visibility Matrix"
      headerIcon={Package}
      accentColor="orange"
      engineName="INVENTORY ENGINE"
      pulseLabel="Stock Pulse"
      pulseIcon={Archive}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/inventory"
    />
  );
}
