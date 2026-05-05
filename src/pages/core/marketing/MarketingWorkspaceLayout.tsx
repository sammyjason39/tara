import * as React from "react";
import {
  Link2,
  LayoutGrid,
  ShieldCheck,
  GitBranch,
  Settings2,
  Megaphone,
  Zap,
  Layers,
  HeartPulse,
  Mail,
  Target,
  Clock,
  UserCircle,
  ShoppingCart,
  ArrowDownLeft,
  Archive,
  History,
  Cpu,
  Briefcase,
  BarChart3,
  Share2,
  FileText,
  Calendar
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "Marketing Command", to: "/core/marketing/dashboard", icon: LayoutGrid },
      { label: "Impact Matrix", to: "/core/marketing/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "Customer 360", to: "/core/marketing/customer-360", icon: HeartPulse },
      { label: "Lead Capture", to: "/core/marketing/leads", icon: Target },
      { label: "Funnel Matrix", to: "/core/marketing/funnels", icon: Layers },
    ],
  },
  {
    title: "Omnichannel",
    items: [
      { label: "Campaign Studio", to: "/core/marketing/campaigns", icon: Megaphone },
      { label: "Nurture Hub", to: "/core/marketing/nurture", icon: Mail },
      { label: "Social Connect", to: "/core/marketing/accounts", icon: Share2 },
      { label: "Execution Desk", to: "/core/marketing/execution", icon: Zap },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Creative Library", to: "/core/marketing/creative", icon: FileText },
      { label: "Appointment Desk", to: "/core/marketing/appointments", icon: Calendar },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/marketing/schedule", icon: Briefcase },
      { label: "Staff Portal", to: "/core/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/procurement/prs?dept=MARKETING", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=MARKETING", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/stock?dept=MARKETING", icon: Archive },
      { label: "Attendance", to: "/core/marketing/attendance", icon: Clock },
      { label: "Log", to: "/core/logs?scope=MARKETING", icon: History },
      { label: "Audit", to: "/core/audit?scope=MARKETING", icon: ShieldCheck },
      { label: "Workflow", to: "/core/workflow?scope=MARKETING", icon: GitBranch },
      { label: "Administrative", to: "/core/marketing/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/marketing/", ""), item.label]),
  ),
);

export default function MarketingWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Marketing Command"
      subtitle="Omnichannel Growth & Audience Intelligence Matrix"
      headerIcon={Link2}
      accentColor="purple"
      engineName="MARKETING ENGINE"
      pulseLabel="Growth Pulse"
      pulseIcon={Zap}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/marketing"
    />
  );
}
