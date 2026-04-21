import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  Server,
  Activity,
  Zap,
  Globe,
  Database,
  Cpu,
  ShieldCheck,
  RefreshCw,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Network
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useSession } from "@/core/security/session";
import { retailInfrastructureService } from "@/core/services/retail/retailInfrastructureService";
import type { RetailGatewayNode, RetailLoadBalancer } from "@/core/types/retail/retail";
import { useToast } from "@/hooks/use-toast";

const InfrastructureControl = () => {
  const session = useSession();
  const { toast } = useToast();
  const [nodes, setNodes] = useState<RetailGatewayNode[]>([]);
  const [lbs, setLbs] = useState<RetailLoadBalancer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nodeData, lbData] = await Promise.all([
        retailInfrastructureService.listGatewayNodes(session.tenantId, session),
        retailInfrastructureService.listLoadBalancers(session.tenantId, session)
      ]);
      setNodes(nodeData);
      setLbs(lbData);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load infrastructure data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000); // Polling for real-time feel
    return () => clearInterval(interval);
  }, [refresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "ONLINE":
        return "bg-emerald-500";
      case "STANDBY":
        return "bg-amber-500";
      case "DOWN":
      case "OFFLINE":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Infrastructure Control Center"
        subtitle="Real-time monitoring and cluster management for Zenvix Retail connectivity."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <Activity className="w-16 h-16" />
          </div>
          <CardContent className="p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Global Traffic</div>
            <div className="text-3xl font-black italic tracking-tighter flex items-end gap-2">
              1.2M <span className="text-sm font-bold text-emerald-400 mb-1">req/min</span>
            </div>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-emerald-400 uppercase">
              <TrendingUp className="w-3 h-3" />
              +12% from last hour
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md">
          <CardContent className="p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Nodes</div>
            <div className="text-3xl font-black italic tracking-tighter text-slate-900">
              {nodes.filter(n => n.status === "ACTIVE").length} <span className="text-sm text-slate-400">/ {nodes.length}</span>
            </div>
            <Progress value={(nodes.filter(n => n.status === "ACTIVE").length / (nodes.length || 1)) * 100} className="h-1.5 mt-4" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md">
          <CardContent className="p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg. Latency</div>
            <div className="text-3xl font-black italic tracking-tighter text-slate-900">
              42ms
            </div>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-blue-600 uppercase">
              <Zap className="w-3 h-3" />
              Optimal Performance
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md">
          <CardContent className="p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Error Rate</div>
            <div className="text-3xl font-black italic tracking-tighter text-slate-900">
              0.003%
            </div>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-emerald-600 uppercase">
              <ShieldCheck className="w-3 h-3" />
              All Systems Nominal
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkspacePanel>
        <div className="space-y-12">
          {/* Cluster Status Section */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Network className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Edge Clusters & Load Balancers</h2>
              </div>
              <Button disabled title="Not available yet" size="sm" variant="outline" className="rounded-xl font-bold gap-2">
                <Plus className="w-4 h-4" /> Provision Cluster
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {lbs.map(lb => (
                <Card key={lb.id} className="border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${lb.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <div className="text-sm font-black italic text-slate-900">{lb.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">VIP: {lb.virtualIp || 'Pending...'} • {lb.algorithm}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button disabled title="Not available yet" variant="ghost" size="icon" className="text-slate-400"><RefreshCw className="w-4 h-4" /></Button>
                      <Button disabled title="Not available yet" variant="ghost" size="icon" className="text-slate-400"><MoreVertical className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {lb.nodes?.map(node => (
                        <div key={node.id} className="bg-white border-2 border-slate-50 rounded-2xl p-5 hover:border-blue-200 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                <Cpu className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-black italic text-slate-900 leading-tight">{node.nodeName}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{node.ipAddress}:{node.port}</div>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(node.status)} text-white text-[9px] font-black tracking-widest uppercase`}>
                              {node.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-1">
                               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-slate-400">Health</span>
                                  <span className={node.healthScore > 80 ? 'text-emerald-500' : 'text-amber-500'}>{node.healthScore}%</span>
                               </div>
                               <Progress value={node.healthScore} className="h-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50 p-2 rounded-lg">
                               <div>Version: {node.version || 'v2.4.1'}</div>
                               <div className="text-right">{node.region || 'ID-JKT'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Fake Node for Visuals if list is empty */}
                      {(!lb.nodes || lb.nodes.length === 0) && (
                         <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center opacity-50">
                            <Server className="w-8 h-8 text-slate-400 mb-2" />
                            <div className="text-[10px] font-black uppercase text-slate-400">No nodes attached</div>
                         </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Infrastructure Logs section */}
          <section className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
             <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-slate-900" />
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Infrastructure Events</h2>
             </div>
             
             <div className="space-y-4">
                {[
                  { time: '11:42:01', msg: 'Node GTY-JKT-01 reached 85% CPU load. Auto-scaling standby node...', type: 'warn' },
                  { time: '11:40:15', msg: 'Load Balancer LB-CORE-01 synchronized configuration across 3 nodes.', type: 'info' },
                  { time: '11:38:42', msg: 'Health check passed for region: ASIA-SOUTH-1.', type: 'success' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 text-xs font-bold font-mono">
                    <span className="text-slate-400 shrink-0">{log.time}</span>
                    <span className="text-slate-900">{log.msg}</span>
                  </div>
                ))}
             </div>
          </section>
        </div>
      </WorkspacePanel>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default InfrastructureControl;
