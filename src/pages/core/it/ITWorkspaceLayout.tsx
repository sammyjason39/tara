import * as React from "react";
import {
  ShieldCheck,
  LayoutGrid,
  Activity,
  Server,
  Network,
  Fingerprint,
  Cpu,
  ShoppingCart
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
      { label: "System Core", to: "/core/it/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/it/", ""), item.label]),
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
