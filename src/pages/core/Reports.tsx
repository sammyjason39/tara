import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { EmptyState } from "@/components/shared/AsyncState";
import { formatDateTime, safeText } from "@/lib/format";
import {
  Download,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  Users,
  Layers,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Clock,
  Plus,
  Activity
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { reportingService } from "@/core/services/reportingService";
import DepartmentWorkspaceLayout from "@/components/layouts/DepartmentWorkspaceLayout";

interface ActiveJob {
  id: string;
  status: string;
  progress: number;
  report_type: string;
  error?: string;
}

const categories = [
  {
    id: "finance",
    title: "Finance",
    description: "Revenue, margin, cashflow, and billing performance.",
    icon: FileSpreadsheet,
  },
  {
    id: "ops",
    title: "Operations",
    description: "Operational throughput and SLA performance.",
    icon: Layers,
  },
  {
    id: "hr",
    title: "HR",
    description: "Headcount, staffing, and attendance analytics.",
    icon: Users,
  },
  {
    id: "compliance",
    title: "Compliance",
    description: "Audit trails, risk monitoring, and regulatory reporting.",
    icon: ShieldCheck,
  },
];

interface RecentReport {
  id: string;
  title: string;
  owner: string;
  updated: string;
  status: string;
}

interface ScheduledReport {
  id: string;
  title: string;
  cadence: string;
  recipients: string;
}

const SECTIONS = [
  {
    title: "ANALYTICS",
    items: [
      { id: 'reports', icon: BarChart3, label: "All Reports", to: "/core/reports" },
      { id: 'schedules', icon: Clock, label: "Schedules", to: "/core/reports/schedules" },
    ]
  }
];

export default function CoreReports() {
  const session = useSession();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(false);
  // Real_Data: recent/scheduled reports are bound to the tenant scope. No
  // Placeholder_Data — zero records render the Empty_State (Requirements 13.4, 13.5).
  const [reports, setReports] = useState<RecentReport[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([]);

  // Poll for job status
  useEffect(() => {
    const processingJobs = (Array.isArray(activeJobs) ? activeJobs : []).filter(j => j.status === 'PENDING' || j.status === 'PROCESSING');
    if (processingJobs.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        (Array.isArray(processingJobs) ? processingJobs : []).map(async (job) => {
          try {
            const status = await reportingService.getJobStatus(session, job.id);
            return { ...job, status: status.status, progress: status.progress, error: status.error };
          } catch (err) {
            console.error("Job check failed:", job.id, err);
            return { ...job, status: 'FAILED', error: 'Service Unavailable' };
          }
        })
      );

      setActiveJobs(prev => {
        const next = [...prev];
        updates.forEach(update => {
          const idx = next.findIndex(j => j.id === update.id);
          if (idx !== -1) next[idx] = update;
        });
        return next;
       });
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobs, session]);

  const handleGenerate = async (type: string, format: string) => {
    setLoading(true);
    try {
      const res = await reportingService.generateReport(session, { 
        report_type: type.toUpperCase().replace(/\s+/g, '_'), 
        format 
      });
      
      if (res.success) {
        setActiveJobs(prev => [{
          id: res.job_id,
          status: 'PENDING',
          progress: 0,
          report_type: type
        }, ...prev]);
      }
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (jobId: string) => {
    reportingService.downloadReport(session, jobId);
  };

  // Bind the "recent reports" view to Real_Data: completed generation jobs in
  // this tenant scope. When none have completed, the view shows the Empty_State.
  useEffect(() => {
    const completed = (Array.isArray(activeJobs) ? activeJobs : [])
      .filter((job) => job.status === "COMPLETED")
      .map<RecentReport>((job) => ({
        id: job.id,
        title: job.report_type,
        owner: safeText(session.role),
        updated: formatDateTime(new Date()),
        status: "Ready",
      }));
    if (completed.length > 0) {
      setReports((prev) => {
        const existing = new Set(prev.map((r) => r.id));
        const merged = [...completed.filter((r) => !existing.has(r.id)), ...prev];
        return merged;
      });
    }
  }, [activeJobs, session.role]);

  const mainContent = (
    <div className="space-y-6 p-6">
      {/* --- ACTIVE JOBS PANEL --- */}
      {activeJobs.length > 0 && (
        <WorkspacePanel 
          title="Active Generation Jobs" 
          description="Real-time progress of your requested reports."
        >
          <div className="space-y-3">
            {(Array.isArray(activeJobs) ? activeJobs : []).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-3">
                  {job.status === 'PENDING' || job.status === 'PROCESSING' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : job.status === 'COMPLETED' ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{job.report_type} ({job.id.slice(0, 8)})</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{job.progress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === 'FAILED' ? 'destructive' : 'outline'}>
                    {job.status}
                  </Badge>
                  {job.status === 'COMPLETED' && (
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(job.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      )}

      <WorkspacePanel
        title="Report templates"
        description="Click a format to queue generation."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(Array.isArray(categories) ? categories : []).map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-lg border bg-muted/50 p-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleGenerate(category.title, 'PDF')}
                      disabled={loading}
                    >
                      PDF
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleGenerate(category.title, 'EXCEL')}
                      disabled={loading}
                    >
                      XLS
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">{category.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <WorkspacePanel
          title="Recent reports"
          description="Latest generated reports across teams."
        >
          <div className="space-y-4">
            {reports.length === 0 ? (
              <EmptyState
                title="No reports generated yet"
                description="Generated reports for this tenant will appear here. Queue one from a template above."
              />
            ) : (
              (Array.isArray(reports) ? reports : []).map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{safeText(report.title)}</p>
                  <p className="text-xs text-muted-foreground">
                    {safeText(report.owner)} • {safeText(report.updated)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{safeText(report.status)}</Badge>
                  <Button 
                    onClick={() => handleGenerate(report.title, 'PDF')} 
                    variant="outline" 
                    size="sm"
                    disabled={loading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </div>
            ))
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Scheduled reports"
          description="Automated delivery for recurring stakeholders."
        >
          <div className="space-y-4">
            {scheduled.length === 0 ? (
              <EmptyState
                title="No scheduled deliveries"
                description="Recurring report deliveries for this tenant will appear here once configured."
              />
            ) : (
              (Array.isArray(scheduled) ? scheduled : []).map((schedule) => (
              <div key={schedule.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {safeText(schedule.title)}
                    </p>
                    <p className="text-xs text-muted-foreground">{safeText(schedule.cadence)}</p>
                    <p className="text-xs text-muted-foreground">
                      Recipients: {safeText(schedule.recipients)}
                    </p>
                  </div>
                  <Button disabled title="Not available yet" size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </div>
            ))
            )}
            <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Schedule a new report delivery
              </div>
              <Button disabled title="Not available yet" size="sm">Create schedule</Button>
            </div>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );

  return (
    <DepartmentWorkspaceLayout
      title="Reports & Analytics"
      subtitle="Generate, schedule, and export executive-ready reports."
      headerIcon={BarChart3}
      accentColor="indigo"
      engineName="ANALYTICS_ENGINE"
      pulseLabel="Report Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={{}}
      basePath="/core/reports"
      headerActions={
        <div className="flex gap-2">
          <Button 
            disabled 
            title="Not available yet" 
            variant="outline"
            className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest"
          >
            Manage schedules
          </Button>
          <Button 
            onClick={() => handleGenerate("Executive KPI Summary", "PDF")}
            className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20"
          >
            <Plus className="h-3 w-3 mr-2" /> New report
          </Button>
        </div>
      }
    >
      {mainContent}
    </DepartmentWorkspaceLayout>
  );
}
