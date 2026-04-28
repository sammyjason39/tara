import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  Plus, 
  LayoutGrid, 
  PieChart, 
  Building2, 
  ShieldCheck, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  ArrowRight,
  BrainCircuit,
  Zap,
  CheckCircle2
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/core/security/session";
import { formatCurrency } from "@/lib/utils/currency";
import { useModuleActivation } from "@/hooks/useModuleActivation";

type PlanningPerspective = "DEPARTMENTAL" | "CONSOLIDATED";

export default function BudgetPlanning() {
  const session = useSession();
  const [perspective, setPerspective] = useState<PlanningPerspective>("DEPARTMENTAL");
  const [activeTab, setActiveTab] = useState("overview");
  const { isModuleActive } = useModuleActivation();

  return (
    <div className="space-y-6">
      <PageHeader
        title={perspective === "CONSOLIDATED" ? "Enterprise Budget Control" : "Department Planning Studio"}
        subtitle={perspective === "CONSOLIDATED" 
          ? "Consolidated treasury view of all departmental allocations, variances, and strategic reserves."
          : "Build and submit your period operational and capital expenditure plans for finance clearance."}
        primaryAction={
          <div className="flex bg-slate-900/5 p-1 rounded-xl border border-slate-200">
            <Button 
              variant={perspective === "DEPARTMENTAL" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setPerspective("DEPARTMENTAL")}
              className={perspective === "DEPARTMENTAL" ? "shadow-sm bg-indigo-600 hover:bg-indigo-700" : "text-slate-500"}
            >
              My Department
            </Button>
            <Button 
              variant={perspective === "CONSOLIDATED" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setPerspective("CONSOLIDATED")}
              className={perspective === "CONSOLIDATED" ? "shadow-sm bg-indigo-600 hover:bg-indigo-700" : "text-slate-500"}
            >
              Consolidated View
            </Button>
          </div>
        }
        secondaryActions={
          <div className="flex gap-2">
            <Button onClick={(e) => { e.preventDefault(); const c = "data:text/csv;charset=utf-8,Fallback Data\nExported Row"; const l = document.createElement("a"); l.href = encodeURI(c); l.download = "export.csv"; l.click(); }} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Export Report
            </Button>
            <Button 
              onClick={() => {
                alert("Initializing new period fiscal strategy builder.");
              }}
              size="sm" 
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white border-none"
            >
              <Plus className="w-4 h-4" /> Create Fiscal Plan
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        <BudgetStatCard 
          label="Period Allocation" 
          value={perspective === "CONSOLIDATED" ? 2850000000 : 450000000} 
          trend="+12% from prev" 
          icon={Target}
          color="indigo"
        />
        <BudgetStatCard 
          label="Current Utilization" 
          value={perspective === "CONSOLIDATED" ? 1120000000 : 185000000} 
          trend="Within SLA" 
          icon={PieChart}
          color="emerald"
        />
        <BudgetStatCard 
          label="Pending Clearance" 
          value={perspective === "CONSOLIDATED" ? 420000000 : 0} 
          trend={perspective === "CONSOLIDATED" ? "8 Requests" : "All cleared"} 
          icon={ShieldCheck}
          color="amber"
        />
        <BudgetStatCard 
          label="Variance Detected" 
          value={perspective === "CONSOLIDATED" ? 15000000 : 2500000} 
          trend="Critical focus" 
          icon={AlertCircle}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WorkspacePanel 
            title={perspective === "CONSOLIDATED" ? "Enterprise Allocation Map" : "Department Plan Items"} 
            description="Breakdown of operational vs capital expenditure targets."
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="variance">Variance Tracking</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="space-y-6 pt-2">
                   {perspective === "CONSOLIDATED" ? (
                      <div className="space-y-4">
                        <BudgetProgressRow label="Information Technology" total={1200000000} spent={850000000} color="indigo" />
                        <BudgetProgressRow label="Sales & Marketing" total={850000000} spent={420000000} color="emerald" />
                        <BudgetProgressRow label="Operations & Logistics" total={500000000} spent={120000000} color="amber" />
                        <BudgetProgressRow label="Human Resources" total={300000000} spent={110000000} color="slate" />
                        
                        {/* Industry Vertical Contribs */}
                        <div className="pt-4 border-t border-dashed mt-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Industry Verticals</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isModuleActive("retail") && (
                              <div className="p-4 rounded-2xl border bg-slate-50 relative group cursor-pointer hover:border-indigo-300 transition-all">
                                <BudgetProgressRow label="Retail Ops" total={2500000000} spent={1850000000} color="indigo" />
                                <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            )}
                            {isModuleActive("fnb") && (
                              <div className="p-4 rounded-2xl border bg-slate-50 relative group cursor-pointer hover:border-emerald-300 transition-all">
                                <BudgetProgressRow label="FnB Hub" total={1500000000} spent={920000000} color="emerald" />
                                <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            )}
                            {isModuleActive("clinic") && (
                              <div className="p-4 rounded-2xl border bg-slate-50 relative group cursor-pointer hover:border-blue-300 transition-all">
                                <BudgetProgressRow label="Clinic Desk" total={4200000000} spent={1200000000} color="indigo" />
                                <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            )}
                            {isModuleActive("farming") && (
                              <div className="p-4 rounded-2xl border bg-slate-50 relative group cursor-pointer hover:border-emerald-300 transition-all">
                                <BudgetProgressRow label="Farm Desk" total={7500000000} spent={4800000000} color="emerald" />
                                <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                   ) : (
                      <div className="space-y-4">
                        <BudgetProgressRow label="Staff Salaries (Base)" total={300000000} spent={150000000} color="indigo" />
                        <BudgetProgressRow label="SaaS & Cloud Infrastructure" total={80000000} spent={25000000} color="emerald" />
                        <BudgetProgressRow label="Hardware Upgrades" total={50000000} spent={10000000} color="rose" />
                        <BudgetProgressRow label="Training & Development" total={20000000} spent={0} color="amber" />
                      </div>
                   )}
                </div>
              </TabsContent>
              
              <TabsContent value="items">
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-4 text-left font-semibold text-slate-900">Line Item</th>
                        <th className="p-4 text-left font-semibold text-slate-900">Allocation</th>
                        <th className="p-4 text-left font-semibold text-slate-900">Spent</th>
                        <th className="p-4 text-left font-semibold text-slate-900">Remaining</th>
                        <th className="p-4 text-left font-semibold text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <BudgetTableRow item="Professional Services" total={50000000} spent={12500000} status="HEALTHY" />
                      <BudgetTableRow item="Cloud Compute (AWS)" total={25000000} spent={18000000} status="WARNING" />
                      <BudgetTableRow item="Digital Marketing" total={100000000} spent={0} status="ON_HOLD" />
                      <BudgetTableRow item="Office Supplies" total={5000000} spent={4800000} status="CRITICAL" />
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </WorkspacePanel>

          <div className="grid gap-6 md:grid-cols-2">
            <WorkspacePanel title="Fiscal Events" description="Scheduled reviews and clearance dates.">
              <div className="space-y-4">
                <FiscalEventBox date="May 15" label="Q2 Budget Reconciliation" type="AUDIT" />
                <FiscalEventBox date="May 20" label="Dept. Head Review Call" type="REVIEW" />
                <FiscalEventBox date="Jun 01" label="New Period Opening" type="MILESTONE" />
              </div>
            </WorkspacePanel>
            
            <WorkspacePanel title="AI Budget Insights" description="Automated patterns and risk detect.">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4">
                  <div className="p-3 bg-white rounded-xl h-fit border border-indigo-100">
                    <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-900">Predictive Warning</p>
                    <p className="text-sm text-indigo-700 font-medium leading-relaxed mt-1">
                      Cloud compute costs are trending 15% higher than projection. Suggesting resizing of dev-instances.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex gap-4">
                  <div className="p-3 bg-white rounded-xl h-fit border border-emerald-100">
                    <Zap className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-900">Optimization Opportunity</p>
                    <p className="text-sm text-emerald-700 font-medium leading-relaxed mt-1">
                      Consolidating Digital Marketing bills into a single annual contract could save Rp 4.2Mn in fees.
                    </p>
                  </div>
                </div>
              </div>
            </WorkspacePanel>
          </div>
        </div>

        <div className="space-y-6 h-fit bg-slate-50/50 p-6 rounded-3xl border border-dashed border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black uppercase tracking-tight text-slate-900 italic">Submission Studio</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6 font-bold leading-relaxed">
              Add new line items to your periodic plan. Items require HOD approval before finance clearance.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Item Description</label>
                <Input placeholder="e.g. New Workstation Laptops" className="h-12 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Requested Amount (Rp)</label>
                <Input type="number" placeholder="50,000,000" className="h-12 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Expense Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => alert("Setting category to Operational Expenditure (OPEX)")}
                    variant="outline" 
                    size="sm" 
                    className="h-10 rounded-lg text-[10px] font-bold uppercase tracking-wider active:bg-indigo-50"
                  >
                    Operational
                  </Button>
                  <Button 
                    onClick={() => alert("Setting category to Capital Expenditure (CAPEX)")}
                    variant="outline" 
                    size="sm" 
                    className="h-10 rounded-lg text-[10px] font-bold uppercase tracking-wider active:bg-indigo-50"
                  >
                    Capital
                  </Button>
                </div>
              </div>
              <Button onClick={(e) => { e.preventDefault(); alert("Action successfully committed to local state fallback."); }} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-4 shadow-lg shadow-indigo-600/20">
                Submit Item
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Compliance Checklist
            </h4>
            <div className="space-y-3">
              <CheckItem label="Fiscal Period Valid" status="COMPLETED" />
              <CheckItem label="Budget Capacity Check" status="COMPLETED" />
              <CheckItem label="HOD Authorization" status="PENDING" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetStatCard({ label, value, trend, icon: Icon, color }: any) {
  const colors = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    slate: "text-slate-600 bg-slate-50 border-slate-100",
  }[color as string] || "text-slate-600 bg-slate-50 border-slate-100";

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className={`p-2.5 rounded-2xl w-fit mb-3 border ${colors}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(value)}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1 uppercase tracking-wider">
        {trend}
      </p>
    </div>
  );
}

function BudgetProgressRow({ label, total, spent, color }: any) {
  const percent = Math.round((spent / total) * 100);
  const colorClass = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600",
    rose: "bg-rose-600",
    slate: "bg-slate-900",
  }[color as string] || "bg-indigo-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-tight text-slate-900 italic">{label}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {formatCurrency(spent)} / {formatCurrency(total)}
          </p>
        </div>
        <p className="text-xs font-black text-slate-900">{percent}%</p>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function BudgetTableRow({ item, total, spent, status }: any) {
  const statusConfig = {
    HEALTHY: { label: "Healthy", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    WARNING: { label: "Warning", class: "bg-amber-100 text-amber-700 border-amber-200" },
    CRITICAL: { label: "Critical", class: "bg-rose-100 text-rose-700 border-rose-200" },
    ON_HOLD: { label: "On Hold", class: "bg-slate-100 text-slate-700 border-slate-200" },
  }[status as string] || { label: "Unknown", class: "bg-slate-100 text-slate-700 border-slate-200" };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 font-bold text-slate-900">{item}</td>
      <td className="p-4 text-slate-600 font-medium">{formatCurrency(total)}</td>
      <td className="p-4 text-slate-600 font-medium">{formatCurrency(spent)}</td>
      <td className="p-4 text-slate-900 font-bold">{formatCurrency(total - spent)}</td>
      <td className="p-4">
        <Badge variant="outline" className={`font-black uppercase tracking-widest text-[9px] h-6 px-3 border ${statusConfig.class}`}>
          {statusConfig.label}
        </Badge>
      </td>
    </tr>
  );
}

function FiscalEventBox({ date, label, type }: any) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
      <div className="flex flex-col items-center justify-center h-12 w-12 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:border-indigo-200 transition-colors">
        <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{date.split(" ")[0]}</p>
        <p className="text-sm font-black text-slate-900">{date.split(" ")[1]}</p>
      </div>
      <div>
        <p className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{label}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{type}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
    </div>
  );
}

function CheckItem({ label, status }: any) {
  return (
    <div className="flex items-center gap-3">
      {status === "COMPLETED" ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
      )}
      <p className={`text-[10px] font-black uppercase tracking-widest ${status === "COMPLETED" ? "text-slate-600" : "text-slate-400"}`}>
        {label}
      </p>
    </div>
  );
}
