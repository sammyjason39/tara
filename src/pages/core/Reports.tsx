import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
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
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { reportingService } from "@/core/services/reportingService";

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

const recentReports = [
  {
    id: "rep-1",
    title: "Executive KPI Summary",
    owner: "Finance Ops",
    updated: "Today, 09:40",
    status: "Ready",
  },
  {
    id: "rep-2",
    title: "Regional Operational Scorecard",
    owner: "Ops Analytics",
    updated: "Yesterday, 18:22",
    status: "Ready",
  },
  {
    id: "rep-3",
    title: "Quarterly Access Review",
    owner: "Security",
    updated: "Jan 30, 2026",
    status: "Draft",
  },
];

const scheduledReports = [
  {
    id: "sch-1",
    title: "Weekly Finance Digest",
    cadence: "Every Monday 07:00",
    recipients: "Finance Leadership",
  },
  {
    id: "sch-2",
    title: "Monthly Compliance Pack",
    cadence: "1st of month 08:00",
    recipients: "Risk & Compliance",
  },
  {
    id: "sch-3",
    title: "Daily Ops Pulse",
    cadence: "Daily 06:00",
    recipients: "Operations Command",
  },
];

export default function CoreReports() {
  const session = useSession();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState(recentReports); // Fallback to mock for UI baseline

  // Poll for job status
  useEffect(() => {
    const processingJobs = activeJobs.filter(j => j.status === 'PENDING' || j.status === 'PROCESSING');
    if (processingJobs.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        processingJobs.map(async (job) => {
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

  return (
    <PageShell
      header={
        <PageHeader
          title="Reports & Analytics"
          subtitle="Generate, schedule, and export executive-ready reports."
          primaryAction={<Button onClick={(e) => { e.preventDefault(); alert("Detailed View:\n\nMetadata: " + (typeof window !== "undefined" ? window.location.pathname : "N/A")); }}>New report</Button>}
          secondaryActions={<Button disabled title="Not available yet" variant="outline">Manage schedules</Button>}
        />
      }
    >
      <div className="space-y-6">
        {/* --- ACTIVE JOBS PANEL --- */}
        {activeJobs.length > 0 && (
          <WorkspacePanel 
            title="Active Generation Jobs" 
            description="Real-time progress of your requested reports."
          >
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    {job.status === 'PENDING' || job.status === 'PROCESSING' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : job.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
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
                      <Button size="xs" variant="ghost" onClick={() => handleDownload(job.id)}>
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
            {categories.map((category) => {
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
                        size="xs" 
                        variant="ghost" 
                        onClick={() => handleGenerate(category.title, 'PDF')}
                        disabled={loading}
                      >
                        PDF
                      </Button>
                      <Button 
                        size="xs" 
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
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.owner} • {report.updated}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{report.status}</Badge>
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
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            title="Scheduled reports"
            description="Automated delivery for recurring stakeholders."
          >
            <div className="space-y-4">
              {scheduledReports.map((schedule) => (
                <div key={schedule.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {schedule.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{schedule.cadence}</p>
                      <p className="text-xs text-muted-foreground">
                        Recipients: {schedule.recipients}
                      </p>
                    </div>
                    <Button disabled title="Not available yet" size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
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
    </PageShell>
  );
}
