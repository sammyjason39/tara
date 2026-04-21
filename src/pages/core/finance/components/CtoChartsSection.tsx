import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend, ComposedChart, Line,
} from "recharts";
import {
  CTO_OPEX_BURN, BUDGET_VS_ACTUAL, WORKFLOW_VELOCITY_DATA, CHART_TOOLTIP_STYLE,
} from "./dashboard-data";
import { SimpleKpi, SectionLabel } from "./DashboardPrimitives";

interface CtoProps {
  pendingApprovals: number;
  processedPayments: number;
}

const fmtM = (v: number | string) => [`Rp ${v}M`];

export function CtoChartsSection({ pendingApprovals, processedPayments }: CtoProps) {
  return (
    <section>
      <SectionLabel
        label="CTO & Executive Analytics"
        sub="Technology spend, budget burn & workflow efficiency"
      />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_1fr]">

        {/* ── OPEX Burn ──────────────────────────────────────────── */}
        <WorkspacePanel
          title="OPEX Budget Burn (Technology)"
          description="IT / SaaS budget vs actual spend & forecast (Rp M)"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-100 my-5">
            <SimpleKpi label="Budget (Apr)"  value="Rp 220M" color="text-slate-700"    />
            <div className="h-8 w-px bg-slate-200" />
            <SimpleKpi label="Actual (Apr)"  value="Rp 205M" color="text-emerald-600"  />
            <div className="h-8 w-px bg-slate-200" />
            <SimpleKpi label="Variance"      value="-6.8%"   color="text-emerald-600"  />
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={CTO_OPEX_BURN}>
                <defs>
                  <linearGradient id="gBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} dx={-8} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={fmtM} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                <Area type="monotone" dataKey="budget" name="Budget"
                  stroke="#6366f1" strokeWidth={2} fill="url(#gBudget)" strokeDasharray="6 3" />
                <Bar dataKey="actual" name="Actual" fill="#10b981" opacity={0.7}
                  radius={[4,4,0,0]} barSize={16} />
                <Line type="monotone" dataKey="forecast" name="Forecast"
                  stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>

        {/* ── Budget vs Actual ────────────────────────────────────── */}
        <WorkspacePanel
          title="Budget vs. Actual by Dept"
          description="Over-run detection — red bar = budget exceeded"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="h-[320px] w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BUDGET_VS_ACTUAL} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="dept" type="category" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} width={48} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={fmtM} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "8px" }} />
                <Bar dataKey="budget" name="Budget" fill="#e2e8f0" barSize={18} />
                <Bar dataKey="actual" name="Actual" barSize={18} radius={[0,4,4,0]}>
                  {BUDGET_VS_ACTUAL.map((e, i) => (
                    <Cell key={i} fill={e.actual > e.budget ? "#f43f5e" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>

        {/* ── Workflow Velocity ───────────────────────────────────── */}
        <WorkspacePanel
          title="Workflow Request Velocity"
          description="7-day approval throughput and task pipeline — live"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3 text-center">
              <p className="text-2xl font-black text-primary">{pendingApprovals}</p>
              <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-0.5">Pending</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-2xl font-black text-emerald-600">{processedPayments}</p>
              <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">Processed</p>
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WORKFLOW_VELOCITY_DATA}>
                <defs>
                  <linearGradient id="gApprove" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gTask" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} dx={-8} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="approvals" name="Approvals"
                  stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#gApprove)" />
                <Area type="monotone" dataKey="tasks" name="Tasks"
                  stroke="#10b981" strokeWidth={3} fill="url(#gTask)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>

      </div>
    </section>
  );
}
