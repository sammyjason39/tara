import * as React from "react";
import {
  Package,
  LayoutGrid,
  BarChart3,
  Archive,
  ArrowDownLeft,
  RefreshCcw,
  Warehouse,
  Radio,
  FileText,
  Settings2,
  Database
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
      { label: "Warehouse Map", to: "/core/inventory/warehouse", icon: Warehouse },
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
    title: "Governance",
    items: [
      { label: "Audit Vault", to: "/core/inventory/audit", icon: FileText },
      { label: "Administration", to: "/core/inventory/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/inventory/", ""), item.label]),
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
