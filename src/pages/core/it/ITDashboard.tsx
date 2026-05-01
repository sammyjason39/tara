import React from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Users, 
  Monitor, 
  Terminal, 
  Zap,
  Globe,
  Database,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/core/security/session";
import { itService, type SystemHealth } from "@/core/services/it/itService";
import { useEffect, useState } from "react";

export default function ITDashboard() {
  const session = useSession();
  const [overview, setOverview] = useState<any>(null);
  const [health, setHealth] = useState<SystemHealth[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("[ITDashboard] Initializing data fetch", {
      tenant_id: session.tenant_id,
      role: session.role
    });
    setIsLoading(true);
    Promise.all([
      itService.getOverview(session.tenant_id, session),
      itService.getSystemHealth(session.tenant_id, session)
    ]).then(([overviewData, healthData]) => {
      console.log("[ITDashboard] Data received successfully");
      setOverview(overviewData);
      setHealth(healthData);
    }).catch(err => {
      console.error("[ITDashboard] Fetch failure:", err);
    })
      .finally(() => setIsLoading(false));
  }, [session.tenant_id, session]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        title="IT Intelligence Command"
        subtitle="Real-time infrastructure telemetry, identity security, and device lifecycle management."
        primaryAction={
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black italic tracking-widest uppercase gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
            <Terminal className="w-4 h-4" /> System Console
          </Button>
        }
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Infrastructure Health" value={overview?.healthScore || "99.9%"} status="OPTIMAL" icon={Activity} />
        <KPICard title="Active Nodes" value={overview?.activeNodes || "42"} status="SYNCED" icon={Zap} />
        <KPICard title="Identity Guards" value="Active" status="SECURE" icon={ShieldCheck} />
        <KPICard title="Pending Updates" value={overview?.pendingUpdates || "3"} status="ATTENTION" icon={Cpu} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Core Infrastructure Status */}
        <WorkspacePanel 
          title="Core Infrastructure" 
          description="Global status of mission-critical services and databases."
          className="xl:col-span-2"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {health.length > 0 ? (
              health.map((h) => (
                <ServiceStatus 
                  key={h.id}
                  name={h.component} 
                  status={h.status} 
                  icon={Globe} 
                  latency={`${h.latencyMs}ms`} 
                />
              ))
            ) : (
              <>
                <ServiceStatus name="Central API Cluster" status="Operational" icon={Globe} latency="12ms" />
                <ServiceStatus name="Prisma Database Layer" status="Operational" icon={Database} latency="8ms" />
                <ServiceStatus name="Auth & Identity Gate" status="Operational" icon={Lock} latency="15ms" />
                <ServiceStatus name="Asset Storage (S3)" status="Operational" icon={Monitor} latency="45ms" />
              </>
            )}
          </div>
        </WorkspacePanel>

        {/* Security & Access Feed */}
        <WorkspacePanel 
          title="Security Feed" 
          description="Recent identity and access events across the workspace."
        >
          <div className="space-y-4">
            <SecurityEvent 
              title="Admin Access Granted" 
              time="2m ago" 
              user="IT_MANAGER" 
              type="SUCCESS"
            />
            <SecurityEvent 
              title="Token Rotation Triggered" 
              time="15m ago" 
              user="SYSTEM" 
              type="INFO"
            />
            <SecurityEvent 
              title="New Device Enrolled" 
              time="1h ago" 
              user="STAFF_042" 
              type="SUCCESS"
            />
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}

function KPICard({ title, value, status, icon: Icon }: any) {
  return (
    <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black italic tracking-tighter text-slate-900">{value}</div>
        <Badge className={`mt-2 border-none text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
          status === 'OPTIMAL' || status === 'SYNCED' || status === 'SECURE' 
            ? 'bg-emerald-500/10 text-emerald-600' 
            : 'bg-amber-500/10 text-amber-600'
        }`}>
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
}

function ServiceStatus({ name, status, icon: Icon, latency }: any) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:border-blue-200 transition-all">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 group-hover:text-blue-600 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900">{name}</p>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{status}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black text-slate-300 italic uppercase">Latency</p>
        <p className="text-xs font-black text-blue-600">{latency}</p>
      </div>
    </div>
  );
}

function SecurityEvent({ title, time, user, type }: any) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
        type === 'SUCCESS' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
      }`} />
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-slate-900 leading-tight">{title}</p>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
          {user} • <span className="italic">{time}</span>
        </p>
      </div>
    </div>
  );
}
