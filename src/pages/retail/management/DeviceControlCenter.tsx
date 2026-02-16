import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  MonitorDot, 
  Smartphone, 
  Laptop, 
  Signal, 
  SignalLow, 
  SignalHigh, 
  Power, 
  ShieldAlert, 
  Wifi, 
  Battery, 
  Cpu, 
  Map as MapIcon, 
  RefreshCw, 
  MoreVertical, 
  ChevronRight,
  Zap,
  HardDrive,
  Lock,
  Focus,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import type { POSDevice } from "@/core/types/retail/retail";

const DeviceControlCenter = () => {
  const session = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      try {
        const data = retailService.listDevices(session.tenantId);
        setDevices(data);
      } catch (error) {
        console.error("Failed to fetch devices", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId]);

  const handlePing = async (deviceId: string) => {
    try {
      retailService.pingDevice(session.tenantId, session, deviceId);
      alert(`Ping sent to ${deviceId}`);
    } catch (error) {
      console.error("Ping failed", error);
    }
  };

  const handlePingAll = async () => {
    setIsRefreshing(true);
    for (const device of devices) {
      retailService.pingDevice(session.tenantId, session, device.id);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Device Control Center" 
        subtitle="IoT fleet telemetry • Hardware security profiles • Proactive remote maintenance"
      />
      
      <WorkspacePanel>
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
           <Card className="flex-1 bg-slate-900 border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white group">
              <div className="absolute inset-0 opacity-20 pointer-events-none" 
                   style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
              <CardContent className="p-10 relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                 <div className="space-y-8 flex-1">
                    <div className="flex items-center gap-3">
                       <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Focus className="w-7 h-7" />
                       </div>
                       <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">Hardware Fleet Map</div>
                          <div className="text-3xl font-black italic tracking-tighter">BRANCH_ORCHESTRATOR_L1</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                       <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase italic">Active Nodes</div>
                          <div className="text-xl font-black italic">{devices.filter(d => d.isActive).length} / {devices.length}</div>
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase italic">MDM Health</div>
                          <div className="text-xl font-black italic text-emerald-400">OPTIMAL</div>
                       </div>
                    </div>
                    <Button 
                      onClick={handlePingAll}
                      className="h-14 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black italic uppercase tracking-widest shadow-xl transition-all"
                    >
                      {isRefreshing ? <RefreshCw className="mr-3 w-5 h-5 animate-spin" /> : <Wifi className="mr-3 w-5 h-5" />}
                      Broadcast Heartbeat
                    </Button>
                 </div>
                 <div className="w-full md:w-72 bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-md space-y-6">
                    <div className="flex justify-between items-center">
                       <div className="text-[10px] font-black uppercase text-indigo-400 italic">Traffic Pulse</div>
                       <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black italic text-[8px]">STABLE</Badge>
                    </div>
                    <div className="h-24 flex items-end gap-1.5 px-2">
                       {[40, 70, 45, 90, 65, 30, 80, 55, 75, 50].map((h, i) => (
                          <div key={i} className="flex-1 bg-indigo-500/40 rounded-t-sm group-hover:bg-indigo-400/80 transition-all" style={{height: `${h}%`}} />
                       ))}
                    </div>
                    <div className="text-[10px] text-slate-500 text-center font-bold tracking-widest italic uppercase">Encrypted Uplink Active</div>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {isLoading ? (
             <div className="col-span-full py-20 text-center text-slate-400 font-black italic uppercase tracking-[0.2em] animate-pulse">Scanning Hardware Bus...</div>
           ) : devices.map((device, i) => (
             <Card key={i} className="group relative overflow-hidden rounded-[2.5rem] border-2 border-slate-100 hover:border-blue-200 shadow-xl transition-all bg-white">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${device.isActive ? 'bg-emerald-500' : 'bg-slate-400'} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <CardHeader className="p-8 pb-4">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${device.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                         {device.type === 'pos_terminal' ? <MonitorDot className="w-7 h-7" /> : device.type === 'kiosk' ? <Smartphone className="w-7 h-7" /> : <Laptop className="w-7 h-7" />}
                      </div>
                      <Badge className={`${device.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'} border-none font-black italic text-[9px] tracking-widest px-3 uppercase`}>
                         {device.isActive ? 'ONLINE' : 'OFFLINE'}
                      </Badge>
                   </div>
                   <CardTitle>
                      <div className="text-base font-black italic tracking-tighter text-slate-900">{device.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {device.id}</div>
                   </CardTitle>
                </CardHeader>

                <CardContent className="p-8 pt-4 space-y-6">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 italic">
                         <span>Connectivity</span>
                         <span className={device.isActive ? 'text-emerald-500' : 'text-slate-500'}>{device.isActive ? '100%' : '0%'}</span>
                      </div>
                      <Progress value={device.isActive ? 100 : 0} className="h-1.5 bg-slate-100" />
                   </div>

                   <Separator className="bg-slate-50" />

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <div className="text-[10px] font-black text-slate-400 italic uppercase">Security</div>
                         <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-black italic text-slate-700 uppercase">SECURE</span>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <div className="text-[10px] font-black text-slate-400 italic uppercase">Usage</div>
                         <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-black italic text-slate-700 uppercase">14H</span>
                         </div>
                      </div>
                   </div>

                   <div className="pt-4 flex gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => handlePing(device.id)}
                        className="flex-1 h-11 rounded-xl bg-slate-50 text-slate-500 font-black italic uppercase text-[9px] tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                      >
                         PING
                      </Button>
                      <Button variant="outline" className="h-11 w-11 rounded-xl flex items-center justify-center border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                         <MoreVertical className="w-4 h-4" />
                      </Button>
                   </div>
                </CardContent>
             </Card>
           ))}

           <Card className="border-4 border-dashed border-slate-200 bg-slate-50/50 rounded-[2.5rem] flex flex-col items-center justify-center py-16 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-white transition-all cursor-pointer group">
              <Plus className="w-12 h-12 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all mb-4" />
              <div className="text-sm font-black italic tracking-tighter uppercase">Commission Device</div>
              <div className="text-[9px] font-bold uppercase tracking-widest mt-1 italic">Scan QR / Manual ID</div>
           </Card>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-2 shadow-xl border-slate-200 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Hardware Security Log
                 </CardTitle>
                 <Button variant="ghost" size="sm" className="text-blue-600 font-black italic text-[9px] uppercase tracking-widest">
                    Clear Log
                 </Button>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="max-h-60 overflow-y-auto p-6 space-y-4 font-mono text-[10px]">
                    {[
                      { time: "14:22:15", event: "MDM_CHECK_IN", device: "pos-001", status: "SUCCESS" },
                      { time: "14:05:40", event: "MDM_POLICY_UPDATE", device: "pos-001", status: "ENFORCED" },
                      { time: "13:58:20", event: "GEO_FENCE_ALERT", device: "kiosk-001", status: "CRITICAL" },
                      { time: "13:30:12", event: "MDM_LOCKED", device: "kiosk-001", status: "REMOTE" },
                    ].map((log, i) => (
                      <div key={i} className="flex gap-4 border-b border-slate-50 pb-3 last:border-0">
                         <span className="text-slate-400 italic">{log.time}</span>
                         <span className={`font-black ${log.status === 'SUCCESS' ? 'text-emerald-500' : log.status === 'CRITICAL' ? 'text-red-500 font-bold' : 'text-blue-500'}`}>{log.event}</span>
                         <span className="text-slate-900 font-bold uppercase">{log.device}</span>
                         <span className="text-slate-400 hidden md:inline">[{log.status}]</span>
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2.5rem] shadow-2xl overflow-hidden group">
              <CardContent className="p-10 space-y-6">
                 <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-8 h-8" />
                 </div>
                 <div className="text-center space-y-2">
                    <div className="text-2xl font-black italic tracking-tighter">Security Protocol L3</div>
                    <p className="text-[10px] opacity-70 leading-relaxed font-bold italic uppercase tracking-widest">Enforce MDM Lockdown? This will disable all unauthorized peripheral ports across the fleet.</p>
                 </div>
                 <Button className="w-full h-14 bg-white text-blue-600 hover:bg-slate-50 font-black italic uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all">
                    ACTIVATE SECTOR LOCK
                 </Button>
                 <div className="text-[9px] text-center opacity-40 font-bold italic">Fleet Auth Sign: ACTIVE</div>
              </CardContent>
           </Card>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default DeviceControlCenter;
