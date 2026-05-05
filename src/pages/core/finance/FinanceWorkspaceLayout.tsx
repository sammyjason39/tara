import * as React from "react";
import {
  Wallet,
  HandCoins,
  LayoutGrid,
  Banknote,
  BookOpen,
  CreditCard,
  Receipt,
  FileSignature,
  Lock,
  ShieldCheck,
  RefreshCcw,
  Cpu,
  Clock,
  UserCircle,
  ShoppingCart,
  ArrowDownLeft,
  Archive,
  History,
  GitBranch,
  BarChart3,
  Scale
} from "lucide-react";
import DepartmentWorkspaceLayout, { MenuSection } from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS: MenuSection[] = [
  {
    title: "Intelligence",
    items: [
      { label: "CFO Dashboard", to: "/core/finance", icon: LayoutGrid },
      { label: "Financial Insights", to: "/core/finance/insights", icon: BarChart3 },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Money Desk", to: "/core/finance/moneydesk", icon: Banknote },
      { label: "Treasury Map", to: "/core/finance/treasury", icon: Wallet },
      { label: "Ledger Core", to: "/core/finance/ledger", icon: BookOpen },
      { label: "PayFlow Hub", to: "/core/finance/payflow", icon: RefreshCcw },
    ],
  },
  {
    title: "Transactions",
    items: [
      { label: "Receivables", to: "/core/finance/receivables", icon: HandCoins },
      { label: "Payables", to: "/core/finance/payables", icon: CreditCard },
      { label: "Invoice Capture", to: "/core/finance/invoices", icon: Receipt },
      { label: "JV Desk", to: "/core/finance/jv", icon: FileSignature },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Period Close", to: "/core/finance/close", icon: Lock },
      { label: "Audit Vault", to: "/core/finance/audit", icon: ShieldCheck },
      { label: "Policy Manager", to: "/core/finance/policy", icon: Scale },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Schedule", to: "/core/finance/schedule", icon: Lock },
      { label: "Staff Portal", to: "/core/portal", icon: UserCircle },
      { label: "Stock Request", to: "/core/procurement/prs?dept=FINANCE", icon: ShoppingCart },
      { label: "Stock Taking", to: "/core/inventory/receiving?dept=FINANCE", icon: ArrowDownLeft },
      { label: "Stock Opname", to: "/core/inventory/stock?dept=FINANCE", icon: Archive },
      { label: "Attendance", to: "/core/finance/attendance", icon: Clock },
      { label: "Log", to: "/core/logs?scope=FINANCE", icon: History },
      { label: "Audit", to: "/core/audit?scope=FINANCE", icon: ShieldCheck },
      { label: "Workflow", to: "/core/workflow?scope=FINANCE", icon: GitBranch },
      { label: "Administrative", to: "/core/finance/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    (Array.isArray(section.items) ? section.items : []).map((item) => [item.to.replace("/core/finance/", ""), item.label]),
  ),
);

export default function FinanceWorkspaceLayout() {
  return (
    <DepartmentWorkspaceLayout
      title="Finance Command"
      subtitle="Strategic Capital & Fiscal Intelligence Matrix"
      headerIcon={Wallet}
      accentColor="emerald"
      engineName="FINANCE ENGINE"
      pulseLabel="Fiscal Pulse"
      pulseIcon={Scale}
      sections={SECTIONS}
      routeLabels={ROUTE_LABELS}
      basePath="/core/finance"
    />
  );
}
