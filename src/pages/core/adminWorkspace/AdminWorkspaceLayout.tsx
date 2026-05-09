import * as React from "react";
import { Shield, Activity, Inbox, Route, ListChecks } from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  { 
    title: "OPERATIONS", 
    items: [
      { label: "Intake Queue", to: "/core/admin/requests", icon: Inbox },
      { label: "Asset Routing", to: "/core/admin/assign", icon: Route },
      { label: "Compliance Track", to: "/core/admin/track", icon: ListChecks }
    ] 
  },
];

const ROUTE_LABELS = {
  "requests": "Intake Queue",
  "assign": "Asset Routing",
  "track": "Compliance Track"
};

export default function AdminWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Admin Hub"
      subtitle="Centralized departmental governance, asset routing, and organizational audit."
      headerIcon={Shield}
      accentColor="slate"
      engineName="ADMIN_CORE"
      pulseLabel="System Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/admin"
    />
  );
}

