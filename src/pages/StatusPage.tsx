import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  Bot,
  Database,
  MessageCircle,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/CompanyLogo";
import { formatDateTime } from "@/lib/dates";

type ComponentStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatus;
  latency_ms?: number | null;
  message?: string | null;
  metrics?: Record<string, number | string | boolean | null>;
}

interface StatusPayload {
  page_title: string;
  overall: { status: ComponentStatus; label: string; updated_at: string };
  components: StatusComponent[];
  uptime: { "90d": number; "30d": number; "7d": number };
  daily_uptime: Array<{ date: string; uptime_pct: number; status: ComponentStatus }>;
  incidents: Array<{
    id: string;
    title: string;
    impact: ComponentStatus;
    status: string;
    started_at: string;
    resolved_at: string | null;
    duration_minutes: number | null;
    components: string[];
  }>;
  version: string;
}

const STATUS_STYLES: Record<
  ComponentStatus,
  { dot: string; banner: string; bar: string; label: string }
> = {
  operational: {
    dot: "bg-emerald-500",
    banner: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
    label: "Operational",
  },
  degraded: {
    dot: "bg-amber-500",
    banner: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400",
    bar: "bg-amber-500",
    label: "Degraded",
  },
  partial_outage: {
    dot: "bg-orange-500",
    banner: "bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-400",
    bar: "bg-orange-500",
    label: "Partial outage",
  },
  major_outage: {
    dot: "bg-red-500",
    banner: "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-400",
    bar: "bg-red-500",
    label: "Major outage",
  },
  maintenance: {
    dot: "bg-blue-500",
    banner: "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-400",
    bar: "bg-blue-500",
    label: "Maintenance",
  },
};

const COMPONENT_ICONS: Record<string, typeof Server> = {
  api: Server,
  database: Database,
  redis: Zap,
  ai_assistant: Bot,
  whatsapp: MessageCircle,
};

async function fetchStatus(): Promise<StatusPayload> {
  const res = await fetch("/api/public/status");
  if (!res.ok) throw new Error("Gagal memuat status");
  const json = await res.json();
  return json.data as StatusPayload;
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "ongoing";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export function StatusPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["public-status"],
    queryFn: fetchStatus,
    refetchInterval: 60_000,
  });

  const overall = data?.overall.status ?? "operational";
  const styles = STATUS_STYLES[overall];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <CompanyLogo size="sm" subtitle="" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/docs" className="text-xs text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <Link to="/login" className="text-xs text-primary hover:underline">
              Login
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
            <Activity className="h-4 w-4" />
            System Status
          </div>
          <h1 className="font-display text-2xl font-semibold">{data?.page_title ?? "TARA System Status"}</h1>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground text-sm">Memuat status...</div>
        )}

        {isError && (
          <div className={cn("rounded-lg border p-6 text-center", STATUS_STYLES.major_outage.banner)}>
            Tidak dapat memuat status sistem. Coba refresh.
          </div>
        )}

        {data && (
          <>
            {/* Overall banner — incident.io style */}
            <div
              className={cn(
                "rounded-lg border px-6 py-5 flex items-center gap-4",
                styles.banner,
              )}
            >
              <span className={cn("h-3 w-3 rounded-full shrink-0", styles.dot)} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">{data.overall.label}</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Updated {formatDateTime(data.overall.updated_at)}
                </p>
              </div>
            </div>

            {/* Uptime summary */}
            <div className="grid grid-cols-3 gap-3">
              {(["7d", "30d", "90d"] as const).map((period) => (
                <div key={period} className="surface-elevated p-4 text-center">
                  <p className="text-2xl font-display font-semibold">{data.uptime[period]}%</p>
                  <p className="text-2xs text-muted-foreground mt-1 uppercase tracking-wide">
                    Uptime {period}
                  </p>
                </div>
              ))}
            </div>

            {/* 90-day bar */}
            <section className="surface-elevated p-5 space-y-3">
              <h2 className="text-sm font-semibold">90-day uptime history</h2>
              <div className="flex gap-[2px] h-8 items-stretch">
                {data.daily_uptime.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.uptime_pct}% uptime`}
                    className={cn(
                      "flex-1 min-w-0 rounded-sm opacity-90 hover:opacity-100 transition-opacity",
                      day.uptime_pct >= 99
                        ? STATUS_STYLES.operational.bar
                        : day.uptime_pct >= 95
                          ? STATUS_STYLES.degraded.bar
                          : day.uptime_pct >= 80
                            ? STATUS_STYLES.partial_outage.bar
                            : STATUS_STYLES.major_outage.bar,
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-2xs text-muted-foreground">
                <span>90 days ago</span>
                <span>Today</span>
              </div>
            </section>

            {/* Components */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold px-1">Services</h2>
              <div className="surface-elevated divide-y divide-border">
                {data.components.map((component) => {
                  const Icon = COMPONENT_ICONS[component.id] ?? Server;
                  const cs = STATUS_STYLES[component.status];
                  return (
                    <div key={component.id} className="flex items-start gap-4 px-5 py-4">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{component.name}</p>
                          <span className={cn("h-2 w-2 rounded-full", cs.dot)} />
                          <span className="text-2xs text-muted-foreground">{cs.label}</span>
                        </div>
                        {component.message && (
                          <p className="text-xs text-muted-foreground mt-1">{component.message}</p>
                        )}
                        {component.id === "ai_assistant" && component.metrics && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-2xs text-muted-foreground font-mono">
                            {Number(component.metrics.requests_24h) > 0 ? (
                              <>
                                <span>{component.metrics.requests_24h} req (24h)</span>
                                <span>{component.metrics.success_rate_24h}% success</span>
                                {Number(component.metrics.avg_response_ms) > 0 && (
                                  <span>{component.metrics.avg_response_ms}ms avg</span>
                                )}
                              </>
                            ) : component.metrics.enabled ? (
                              <span>No requests in last 24h</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {component.latency_ms != null && component.latency_ms > 0 && (
                        <span className="text-2xs font-mono text-muted-foreground shrink-0">
                          {component.latency_ms}ms
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Incidents */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold px-1">Incident history</h2>
              {data.incidents.length === 0 ? (
                <div className="surface-elevated px-5 py-8 text-center text-sm text-muted-foreground">
                  No incidents recorded in the last 90 days.
                </div>
              ) : (
                <div className="surface-elevated divide-y divide-border">
                  {data.incidents.map((inc) => {
                    const cs = STATUS_STYLES[inc.impact];
                    return (
                      <div key={inc.id} className="px-5 py-4 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{inc.title}</p>
                            <p className="text-2xs text-muted-foreground mt-1">
                              {formatDateTime(inc.started_at)}
                              {inc.resolved_at
                                ? ` → ${formatDateTime(inc.resolved_at)}`
                                : " → ongoing"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "text-2xs font-medium px-2 py-0.5 rounded-full border shrink-0",
                              cs.banner,
                            )}
                          >
                            {inc.status === "resolved" ? "Resolved" : "Active"} ·{" "}
                            {formatDuration(inc.duration_minutes)}
                          </span>
                        </div>
                        {inc.components.length > 0 && (
                          <p className="text-2xs text-muted-foreground">
                            Affected: {inc.components.join(", ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <p className="text-center text-2xs text-muted-foreground pb-4">
              TARA v{data.version} · Auto-refreshes every 60s
            </p>
          </>
        )}
      </main>
    </div>
  );
}
