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
  BarChart3,
  Settings2,
  Scale,
  RefreshCcw,
  Cpu
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
      { label: "Staff Schedule", to: "/core/finance/schedule", icon: Settings2 },
      { label: "Administration", to: "/core/finance/admin", icon: Cpu },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.to.replace("/core/finance/", ""), item.label]),
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
