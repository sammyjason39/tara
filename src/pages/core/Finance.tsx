import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  FileText,
  Receipt,
  ShieldCheck,
  Wallet,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services";
import { reportingService } from "@/core/services/reportingService";
import { useToast } from "@/hooks/use-toast";

const statusTone = (status: string) => {
  if (status === "Complete" || status === "Ready") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "Attention" || status === "Overdue") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
};

interface FinanceMetric {
  id: string;
  label: string;
  value: string | number;
  delta?: string;
}

interface BillingItem {
  id: string;
  title: string;
  due: string;
  amount: string | number;
  status: string;
}

interface TaxReport {
  id: string;
  title: string;
  due: string;
  status: string;
}

interface AuditItem {
  id: string;
  label: string;
  note: string;
  status: string;
}

interface RetailContribution {
  weeklyRevenue: string | number;
  ordersToday: number;
  avgBasketValue: string | number;
  topCategory: string;
}

export default function CoreFinance() {
  const session = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    financialSummary: FinanceMetric[];
    billingQueue: BillingItem[];
    taxReports: TaxReport[];
    auditReadiness: AuditItem[];
    moduleContributions?: {
      retail?: RetailContribution;
    };
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await financeService.getFinanceOverview(
          session.tenant_id,
          session,
        );
        setData(res);
      } catch (e) {
        console.error("Failed to load finance overview", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading finance overview...</p>
      </div>
    );
  }

  const {
    financialSummary,
    billingQueue,
    taxReports,
    auditReadiness,
    moduleContributions,
  } = data;
  const retailStats = moduleContributions?.retail;

  const handleDownloadTaxPackage = async () => {
    try {
      toast({ title: "Tax Package", description: "Generating full compliance documentation..." });
      await reportingService.generateReport(session, { report_type: 'TAX_COMPLIANCE', format: 'PDF' });
      toast({ title: "Generation Queued", description: "Check the Reports page for status." });
    } catch (err) {
      toast({ title: "Error", description: "Reporting engine unavailable.", variant: "destructive" });
    }
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Finance & Treasury"
          subtitle="Consolidated view of tenant financial health and compliance."
        />
      }
    >
      <div className="space-y-6">
        <WorkspacePanel
          title="Consolidated statement"
          description="High-level metrics across all business units."
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {financialSummary.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight">
                    {item.value}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{item.delta}</span>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        {/* --- MODULE CONTRIBUTIONS --- */}
        {retailStats && (
          <WorkspacePanel
            title="Module Contributions: Retail Operations"
            description="Live revenue and performance metrics pulled dynamically from the active Retail module."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-5 dark:border-blue-900/30 dark:bg-blue-950/20">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
                  <span className="text-sm font-medium">
                    Weekly Retail Revenue
                  </span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
                    {retailStats.weeklyRevenue}
                  </span>
                </div>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Retail orders this week
                </div>
              </div>

              <div className="rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Orders Today</span>
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-semibold tracking-tight">
                    {retailStats.ordersToday}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Processed across all stores
                </div>
              </div>

              <div className="rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Avg Basket Value</span>
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-semibold tracking-tight">
                    {retailStats.avgBasketValue}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Weekly rolling average
                </div>
              </div>

              <div className="rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Top Category</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <span className="text-xl font-semibold tracking-tight line-clamp-1 py-1">
                    {retailStats.topCategory}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Highest grossing this week
                </div>
              </div>
            </div>
          </WorkspacePanel>
        )}
        {/* ----------------------------- */}

        <div className="grid gap-6 md:grid-cols-2">
          <WorkspacePanel
            title="Billing queue"
            description="Pending receivables and payables requiring action."
          >
            <div className="space-y-4">
              {billingQueue.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.due}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.amount}</p>
                      <Badge
                        variant="secondary"
                        className={`mt-1 ${statusTone(item.status)}`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={() => toast({ title: "Full Queue", description: "Redirecting to detailed billing ledger..." })} variant="outline" className="w-full">
                View full queue
              </Button>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Tax reporting"
            description="Compliance submissions and filing deadlines."
          >
            <div className="space-y-4">
              {taxReports.map((report) => (
                <div key={report.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {report.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.due}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusTone(report.status)}
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Filing summary
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Tax documentation package ready
                </div>
                <Button onClick={handleDownloadTaxPackage} size="sm" variant="outline">
                  Download
                </Button>
              </div>
            </div>
          </WorkspacePanel>
        </div>

        <WorkspacePanel
          title="Audit readiness"
          description="Evidence and controls for upcoming audits."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {auditReadiness.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  </div>
                  <Badge variant="outline" className={statusTone(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </PageShell>
  );
}
