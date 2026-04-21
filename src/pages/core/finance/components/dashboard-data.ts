/* ─── Shared synthetic data & chart constants for MoneyDesk dashboard ─── */

export const CFO_LIQUIDITY_DATA = [
  { month: "Nov", inflows: 380, outflows: 340, reserve: 720 },
  { month: "Dec", inflows: 420, outflows: 380, reserve: 760 },
  { month: "Jan", inflows: 510, outflows: 420, reserve: 850 },
  { month: "Feb", inflows: 480, outflows: 395, reserve: 935 },
  { month: "Mar", inflows: 620, outflows: 510, reserve: 1045 },
  { month: "Apr", inflows: 710, outflows: 590, reserve: 1165 },
];

export const CFO_AP_PIPELINE_DATA = [
  { name: "Suppliers",   due: 320, overdue: 45 },
  { name: "Contractors", due: 180, overdue: 20 },
  { name: "Utilities",   due: 95,  overdue: 5  },
  { name: "Software",    due: 210, overdue: 30 },
  { name: "Payroll",     due: 850, overdue: 0  },
  { name: "Tax & Gov",   due: 120, overdue: 60 },
];

export const CFO_AR_AGING_DATA = [
  { name: "Current", amount: 420, fill: "#10b981" },
  { name: "1–30d",   amount: 180, fill: "#6366f1" },
  { name: "31–60d",  amount: 95,  fill: "#f59e0b" },
  { name: "61–90d",  amount: 55,  fill: "#f97316" },
  { name: ">90d",    amount: 35,  fill: "#ef4444" },
];

export const CFO_ASSET_ALLOCATION = [
  { name: "Operating Cash", value: 35, color: "#10b981" },
  { name: "Fixed Assets",   value: 40, color: "#6366f1" },
  { name: "Investments",    value: 15, color: "#0ea5e9" },
  { name: "Reserve",        value: 10, color: "#f59e0b" },
];

export const CTO_OPEX_BURN = [
  { month: "Nov", budget: 180, actual: 165, forecast: 170 },
  { month: "Dec", budget: 180, actual: 190, forecast: 185 },
  { month: "Jan", budget: 200, actual: 195, forecast: 200 },
  { month: "Feb", budget: 200, actual: 178, forecast: 190 },
  { month: "Mar", budget: 220, actual: 215, forecast: 220 },
  { month: "Apr", budget: 220, actual: 205, forecast: 218 },
];

export const COMPLIANCE_RADAR_DATA = [
  { subject: "Audit",       A: 88, fullMark: 100 },
  { subject: "Policy",      A: 76, fullMark: 100 },
  { subject: "Finance",     A: 92, fullMark: 100 },
  { subject: "HR",          A: 84, fullMark: 100 },
  { subject: "IT",          A: 70, fullMark: 100 },
  { subject: "Procurement", A: 80, fullMark: 100 },
];

export const BUDGET_VS_ACTUAL = [
  { dept: "Finance", budget: 500, actual: 460 },
  { dept: "HR",      budget: 320, actual: 340 },
  { dept: "IT",      budget: 280, actual: 255 },
  { dept: "Ops",     budget: 410, actual: 395 },
  { dept: "Sales",   budget: 380, actual: 420 },
];

export const WORKFLOW_VELOCITY_DATA = [
  { name: "Mon", approvals: 4,  tasks: 2, volume: 2400 },
  { name: "Tue", approvals: 3,  tasks: 1, volume: 1398 },
  { name: "Wed", approvals: 12, tasks: 5, volume: 9800 },
  { name: "Thu", approvals: 5,  tasks: 3, volume: 3908 },
  { name: "Fri", approvals: 2,  tasks: 8, volume: 4800 },
  { name: "Sat", approvals: 4,  tasks: 1, volume: 3800 },
  { name: "Sun", approvals: 6,  tasks: 2, volume: 4300 },
];

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: "1rem",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.10)",
    padding: "12px 16px",
    background: "white",
  },
  itemStyle: { fontWeight: 700, fontSize: "12px" },
};
