import React, { useState } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  FileText, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Search, 
  Filter, 
  Lock, 
  Fingerprint, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  ChevronRight,
  Database,
  Key,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const ComplianceAuditLedger = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const AUDIT_LOGS = [
    { time: "2026-02-15 14:22:10", type: "FISCAL_VOID", actor: "Siti Rahma (ID: 009)", impact: "-Rp 50,000", hash: "8f2d...b41a", status: "VERIFIED" },
    { time: "2026-02-15 13:05:44", type: "PERMISSION_CHANGE", actor: "Andi Wijaya (ID: ADMIN)", impact: "ELEVATED", hash: "9a31...fe02", status: "VERIFIED" },
    { time: "2026-02-15 11:45:12", type: "MANUAL_ADJUST", actor: "System Agent (Auto)", impact: "INV_SYNC", hash: "7c12...da99", status: "VERIFIED" },
    { time: "2026-02-15 09:00:01", type: "STORE_OPEN", actor: "Budi Santoso (ID: 001)", impact: "NORMAL", hash: "2e44...cc81", status: "VERIFIED" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Compliance & Audit Ledger" 
        subtitle="Immutable fiscal record-keeping • Regulatory event log • Chain of custody"
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
           <Card className="lg:col-span-3 bg-slate-900 border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <ShieldCheck className="w-32 h-32 text-blue-500" />
              </div>
              <CardContent className="p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10 text-white">
                 <div className="space-y-6 flex-1">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Fingerprint className="w-6 h-6" />
                       </div>
                       <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">Global Integrity State</div>
                          <div className="text-2xl font-black italic tracking-tighter">SECURED & SEALED</div>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Current Block Hash</div>
                       <code className="bg-white/5 px-4 py-2 rounded-xl text-indigo-400 font-mono text-xs border border-white/10 block w-fit">
                          zenvix-prod-0x8F2DA4C7B41A9902EDC
                       </code>
                    </div>
                    <div className="flex gap-4">
                       <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/40">
                          <Download className="w-4 h-4 mr-2" /> Export Fiscal Report
                       </Button>
                       <Button variant="ghost" className="h-12 text-blue-400 hover:bg-white/5 font-black italic uppercase text-[10px] tracking-widest rounded-xl">
                          <ExternalLink className="w-4 h-4 mr-2" /> Verify Chain
                       </Button>
                    </div>
                 </div>
                 <div className="w-full md:w-64 space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div className="text-center">
                       <div className="text-4xl font-black italic tracking-tighter text-blue-400">100%</div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Audit Score</div>
                    </div>
                    <Progress value={100} className="h-2 bg-slate-800" />
                    <p className="text-[10px] text-slate-500 font-medium italic text-center">Last full reconciliation: 14m ago</p>
                 </div>
              </CardContent>
           </Card>

           <div className="space-y-6">
              <Card className="shadow-lg border-2 border-slate-100 rounded-3xl">
                 <CardHeader className="p-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Anomaly Watch</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 pt-0 space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                       </div>
                       <div>
                          <div className="text-xs font-black italic text-slate-900">Zero Flags</div>
                          <div className="text-[10px] text-slate-400 font-bold">No suspicious voids today</div>
                       </div>
                    </div>
                    <Separator className="bg-slate-100" />
                    <div className="text-[10px] text-slate-500 font-medium leading-relaxed italic">AI scanner successfully processed 1.2K transaction blocks with no deviation.</div>
                 </CardContent>
              </Card>

              <Card className="shadow-lg border-2 border-indigo-50 bg-indigo-50/20 rounded-3xl group cursor-pointer hover:bg-indigo-50 transition-all">
                 <CardContent className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mx-auto group-hover:scale-110 transition-transform">
                       <Database className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-black italic text-slate-900">Cold Storage Vault</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Logs older than 90 days</div>
                 </CardContent>
              </Card>
           </div>
        </div>

        <div className="mb-6 flex gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white border-slate-200 rounded-2xl text-sm font-bold italic placeholder:text-slate-300 focus-visible:ring-blue-500 shadow-sm" 
                placeholder="Search Timestamp, Event Type, Actor ID, or Hash Signature..."
              />
           </div>
           <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-black italic border-slate-200 hover:bg-slate-100 uppercase text-[11px]">
              <Calendar className="w-4 h-4" /> Range
           </Button>
           <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-black italic border-slate-200 hover:bg-slate-100 uppercase text-[11px]">
              <Filter className="w-4 h-4" /> Types
           </Button>
        </div>

        <DataTableShell 
          title="Immutable Audit Stream" 
          subtitle="Non-repudiable logs backed by Zenvix Signature Hub"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Temporal Context</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Event Typology</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Operational Actor</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Delta / Impact</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Integrity Seal</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Block ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {AUDIT_LOGS.map((log, i) => (
                <tr key={i} className="group hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td className="px-6 py-5 whitespace-nowrap">
                     <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                           <History className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">{log.time}</div>
                     </div>
                  </td>
                  <td className="px-6 py-5">
                     <Badge className="bg-slate-100 text-slate-700 border-none text-[8px] font-black italic tracking-widest px-3 py-1 ring-1 ring-inset ring-slate-200">
                        {log.type}
                     </Badge>
                  </td>
                  <td className="px-6 py-5">
                     <div className="text-xs font-black italic text-slate-600">{log.actor}</div>
                  </td>
                  <td className="px-6 py-5">
                     <div className={`text-xs font-black italic ${log.impact.startsWith('-') ? 'text-red-500' : log.impact === 'ELEVATED' ? 'text-amber-600' : 'text-slate-900'}`}>{log.impact}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-black italic text-emerald-600 uppercase italic">Sealed</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-[10px] text-slate-400">
                     {log.hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
             <Button variant="ghost" size="sm" className="font-black italic text-[10px] uppercase text-blue-600 hover:bg-blue-50 rounded-xl gap-2">
                VERIFY ALL HISTORICAL BLOCKS <ChevronRight className="w-3 h-3" />
             </Button>
          </div>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
};

export default ComplianceAuditLedger;
