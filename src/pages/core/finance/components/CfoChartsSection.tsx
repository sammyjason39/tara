import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart,
} from "recharts";
import { DollarSign } from "lucide-react";
import {
  CFO_LIQUIDITY_DATA, CFO_AR_AGING_DATA, CFO_AP_PIPELINE_DATA,
  CFO_ASSET_ALLOCATION, COMPLIANCE_RADAR_DATA, CHART_TOOLTIP_STYLE,
} from "./dashboard-data";
import { SimpleKpi, SectionLabel } from "./DashboardPrimitives";
import { cn } from "@/lib/utils";

const fmt = (v: number | string) => [`Rp ${v}M`];

export function CfoChartsSection({ summaryData }: { summaryData?: any }) {
  return (
    <section>
      <SectionLabel
        label="CFO Macro Analytics"
        sub="Liquidity, receivables, accounts payable & capital structure"
      />

      {/* ── Row 1: Liquidity + AR Aging ─────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] mb-5">
        <WorkspacePanel
          title="Treasury Liquidity & 6-Month Runway"
          description="Net cash reserve vs aggregate inflows and outflows (Rp M)"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="grid grid-cols-3 gap-4 my-5 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
            <SimpleKpi label="Inflows (Period)"  value={summaryData ? `Rp ${Number(summaryData.revenue).toLocaleString()}` : "Loading..."}  color="text-emerald-600" />
            <SimpleKpi label="Outflows (Period)" value={summaryData ? `Rp ${Number(summaryData.expense).toLocaleString()}` : "Loading..."}  color="text-rose-500"    />
            <SimpleKpi label="Net Reserve"    value={summaryData ? `Rp ${Number(summaryData.netProfit).toLocaleString()}` : "Loading..."} color="text-indigo-600"  />
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={CFO_LIQUIDITY_DATA}>
                <defs>
                  <linearGradient id="gReserve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "#94a3b8" }} dx={-8} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={fmt} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                <Area type="monotone" dataKey="reserve" name="Cash Reserve" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#gReserve)" />
                <Bar dataKey="inflows"  name="Inflows"  fill="#10b981" opacity={0.55} radius={[4,4,0,0]} barSize={14} />
                <Bar dataKey="outflows" name="Outflows" fill="#f43f5e" opacity={0.55} radius={[4,4,0,0]} barSize={14} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="A/R Aging Report"
          description="Outstanding receivables by age — flags collection risk"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between my-5">
            <div>
              <p className="text-2xl font-black tracking-tighter text-slate-900">Rp 785M</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Total Outstanding</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-rose-500">Rp 90M</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mt-0.5">High Risk (&gt;60d)</p>
            </div>
          </div>
          <div className="h-[248px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CFO_AR_AGING_DATA} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={fmt} />
                <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]} barSize={22}>
                  {CFO_AR_AGING_DATA.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>
      </div>

      {/* ── Row 2: AP Pipeline + Asset Allocation + Compliance Radar ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <WorkspacePanel
          title="Accounts Payable Pipeline"
          description="Outstanding liabilities by category — due vs overdue (Rp M)"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="h-[280px] w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CFO_AP_PIPELINE_DATA} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} width={76} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={fmt} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "8px" }} />
                <Bar dataKey="due"     name="Due"     stackId="a" fill="#6366f1" barSize={18} />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#f43f5e" barSize={18} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Enterprise Asset Allocation"
          description="Capital deployment breakdown across liquidity classes"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          <div className="h-[280px] w-full relative mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CFO_ASSET_ALLOCATION} cx="50%" cy="44%" innerRadius={70}
                  outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {CFO_ASSET_ALLOCATION.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
                <Legend verticalAlign="bottom" iconType="circle"
                  wrapperStyle={{ fontSize: "11px", fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ marginTop: "-46px" }}
            >
              <DollarSign className="h-6 w-6 text-slate-200 mb-0.5" />
              <span className="text-lg font-black text-slate-800">
                {summaryData ? `Rp ${Number(summaryData.kpis?.totalAssets || 0).toLocaleString()}` : "Rp 11.2B"}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Assets</span>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Compliance Health Radar"
          description="Cross-departmental governance adherence scoring"
          className="rounded-3xl border-slate-100 bg-white shadow-sm"
        >
          {/* Score pills */}
          <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
            {COMPLIANCE_RADAR_DATA.map((d) => (
              <span
                key={d.subject}
                className={cn(
                  "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide",
                  d.A >= 85 ? "bg-emerald-50 text-emerald-600" :
                  d.A >= 75 ? "bg-amber-50 text-amber-600"   :
                              "bg-rose-50 text-rose-500",
                )}
              >
                {d.subject} {d.A}%
              </span>
            ))}
          </div>
          <div className="h-[232px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={COMPLIANCE_RADAR_DATA}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A"
                  stroke="hsl(var(--primary))" fill="hsl(var(--primary))"
                  fillOpacity={0.2} strokeWidth={2} />
                <ChartTooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </WorkspacePanel>
      </div>
    </section>
  );
}
