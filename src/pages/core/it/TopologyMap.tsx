import { useState, useEffect, useMemo } from "react";
import { 
  Server, 
  Cpu, 
  Database, 
  Globe, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Box, 
  Link2, 
  Settings2,
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Monitor,
  Wifi,
  Smartphone,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/core/security/session";
import { itSettingsService, type ITDevice } from "@/core/services/it/itSettingsService";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, EmptyState } from "@/components/shared/AsyncState";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Node {
  id: string;
  x: number;
  y: number;
  device: ITDevice;
}

interface Edge {
  source: string;
  target: string;
  status: "active" | "inactive" | "warning";
}

export default function TopologyMap() {
  const session = useSession();
  const [devices, setDevices] = useState<ITDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ITDevice | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await itSettingsService.getDevices(session.tenant_id, session);
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load topology", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Layout logic: Simple radial or grid for now
  const nodes = useMemo<Node[]>(() => {
    return (Array.isArray(devices) ? devices : []).map((d, i) => {
      const angle = (i / devices.length) * 2 * Math.PI;
      const radius = 250;
      return {
        id: d.id,
        x: 400 + radius * Math.cos(angle),
        y: 350 + radius * Math.sin(angle),
        device: d
      };
    });
  }, [devices]);

  const edges = useMemo<Edge[]>(() => {
    const e: Edge[] = [];
    devices.forEach(d => {
      if (d.parentId) {
        e.push({ 
          source: d.parentId, 
          target: d.id, 
          status: d.status === 'online' ? 'active' : 'inactive' 
        });
      }
      if (d.connections) {
        d.connections.forEach(targetId => {
          e.push({ 
            source: d.id, 
            target: targetId, 
            status: 'active' 
          });
        });
      }
    });
    return e;
  }, [devices]);

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'server': return Server;
      case 'database': return Database;
      case 'router': return Wifi;
      case 'workstation': return Monitor;
      case 'mobile': return Smartphone;
      case 'storage': return HardDrive;
      default: return Box;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Activity className="h-10 w-10 text-primary animate-pulse" />
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scanning Infrastructure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Couldn't load the topology"
          description="The infrastructure device map failed to load. Check your connection and try again."
          onRetry={load}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-end justify-between border-b border-border pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
            <Link2 className="h-3 w-3" /> Live Visual Connection
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">
            Infrastructure Node
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Real-time device topology and connectivity orchestration.</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center bg-muted rounded-2xl p-1 border border-border">
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="h-10 w-10 rounded-xl"><Minimize2 className="h-4 w-4" /></Button>
              <div className="px-3 text-[10px] font-black text-muted-foreground">{(zoom * 100).toFixed(0)}%</div>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="h-10 w-10 rounded-xl"><Maximize2 className="h-4 w-4" /></Button>
           </div>
           <Button className="rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest px-6 h-12 shadow-xl shadow-primary/20 gap-2">
             <Settings2 className="h-4 w-4" /> Provision Node
           </Button>
        </div>
      </div>

      <div className="relative w-full h-[700px] bg-muted rounded-[3rem] border border-border overflow-hidden shadow-inner cursor-grab active:cursor-grabbing">
        {devices.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <EmptyState
              title="No devices on the network"
              description="No infrastructure devices are registered for this tenant yet. Provision a node to populate the topology."
            />
          </div>
        ) : null}
        {/* SVG Canvas */}
        <svg 
          viewBox="0 0 800 700" 
          className="w-full h-full"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transition: 'transform 0.2s ease' }}
        >
          {/* Defs for gradients/masks */}
          <defs>
             <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
             </linearGradient>
             <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                   <feMergeNode in="coloredBlur" />
                   <feMergeNode in="SourceGraphic" />
                </feMerge>
             </filter>
          </defs>

          {/* Background Grid */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.03" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Edges */}
          {(Array.isArray(edges) ? edges : []).map((edge, i) => {
            const start = nodes.find(n => n.id === edge.source);
            const end = nodes.find(n => n.id === edge.target);
            if (!start || !end) return null;

            return (
              <g key={i}>
                <line
                  x1={start.x} y1={start.y}
                  x2={end.x} y2={end.y}
                  stroke={edge.status === 'active' ? '#6366f1' : '#ef4444'}
                  strokeWidth="2"
                  strokeDasharray={edge.status === 'active' ? "0" : "4 4"}
                  className={cn(edge.status === 'active' && "animate-pulse")}
                  opacity="0.3"
                />
                {edge.status === 'active' && (
                  <circle r="3" fill="#6366f1">
                    <animateMotion 
                      dur="3s" 
                      repeatCount="indefinite" 
                      path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} 
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {(Array.isArray(nodes) ? nodes : []).map((node) => {
            const Icon = getIcon(node.device.deviceType);
            const isOnline = node.device.status === 'online';

            return (
              <g 
                key={node.id} 
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(node.device)}
              >
                {/* Node Glow */}
                <circle r="40" fill={isOnline ? "#6366f110" : "#ef444410"} className="group-hover:r-50 transition-all" />
                
                {/* Node Outer Ring */}
                <circle 
                  r="30" 
                  fill="transparent" 
                  stroke={isOnline ? "#6366f1" : "#ef4444"} 
                  strokeWidth="2" 
                  strokeOpacity="0.2"
                />

                {/* Node Core */}
                <circle 
                  r="24" 
                  fill="#0f172a" 
                  stroke={isOnline ? "#6366f1" : "#ef4444"} 
                  strokeWidth="2" 
                  className="shadow-xl"
                />

                {/* Icon */}
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div className="flex items-center justify-center w-full h-full text-white">
                    <Icon className="w-4 h-4" />
                  </div>
                </foreignObject>

                {/* Label */}
                <text 
                  y="45" 
                  textAnchor="middle" 
                  className="text-[10px] font-black uppercase tracking-widest fill-muted pointer-events-none"
                >
                  {node.device.deviceName}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend Overlay */}
        <div className="absolute bottom-8 left-8 p-4 bg-card/80 backdrop-blur-md rounded-2xl border border-border space-y-3">
           <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Node</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Failure/Offline</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="h-[1px] w-4 bg-primary opacity-40" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-[8px]">Encrypted Link</span>
           </div>
        </div>
      </div>

      <Sheet open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <SheetContent className="sm:max-w-md bg-background border-l border-border">
           <SheetHeader>
              <SheetTitle className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                 <Monitor className="h-6 w-6 text-primary" /> Device Telemetry
              </SheetTitle>
           </SheetHeader>
           
           {selectedNode && (
             <div className="mt-8 space-y-8">
                <div className="p-6 rounded-[2rem] bg-card border border-border shadow-xl space-y-4">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Host Identity</p>
                         <h3 className="text-xl font-black tracking-tight uppercase">{selectedNode.deviceName}</h3>
                      </div>
                      <Badge className={cn(
                        "border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest",
                        selectedNode.status === 'online' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}>{selectedNode.status}</Badge>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">IP Address</p>
                         <p className="text-xs font-mono font-bold">{selectedNode.ipAddress || '192.168.1.1'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">MAC Identity</p>
                         <p className="text-xs font-mono font-bold text-muted-foreground">{selectedNode.macAddress || 'FF:FF:FF:FF:FF:FF'}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                      <Activity className="h-3 w-3" /> Utilization Pulse
                   </h4>
                   <div className="space-y-4">
                      {[
                        { label: 'CPU Load', value: 42, color: 'primary' },
                        { label: 'Mem Usage', value: 68, color: 'success' },
                        { label: 'Storage', value: 85, color: 'destructive' },
                      ].map(m => (
                        <div key={m.label} className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span>{m.label}</span>
                              <span>{m.value}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-1000", `bg-${m.color}`)} style={{ width: `${m.value}%` }} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="pt-8 border-t border-border space-y-3">
                   <Button className="w-full rounded-2xl bg-foreground text-background font-black text-[10px] uppercase tracking-widest py-6">
                      Access Remote Shell
                   </Button>
                   <Button variant="outline" className="w-full rounded-2xl border-border font-black text-[10px] uppercase tracking-widest py-6">
                      View Audit Log
                   </Button>
                </div>
             </div>
           )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
