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
  Briefcase,
  Clock,
  UserCircle,
  ShoppingCart,
  ArrowDownLeft,
  Archive,
  History,
  ShieldCheck,
  Cpu,
  BarChart3
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
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/hr/schedule", icon: Briefcase },
      { label: "Staff Portal", to: "/core/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/procurement/prs?dept=HR", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=HR", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/stock?dept=HR", icon: Archive },
      { label: "Attendance", to: "/core/hr/attendance", icon: Clock },
      { label: "Log", to: "/core/logs?scope=HR", icon: History },
      { label: "Audit", to: "/core/audit?scope=HR", icon: ShieldCheck },
      { label: "Workflow", to: "/core/workflow?scope=HR", icon: GitBranch },
      { label: "Administrative", to: "/core/hr/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    SECTIONS.flatMap((section) =>
      (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/hr/", ""), item.label]),
    ),
  ),
  roster: "People Core",
  people: "People Core",
};

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
