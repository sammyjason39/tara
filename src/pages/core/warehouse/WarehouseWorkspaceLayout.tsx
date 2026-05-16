import * as React from "react";
import {
  Warehouse,
  LayoutGrid,
  MapPin,
  Package,
  Boxes,
  ClipboardList,
  BarChart3,
  Settings2,
  Clock,
  History,
  ShieldCheck,
  GitBranch
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Tactical Visualization",
    items: [
      { label: "Warehouse Map", to: "/core/warehouse", icon: LayoutGrid },
      { label: "Storage Hierarchy", to: "/core/warehouse/hierarchy", icon: MapPin },
    ],
  },
  {
    title: "Inbound/Outbound",
    items: [
      { label: "Receiving", to: "/core/warehouse/receiving", icon: Package },
      { label: "Picking", to: "/core/warehouse/picking", icon: Boxes },
      { label: "Packing", to: "/core/warehouse/packing", icon: ClipboardList },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Occupancy Trends", to: "/core/warehouse/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Schedule", to: "/core/warehouse/schedule", icon: Clock },
      { label: "Logs", to: "/core/warehouse/logs", icon: History },
      { label: "Audit", to: "/core/warehouse/audit", icon: ShieldCheck },
      { label: "Workflow", to: "/core/warehouse/workflow", icon: GitBranch },
      { label: "Settings", to: "/core/warehouse/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  "": "Warehouse Map",
  "hierarchy": "Storage Hierarchy",
  "receiving": "Receiving",
  "picking": "Picking",
  "packing": "Packing",
  "analytics": "Occupancy Trends",
  "schedule": "Schedule",
  "logs": "Logs",
  "audit": "Audit",
  "workflow": "Workflow",
  "admin": "Settings",
};

export default function WarehouseWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Warehouse Control"
      subtitle="Spatial Logistics Optimization & Tactical Node Management"
      headerIcon={Warehouse}
      accentColor="blue"
      engineName="LOGISTICS ENGINE"
      pulseLabel="Dock Pulse"
      pulseIcon={Boxes}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/warehouse"
    />
  );
}
