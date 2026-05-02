import * as React from "react";
import {
  Users2,
  HeartPulse,
  LayoutGrid,
  UserPlus2,
  Network,
  GraduationCap,
  Scale,
  FileSpreadsheet,
  GitBranch,
  Settings2,
  Briefcase
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Pulse Command", to: "/core/hr", icon: HeartPulse },
      { label: "Growth Matrix", to: "/core/hr/growth", icon: BarChart3 },
    ],
  },
  {
    title: "People",
    items: [
      { label: "People Core", to: "/core/hr/people", icon: Users2 },
      { label: "Org Map", to: "/core/hr/org-map", icon: Network },
      { label: "Talent Flow", to: "/core/hr/talent", icon: UserPlus2 },
      { label: "Skill Track", to: "/core/hr/skilltrack", icon: GraduationCap },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Pay Cycle Studio", to: "/core/hr/paycycle", icon: FileSpreadsheet },
      { label: "Case Vault", to: "/core/hr/cases", icon: Briefcase },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Workflow", to: "/core/workflow?scope=HR", icon: GitBranch },
      { label: "Lex Board", to: "/core/hr/lexboard", icon: Scale },
      { label: "Administration", to: "/core/hr/admin", icon: Settings2 },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    SECTIONS.flatMap((section) =>
      section.items.map((item) => [item.to.replace("/core/hr/", ""), item.label]),
    ),
  ),
  roster: "People Core",
  people: "People Core",
};

import { BarChart3 } from "lucide-react";

export default function HRWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="H.R. Command"
      subtitle="Human Capital & Workforce Intelligence Matrix"
      headerIcon={HeartPulse}
      accentColor="rose"
      engineName="H.R. ENGINE"
      pulseLabel="Culture Pulse"
      pulseIcon={Users2}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/hr"
    />
  );
}
